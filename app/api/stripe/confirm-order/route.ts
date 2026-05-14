import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  deliveryOrderIdFromMetadata,
  isMissingDeliveryOrdersTable,
  upsertDeliveryOrderAfterPayment,
} from "@/lib/delivery/deliveryOrders"
import { sendPaymentSuccessEmails } from "@/lib/email/orderNotifications"

export const runtime = "nodejs"

function numberFromMetadata(value: string | undefined) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function nullableUuid(value: string | undefined | null) {
  if (!value) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value)
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

  console.warn("Order insert hit a schema mismatch. Retrying with core order columns only:", result.error.message)

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
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string }

    if (!sessionId) {
      return NextResponse.json({ error: "Missing Stripe session ID" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const metadata = session.metadata || {}
    const listingId = metadata.listingId || ""

    console.log("Confirm order requested for Stripe session:", session.id)
    console.log("Confirm order metadata:", metadata)

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId metadata" }, { status: 400 })
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: `Stripe session is not paid yet: ${session.payment_status}` },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const itemPrice = numberFromMetadata(metadata.itemPrice)
    const deliveryPrice = numberFromMetadata(metadata.deliveryPrice)
    const totalPrice =
      numberFromMetadata(metadata.total) ||
      (session.amount_total ? session.amount_total / 100 : itemPrice + deliveryPrice)
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
      item_title: metadata.title || "CaterBids item",
      item_price: itemPrice,
      delivery_name: metadata.deliveryName || null,
      delivery_price: deliveryPrice,
      delivery_provider: deliveryProvider,
      delivery_quote_id: metadata.deliveryQuoteId || null,
      delivery_postcode: metadata.buyerDeliveryPostcode || metadata.deliveryPostcode || null,
      collection_postcode: metadata.collectionPostcode || null,
      delivery_booking_required: deliveryPrice > 0,
      buyer_delivery_full_address: metadata.buyerDeliveryFullAddress || null,
      buyer_delivery_postcode: metadata.buyerDeliveryPostcode || metadata.deliveryPostcode || null,
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
      payment_status: session.payment_status || "paid",
      order_status: "paid",
      delivery_status: resolvedDeliveryStatus,
      updated_at: new Date().toISOString(),
    })

    if (orderError) {
      console.error("CONFIRM ORDER INSERT FAILED:", orderError)
      throw orderError
    }

    if (buyerUuid) {
      const { error: buyerLinkError } = await supabase
        .from("orders")
        .update({
          buyer_id: buyerUuid,
          seller_id: sellerUuid,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id)

      if (buyerLinkError) {
        console.error("CONFIRM ORDER BUYER LINK FAILED:", buyerLinkError)
        throw buyerLinkError
      }
    }

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

    try {
      const { error: listingError } = await supabase
        .from("listings")
        .update({
          status: "sold",
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingId)

      if (listingError) {
        console.warn("Confirm order listing update skipped/failed:", listingError.message)
      }
    } catch (error) {
      console.warn("Confirm order listing table not available; order still created.", error)
    }

    console.log("CONFIRM ORDER CREATED:", session.id)

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

    return NextResponse.json({
      success: true,
      orderCreated: true,
      stripeSessionId: session.id,
      listingId,
      buyerLinked: Boolean(buyerId),
      order: finalOrder
        ? {
            id: finalOrder.id,
            itemTitle: finalOrder.item_title,
            itemPrice: finalOrder.item_price,
            totalPrice: finalOrder.total_price,
            paymentStatus: finalOrder.payment_status,
            deliveryStatus: deliveryOrderResult.data?.status || finalOrder.delivery_status,
            deliveryName: deliveryOrderResult.data?.selected_service_name || finalOrder.delivery_name,
            deliveryPrice: deliveryOrderResult.data?.selected_service_price || finalOrder.delivery_price,
            collectionPostcode: deliveryOrderResult.data?.collection_postcode || finalOrder.collection_postcode,
            deliveryPostcode: deliveryOrderResult.data?.delivery_postcode || finalOrder.buyer_delivery_postcode || finalOrder.delivery_postcode,
          }
        : null,
      deliveryOrder: deliveryOrderResult.data
        ? {
            id: deliveryOrderResult.data.id,
            status: deliveryOrderResult.data.status,
            selectedServiceName: deliveryOrderResult.data.selected_service_name,
            selectedServicePrice: deliveryOrderResult.data.selected_service_price,
            collectionPostcode: deliveryOrderResult.data.collection_postcode,
            deliveryPostcode: deliveryOrderResult.data.delivery_postcode,
            courierProvider: deliveryOrderResult.data.courier_provider,
            trackingNumber: deliveryOrderResult.data.tracking_number,
            trackingUrl: deliveryOrderResult.data.tracking_url,
            isTest: deliveryOrderResult.data.is_test,
          }
        : null,
    })
  } catch (error) {
    console.error("Confirm order failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to confirm order" },
      { status: 500 }
    )
  }
}
