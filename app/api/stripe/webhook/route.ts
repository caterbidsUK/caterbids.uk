import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  deliveryOrderIdFromMetadata,
  isMissingDeliveryOrdersTable,
  upsertDeliveryOrderAfterPayment,
} from "@/lib/delivery/deliveryOrders"
import { resolveFullUkPostcode } from "@/lib/delivery/postcodes"
import { sendPaymentSuccessEmails } from "@/lib/email/orderNotifications"

export const runtime = "nodejs"

function numberFromMetadata(value: string | undefined) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function nullableUuid(value: string | undefined | null) {
  if (!value) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null
}

function paymentIntentId(paymentIntent: Stripe.Checkout.Session["payment_intent"]) {
  if (!paymentIntent) return null
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : ""
  const code = "code" in error && typeof error.code === "string" ? error.code : ""

  return code === "PGRST204" || message.includes("schema cache") || message.includes("column")
}

function normaliseOrderDeliveryStatus(value: string | null | undefined, fallback: string) {
  if (!value || value === "pending_payment" || value === "awaiting_booking" || value === "not_booked") {
    return fallback
  }

  if (value === "booked" || value === "test_booked") {
    return "courier_confirmed"
  }

  return value
}

async function upsertOrderWithSchemaFallback(
  supabase: ReturnType<typeof createAdminClient>,
  payload: Record<string, unknown>
) {
  const result = await supabase
    .from("orders")
    .upsert(payload as any, { onConflict: "stripe_session_id" })

  if (!result.error || !isMissingColumnError(result.error)) {
    return result
  }

  console.warn("Webhook order insert hit a schema mismatch. Retrying with core order columns only:", result.error.message)

  const {
    delivery_provider: _deliveryProvider,
    delivery_order_id: _deliveryOrderId,
    delivery_quote_id: _deliveryQuoteId,
    delivery_postcode: _deliveryPostcode,
    collection_postcode: _collectionPostcode,
    delivery_booking_required: _deliveryBookingRequired,
    buyer_delivery_full_address: _buyerDeliveryFullAddress,
    buyer_delivery_postcode: _buyerDeliveryPostcode,
    buyer_phone: _buyerPhone,
    buyer_access_restrictions: _buyerAccessRestrictions,
    collection_full_address: _collectionFullAddress,
    collection_city: _collectionCity,
    seller_contact_name: _sellerContactName,
    seller_phone: _sellerPhone,
    pallet_weight_kg: _palletWeightKg,
    pallet_length_cm: _palletLengthCm,
    pallet_width_cm: _palletWidthCm,
    pallet_height_cm: _palletHeightCm,
    pallet_count: _palletCount,
    tail_lift_required: _tailLiftRequired,
    forklift_available: _forkliftAvailable,
    commercial_premises: _commercialPremises,
    preferred_collection_date: _preferredCollectionDate,
    insurance_value: _insuranceValue,
    access_restrictions: _accessRestrictions,
    delivery_notes: _deliveryNotes,
    ...corePayload
  } = payload

  return supabase.from("orders").upsert(corePayload as any, { onConflict: "stripe_session_id" })
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 })
  }

  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error("Stripe webhook signature failed:", error)
    return NextResponse.json({ error: "Invalid Stripe webhook signature" }, { status: 400 })
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true })
  }

  console.log("checkout.session.completed received")

  const session = event.data.object as Stripe.Checkout.Session
  const metadata = session.metadata || {}
  console.log("Stripe metadata:", metadata)

  const listingId = metadata.listingId || ""

  if (!listingId) {
    console.error("Webhook missing listingId metadata")
    return NextResponse.json({ error: "Missing listingId metadata" }, { status: 400 })
  }

  const itemPrice = numberFromMetadata(metadata.itemPrice)
  const deliveryPrice = numberFromMetadata(metadata.deliveryPrice)
  const totalPrice =
    numberFromMetadata(metadata.total) ||
    (session.amount_total ? session.amount_total / 100 : itemPrice + deliveryPrice)
  const paymentStatus = session.payment_status || "paid"

  try {
    const supabase = createAdminClient()
    const buyerId = metadata.buyerId || null
    let sellerId = metadata.sellerId || null
    const buyerUuid = nullableUuid(buyerId)

    console.log("ORDER METADATA:", metadata)
    console.log("ORDER BUYER ID:", buyerId)

    const { data: listingSnapshot } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .maybeSingle()
    const listingData = listingSnapshot as any

    if (!sellerId) {
      sellerId = nullableUuid(listingData?.seller_id) || nullableUuid(listingData?.user_id)
    }
    const sellerUuid = nullableUuid(sellerId)
    const nextDeliveryStatus = deliveryPrice > 0 ? "booking_requested" : "not_required"
    const deliveryProvider =
      metadata.courier_provider || metadata.deliveryProvider || (deliveryPrice > 0 ? "Interparcel" : null)
    const metadataDeliveryOrderId = deliveryOrderIdFromMetadata(metadata)
    const fullCollectionPostcode = resolveFullUkPostcode(
      metadata.collection_postcode,
      metadata.collectionPostcode,
      listingData?.collection_postcode,
      listingData?.collection_full_address,
      listingData?.location
    )
    const fullDeliveryPostcode = resolveFullUkPostcode(
      metadata.buyer_delivery_postcode,
      metadata.buyerDeliveryPostcode,
      metadata.delivery_postcode,
      metadata.deliveryPostcode
    )

    console.log("ORDER SELLER ID:", sellerId)
    console.log("ORDER DELIVERY:", metadata.deliveryName, metadata.deliveryPrice)

    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id,delivery_status,delivery_order_id")
      .eq("stripe_session_id", session.id)
      .maybeSingle()
    const resolvedDeliveryStatus = normaliseOrderDeliveryStatus(existingOrder?.delivery_status, nextDeliveryStatus)

    const { error: orderError } = await upsertOrderWithSchemaFallback(supabase, {
      listing_id: listingId,
      buyer_id: buyerUuid,
      seller_id: sellerUuid,
      delivery_order_id: metadataDeliveryOrderId || existingOrder?.delivery_order_id || null,
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId(session.payment_intent),
      item_title: metadata.title || null,
      item_price: itemPrice,
      delivery_name: metadata.deliveryName || null,
      delivery_price: deliveryPrice,
      delivery_provider: deliveryProvider,
      delivery_quote_id: metadata.deliveryQuoteId || null,
      delivery_postcode: fullDeliveryPostcode || null,
      collection_postcode: fullCollectionPostcode || null,
      delivery_booking_required: deliveryPrice > 0,
      buyer_delivery_full_address: metadata.buyerDeliveryFullAddress || null,
      buyer_delivery_postcode: fullDeliveryPostcode || null,
      buyer_phone: metadata.buyerPhone || null,
      buyer_access_restrictions: metadata.buyerAccessRestrictions || null,
      collection_full_address: listingData?.collection_full_address || null,
      collection_city: listingData?.collection_city || null,
      seller_contact_name: listingData?.seller_contact_name || null,
      seller_phone: listingData?.seller_phone || null,
      pallet_weight_kg: listingData?.pallet_weight_kg || listingData?.weight_kg || numberFromMetadata(metadata.weightKg),
      pallet_length_cm: listingData?.pallet_length_cm || listingData?.length_cm || numberFromMetadata(metadata.lengthCm),
      pallet_width_cm: listingData?.pallet_width_cm || listingData?.width_cm || numberFromMetadata(metadata.widthCm),
      pallet_height_cm: listingData?.pallet_height_cm || listingData?.height_cm || numberFromMetadata(metadata.heightCm),
      pallet_count: listingData?.pallet_count || numberFromMetadata(metadata.palletCount) || 1,
      tail_lift_required: Boolean(listingData?.tail_lift_required) || metadata.tailLiftRequired === "true",
      forklift_available: Boolean(listingData?.forklift_available),
      commercial_premises: listingData?.commercial_premises !== false,
      preferred_collection_date: listingData?.preferred_collection_date || null,
      insurance_value: listingData?.insurance_value || numberFromMetadata(metadata.insuranceValue) || itemPrice,
      access_restrictions: listingData?.access_restrictions || null,
      delivery_notes: listingData?.delivery_notes || null,
      total_price: totalPrice,
      payment_status: paymentStatus,
      order_status: paymentStatus === "paid" ? "paid" : "payment_pending",
      delivery_status: resolvedDeliveryStatus,
      updated_at: new Date().toISOString(),
    })

    if (orderError) {
      console.error("ORDER INSERT FAILED:", orderError)
      throw orderError
    }

    console.log("ORDER CREATED:", session.id)

    const { data: savedOrder, error: savedOrderError } = await supabase
      .from("orders")
      .select("*")
      .eq("stripe_session_id", session.id)
      .maybeSingle()

    if (savedOrderError) {
      throw savedOrderError
    }

    const deliveryOrderResult = await upsertDeliveryOrderAfterPayment({
      supabase,
      session,
      orderId: savedOrder?.id || existingOrder?.id || null,
      listingData,
    })

    if (deliveryOrderResult.error) {
      if (isMissingDeliveryOrdersTable(deliveryOrderResult.error)) {
        throw new Error("Delivery order table is not ready. Run the delivery_orders migration.")
      }
      throw deliveryOrderResult.error
    }

    if (savedOrder?.id && deliveryOrderResult.data?.id) {
      const { error: orderDeliveryLinkError } = await supabase
        .from("orders")
        .update({
          delivery_order_id: deliveryOrderResult.data.id,
          delivery_status: "booking_requested",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", savedOrder.id)

      if (orderDeliveryLinkError && !isMissingColumnError(orderDeliveryLinkError)) {
        throw orderDeliveryLinkError
      }
    }

    const { data: finalOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("stripe_session_id", session.id)
      .maybeSingle()

    if (finalOrder) {
      await sendPaymentSuccessEmails({
        supabase,
        order: finalOrder,
        deliveryOrder: deliveryOrderResult.data,
      })
    }

    try {
      const { error: listingError } = await supabase
        .from("listings")
        .update({
          status: paymentStatus === "paid" ? "sold" : "payment_pending",
          sold_at: paymentStatus === "paid" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingId)

      if (listingError) {
        console.warn("Listing update skipped/failed:", listingError.message)
      }
    } catch (error) {
      console.warn("Listing table not available yet, order still created.", error)
    }

    return NextResponse.json({ received: true, orderCreated: true })
  } catch (error) {
    console.error("Stripe webhook order creation failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook order creation failed" },
      { status: 500 }
    )
  }
}
