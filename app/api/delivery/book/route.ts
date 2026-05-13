import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/supabase"

export const runtime = "nodejs"

type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"]

type BookingPayload = {
  stripeSessionId: string
  listingId: string
  itemTitle: string
  quoteId: string
  serviceName: string
  provider: string
  collectionPostcode: string
  deliveryPostcode: string
  package: {
    weightKg: number
    lengthCm: number
    widthCm: number
    heightCm: number
    palletReady: boolean
    tailLiftRequired: boolean
  }
}

type BookingResult = {
  provider: string
  mode: "test" | "live"
  bookingReference: string
  trackingNumber: string
  trackingUrl: string
  labelUrl: string
  serviceName: string
}

function numberFromMetadata(value: string | undefined | null) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function booleanFromMetadata(value: string | undefined | null) {
  return value === "true" || value === "1" || value === "yes"
}

function safeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function paymentIntentId(paymentIntent: Stripe.Checkout.Session["payment_intent"]) {
  if (!paymentIntent) return null
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id
}

function deliveryRequired(metadata: Stripe.Metadata | null | undefined) {
  const deliveryName = safeText(metadata?.deliveryName).toLowerCase()
  const deliveryPrice = numberFromMetadata(metadata?.deliveryPrice)

  return (
    deliveryPrice > 0 &&
    Boolean(deliveryName) &&
    !deliveryName.includes("collection") &&
    !deliveryName.includes("not selected")
  )
}

function buildPayload(session: Stripe.Checkout.Session): BookingPayload {
  const metadata = session.metadata || {}

  return {
    stripeSessionId: session.id,
    listingId: safeText(metadata.listingId),
    itemTitle: safeText(metadata.title) || "CaterBids item",
    quoteId: safeText(metadata.deliveryQuoteId) || "caterbids-delivery",
    serviceName: safeText(metadata.deliveryName) || "CaterBids Delivery",
    provider: safeText(metadata.deliveryProvider) || "CaterBids Delivery Test",
    collectionPostcode: safeText(metadata.collectionPostcode).toUpperCase(),
    deliveryPostcode: safeText(metadata.buyerDeliveryPostcode || metadata.deliveryPostcode).toUpperCase(),
    package: {
      weightKg: numberFromMetadata(metadata.weightKg),
      lengthCm: numberFromMetadata(metadata.lengthCm),
      widthCm: numberFromMetadata(metadata.widthCm),
      heightCm: numberFromMetadata(metadata.heightCm),
      palletReady: booleanFromMetadata(metadata.palletReady),
      tailLiftRequired: booleanFromMetadata(metadata.tailLiftRequired),
    },
  }
}

function validatePayload(payload: BookingPayload) {
  if (!payload.listingId) return "Missing listing ID for delivery booking."
  if (!payload.collectionPostcode) return "Missing collection postcode for delivery booking."
  if (!payload.deliveryPostcode) return "Missing delivery postcode for delivery booking."
  if (payload.package.weightKg <= 0) return "Missing package weight for delivery booking."
  if (payload.package.lengthCm <= 0 || payload.package.widthCm <= 0 || payload.package.heightCm <= 0) {
    return "Missing package dimensions for delivery booking."
  }

  return ""
}

function buildTestBooking(payload: BookingPayload): BookingResult {
  const seed = `${payload.stripeSessionId}-${payload.listingId}-${payload.deliveryPostcode}`
  const suffix = Buffer.from(seed).toString("base64url").slice(0, 10).toUpperCase()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  return {
    provider: "CaterBids Delivery Test",
    mode: "test",
    bookingReference: `CB-TEST-${suffix}`,
    trackingNumber: `CBT${suffix}`,
    trackingUrl: `${siteUrl}/account/orders?tracking=CBT${suffix}`,
    labelUrl: "",
    serviceName: payload.serviceName,
  }
}

async function bookWithLiveDeliveryApi(payload: BookingPayload) {
  const apiBase = process.env.CATERBIDS_DELIVERY_API || process.env.NEXT_PUBLIC_CATERBIDS_DELIVERY_API
  const forceTestMode = process.env.DELIVERY_BOOKING_MODE !== "live"

  if (!apiBase || forceTestMode) return null

  const response = await fetch(`${apiBase.replace(/\/$/, "")}/api/delivery/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.CATERBIDS_DELIVERY_API_KEY
        ? { Authorization: `Bearer ${process.env.CATERBIDS_DELIVERY_API_KEY}` }
        : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Live delivery booking failed.")
  }

  return {
    provider: safeText(data.provider) || payload.provider || "Live delivery API",
    mode: "live" as const,
    bookingReference: safeText(data.bookingReference) || safeText(data.reference),
    trackingNumber: safeText(data.trackingNumber) || safeText(data.tracking),
    trackingUrl: safeText(data.trackingUrl),
    labelUrl: safeText(data.labelUrl),
    serviceName: safeText(data.serviceName) || payload.serviceName,
  } satisfies BookingResult
}

async function saveBooking(session: Stripe.Checkout.Session, payload: BookingPayload, booking: BookingResult) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const detailedUpdate = {
    delivery_status: booking.mode === "live" ? "booked" : "test_booked",
    delivery_provider: booking.provider,
    delivery_quote_id: payload.quoteId,
    delivery_postcode: payload.deliveryPostcode,
    collection_postcode: payload.collectionPostcode,
    delivery_booking_reference: booking.bookingReference,
    delivery_tracking_number: booking.trackingNumber,
    delivery_tracking_url: booking.trackingUrl,
    delivery_label_url: booking.labelUrl,
    delivery_booked_at: now,
    updated_at: now,
  } as OrderUpdate

  const { error: detailedError } = await supabase
    .from("orders")
    .update(detailedUpdate)
    .eq("stripe_session_id", session.id)

  if (!detailedError) return

  console.warn("Detailed delivery booking update failed, falling back to delivery_status only:", detailedError.message)

  const { error: fallbackError } = await supabase
    .from("orders")
    .update({
      delivery_status: detailedUpdate.delivery_status,
      updated_at: now,
    })
    .eq("stripe_session_id", session.id)

  if (fallbackError) {
    throw fallbackError
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string }

    if (!sessionId) {
      return NextResponse.json({ error: "Missing Stripe session ID" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: `Cannot book delivery before payment is paid: ${session.payment_status}` },
        { status: 400 }
      )
    }

    if (!deliveryRequired(session.metadata)) {
      return NextResponse.json({
        success: true,
        booked: false,
        status: "not_required",
        message: "No paid delivery option was selected for this checkout.",
      })
    }

    const payload = buildPayload(session)
    const validationError = validatePayload(payload)

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          booked: false,
          status: "needs_details",
          error: validationError,
        },
        { status: 400 }
      )
    }

    const liveBooking = await bookWithLiveDeliveryApi(payload)

    if (!liveBooking) {
      return NextResponse.json({
        success: true,
        booked: false,
        status: "awaiting_booking",
        paymentIntentId: paymentIntentId(session.payment_intent),
        message:
          "Delivery request received. Final courier confirmation will follow when the Interparcel booking API is connected.",
        payload,
      })
    }

    const booking = liveBooking
    await saveBooking(session, payload, booking)

    return NextResponse.json({
      success: true,
      booked: true,
      status: booking.mode === "live" ? "booked" : "test_booked",
      paymentIntentId: paymentIntentId(session.payment_intent),
      booking,
      payload,
    })
  } catch (error) {
    console.error("Delivery booking failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to book delivery" },
      { status: 500 }
    )
  }
}
