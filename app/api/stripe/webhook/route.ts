import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import * as Sentry from "@sentry/nextjs"
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

function subscriptionId(subscription: Stripe.Checkout.Session["subscription"]) {
  if (!subscription) return null
  return typeof subscription === "string" ? subscription : subscription.id
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
    delivery_method: _deliveryMethod,
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
    pallet_size: _palletSize,
    pallet_ready: _palletReady,
    pallet_weight_kg: _palletWeightKg,
    pallet_length_cm: _palletLengthCm,
    pallet_width_cm: _palletWidthCm,
    pallet_height_cm: _palletHeightCm,
    pallet_count: _palletCount,
    tail_lift_required: _tailLiftRequired,
    forklift_available: _forkliftAvailable,
    commercial_premises: _commercialPremises,
    shrink_wrapped_confirmed: _shrinkWrappedConfirmed,
    pallet_preparation_confirmed: _palletPreparationConfirmed,
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
    Sentry.captureException(error, { tags: { webhook_stage: "signature_verification" } })
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

  if (metadata.checkout_type === "seller_plan") {
    const sellerId = nullableUuid(metadata.sellerId)

    if (!sellerId) {
      return NextResponse.json({ error: "Missing sellerId metadata" }, { status: 400 })
    }

    const listingCount = Math.max(1, Math.floor(numberFromMetadata(metadata.listingCount) || 1))
    const durationDays = Math.max(1, Math.floor(numberFromMetadata(metadata.durationDays) || 30))
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    try {
      const supabase = createAdminClient()
      const planId = nullableUuid(metadata.planId)
      const { error } = await supabase.from("seller_listing_entitlements").upsert(
        {
          seller_id: sellerId,
          plan_id: planId,
          plan_name: metadata.planName || "Seller plan",
          stripe_session_id: session.id,
          stripe_subscription_id: subscriptionId(session.subscription),
          listing_count_total: listingCount,
          listing_count_used: 0,
          monthly: metadata.monthly === "true",
          starts_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_session_id" }
      )

      if (error) throw error
      return NextResponse.json({ received: true, sellerPlan: true })
    } catch (error) {
      Sentry.captureException(error, { tags: { webhook_stage: "seller_plan" } })
      console.error("Seller plan entitlement failed:", error)
      return NextResponse.json({ error: "Could not save seller plan entitlement" }, { status: 500 })
    }
  }

  if (metadata.checkout_type === "founding_member") {
    const sellerId = nullableUuid(metadata.sellerId)
    if (!sellerId) {
      return NextResponse.json({ error: "Missing sellerId in founding_member webhook" }, { status: 400 })
    }
    try {
      const supabase = createAdminClient()
      const { data: claimed, error: rpcError } = await (supabase as any).rpc("claim_founding_member_slot")
      if (rpcError) throw rpcError
      if (!claimed) {
        // Cap reached between checkout creation and payment. Log for manual refund.
        console.warn("Founding member cap reached at webhook time — session:", session.id, "seller:", sellerId)
        return NextResponse.json({ received: true, capReached: true })
      }
      const planId = nullableUuid(metadata.planId)
      const { error: entitlementError } = await supabase
        .from("seller_listing_entitlements")
        .upsert(
          {
            seller_id: sellerId,
            plan_id: planId,
            plan_name: "Founding Trade Member",
            stripe_session_id: session.id,
            listing_count_total: 30,
            listing_count_used: 0,
            monthly: false,
            starts_at: new Date().toISOString(),
            expires_at: null,
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_session_id" }
        )
      if (entitlementError) throw entitlementError
      await (supabase.from("profiles") as any)
        .update({ is_founding_member: true, updated_at: new Date().toISOString() })
        .eq("id", sellerId)
      return NextResponse.json({ received: true, foundingMember: true })
    } catch (error) {
      Sentry.captureException(error, { tags: { webhook_stage: "founding_member" } })
      console.error("Founding member webhook failed:", error)
      return NextResponse.json({ error: "Could not grant founding membership" }, { status: 500 })
    }
  }

  if (metadata.checkout_type === "featured_boost") {
    const boostListingId = metadata.listingId || ""
    if (!boostListingId) {
      return NextResponse.json({ error: "Missing listingId in featured_boost webhook" }, { status: 400 })
    }
    const boostDays = Math.max(1, Math.floor(numberFromMetadata(metadata.durationDays) || 7))
    const boostUntil = new Date()
    boostUntil.setDate(boostUntil.getDate() + boostDays)
    try {
      const supabase = createAdminClient()
      const { error } = await supabase
        .from("listings")
        .update({
          featured: true,
          is_featured: true,
          featured_type: "paid",
          featured_at: new Date().toISOString(),
          featured_by: nullableUuid(metadata.sellerId),
          featured_until: boostUntil.toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", boostListingId)
      if (error) throw error
      return NextResponse.json({ received: true, featuredBoost: true })
    } catch (error) {
      Sentry.captureException(error, { tags: { webhook_stage: "featured_boost" } })
      console.error("Featured boost webhook failed:", error)
      return NextResponse.json({ error: "Could not apply featured boost" }, { status: 500 })
    }
  }

  if (metadata.checkout_type === "listing_overage") {
    const entitlementId = metadata.entitlementId || ""
    if (!entitlementId) {
      return NextResponse.json({ error: "Missing entitlementId in listing_overage webhook" }, { status: 400 })
    }
    try {
      const supabase = createAdminClient()
      const { data: ent, error: fetchError } = await supabase
        .from("seller_listing_entitlements")
        .select("listing_count_total")
        .eq("id", entitlementId)
        .maybeSingle()
      if (fetchError) throw fetchError
      const newTotal = Math.max(1, (Number(ent?.listing_count_total) || 0) + 1)
      const { error: updateError } = await supabase
        .from("seller_listing_entitlements")
        .update({ listing_count_total: newTotal, updated_at: new Date().toISOString() })
        .eq("id", entitlementId)
      if (updateError) throw updateError
      return NextResponse.json({ received: true, overageGranted: true })
    } catch (error) {
      Sentry.captureException(error, { tags: { webhook_stage: "listing_overage" } })
      console.error("Listing overage webhook failed:", error)
      return NextResponse.json({ error: "Could not grant listing overage" }, { status: 500 })
    }
  }

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
    const deliveryMethod =
      metadata.deliveryMethod || metadata.delivery_method || (deliveryPrice > 0 ? "pallet_delivery" : "collection_only")
    const isPalletDelivery = deliveryMethod === "pallet_delivery"
    const nextDeliveryStatus = isPalletDelivery ? "awaiting_booking" : "not_required"
    const deliveryProvider =
      isPalletDelivery ? metadata.courier_provider || metadata.deliveryProvider || "Interparcel" : null
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
      delivery_method: isPalletDelivery ? "pallet_delivery" : "collection_only",
      delivery_name: isPalletDelivery ? metadata.deliveryName || null : "Collection only",
      delivery_price: isPalletDelivery ? deliveryPrice : 0,
      delivery_provider: deliveryProvider,
      delivery_quote_id: isPalletDelivery ? metadata.deliveryQuoteId || null : null,
      delivery_postcode: isPalletDelivery ? fullDeliveryPostcode || null : null,
      collection_postcode: isPalletDelivery ? fullCollectionPostcode || null : null,
      delivery_booking_required: isPalletDelivery,
      buyer_delivery_full_address: isPalletDelivery ? metadata.buyerDeliveryFullAddress || null : null,
      buyer_delivery_postcode: isPalletDelivery ? fullDeliveryPostcode || null : null,
      buyer_phone: isPalletDelivery ? metadata.buyerPhone || null : null,
      buyer_access_restrictions: isPalletDelivery ? metadata.buyerAccessRestrictions || null : null,
      collection_full_address: isPalletDelivery ? listingData?.collection_full_address || null : null,
      collection_city: isPalletDelivery ? listingData?.collection_city || null : null,
      seller_contact_name: isPalletDelivery ? listingData?.seller_contact_name || null : null,
      seller_phone: isPalletDelivery ? listingData?.seller_phone || null : null,
      pallet_size: isPalletDelivery ? listingData?.pallet_size || metadata.palletSize || null : null,
      pallet_ready: isPalletDelivery ? Boolean(listingData?.pallet_ready) : false,
      pallet_weight_kg: isPalletDelivery ? listingData?.pallet_weight_kg || listingData?.weight_kg || numberFromMetadata(metadata.weightKg) : null,
      pallet_length_cm: isPalletDelivery ? listingData?.pallet_length_cm || listingData?.length_cm || numberFromMetadata(metadata.lengthCm) : null,
      pallet_width_cm: isPalletDelivery ? listingData?.pallet_width_cm || listingData?.width_cm || numberFromMetadata(metadata.widthCm) : null,
      pallet_height_cm: isPalletDelivery ? listingData?.pallet_height_cm || listingData?.height_cm || numberFromMetadata(metadata.heightCm) : null,
      pallet_count: isPalletDelivery ? listingData?.pallet_count || numberFromMetadata(metadata.palletCount) || 1 : 1,
      tail_lift_required: isPalletDelivery ? Boolean(listingData?.tail_lift_required) || metadata.tailLiftRequired === "true" : false,
      forklift_available: isPalletDelivery ? Boolean(listingData?.forklift_available) : false,
      commercial_premises: isPalletDelivery ? listingData?.commercial_premises !== false : false,
      shrink_wrapped_confirmed: isPalletDelivery ? Boolean(listingData?.shrink_wrapped_confirmed) || metadata.shrinkWrappedConfirmed === "true" : false,
      pallet_preparation_confirmed: isPalletDelivery ? Boolean(listingData?.pallet_preparation_confirmed) || metadata.palletPreparationConfirmed === "true" : false,
      preferred_collection_date: isPalletDelivery ? listingData?.preferred_collection_date || null : null,
      insurance_value: isPalletDelivery ? listingData?.insurance_value || numberFromMetadata(metadata.insuranceValue) || itemPrice : null,
      access_restrictions: isPalletDelivery ? listingData?.access_restrictions || null : null,
      delivery_notes: isPalletDelivery ? listingData?.delivery_notes || null : null,
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

    const deliveryOrderResult = isPalletDelivery
      ? await upsertDeliveryOrderAfterPayment({
          supabase,
          session,
          orderId: savedOrder?.id || existingOrder?.id || null,
          listingData,
        })
      : { data: null, error: null }

    if (deliveryOrderResult.error) {
      if (isMissingDeliveryOrdersTable(deliveryOrderResult.error)) {
        throw new Error("Delivery order table is not ready. Run the delivery_orders migration.")
      }
      throw deliveryOrderResult.error
    }

    if (isPalletDelivery && savedOrder?.id && deliveryOrderResult.data?.id) {
      const { error: orderDeliveryLinkError } = await supabase
        .from("orders")
        .update({
          delivery_order_id: deliveryOrderResult.data.id,
          delivery_status: "awaiting_booking",
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
    Sentry.captureException(error, { tags: { webhook_stage: "order_creation" } })
    console.error("Stripe webhook order creation failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook order creation failed" },
      { status: 500 }
    )
  }
}
