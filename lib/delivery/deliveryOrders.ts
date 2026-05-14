import type Stripe from "stripe"
import type { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/supabase"
import { resolveFullUkPostcode } from "@/lib/delivery/postcodes"

export const DELIVERY_ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "booking_requested",
  "courier_confirmed",
  "tracking_assigned",
  "collected",
  "delivered",
  "cancelled",
  "failed",
] as const

export type DeliveryOrderStatus = (typeof DELIVERY_ORDER_STATUSES)[number]
export type DeliveryOrderRow = Database["public"]["Tables"]["delivery_orders"]["Row"]
export type DeliveryOrderInsert = Database["public"]["Tables"]["delivery_orders"]["Insert"]
export type DeliveryOrderUpdate = Database["public"]["Tables"]["delivery_orders"]["Update"]
type SupabaseAdmin = ReturnType<typeof createAdminClient>

export function moneyFromStripe(amount: number | null | undefined) {
  return Number(amount || 0) / 100
}

export function numberFromMetadata(value: string | undefined | null) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function booleanFromMetadata(value: string | undefined | null) {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (["true", "1", "yes", "y"].includes(normalized)) return true
  if (["false", "0", "no", "n"].includes(normalized)) return false
  return null
}

function booleanFromUnknown(value: unknown) {
  return typeof value === "boolean" ? value : null
}

export function nullableUuid(value: string | undefined | null) {
  if (!value) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null
}

export function paymentIntentId(paymentIntent: Stripe.Checkout.Session["payment_intent"]) {
  if (!paymentIntent) return null
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id
}

export function deliveryOrderLabel(status: string | null | undefined) {
  const value = status || "pending_payment"
  return value.replace(/_/g, " ")
}

export function isRealTrackingAvailable(deliveryOrder: Pick<DeliveryOrderRow, "tracking_number" | "tracking_url" | "is_test"> | null | undefined) {
  return Boolean(
    deliveryOrder &&
      !deliveryOrder.is_test &&
      deliveryOrder.tracking_number &&
      deliveryOrder.tracking_url &&
      deliveryOrder.tracking_url !== "#"
  )
}

export function isLocalCourierTestMode() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_COURIER_CONFIRMATION === "true"
}

export function isMissingDeliveryOrdersTable(error: unknown) {
  if (!error || typeof error !== "object") return false
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : ""
  const code = "code" in error && typeof error.code === "string" ? error.code : ""

  return (
    code === "42P01" ||
    code === "PGRST204" ||
    message.includes("delivery_orders") ||
    message.includes("schema cache") ||
    message.includes("could not find the table")
  )
}

export function deliveryOrderIdFromMetadata(metadata: Stripe.Metadata | null | undefined) {
  return metadata?.delivery_order_id || metadata?.deliveryOrderId || metadata?.deliveryRequestId || ""
}

export function deliveryRequiredFromMetadata(metadata: Stripe.Metadata | null | undefined) {
  return numberFromMetadata(metadata?.selected_service_price || metadata?.deliveryPrice) > 0
}

export async function findDeliveryOrderForSession(
  supabase: SupabaseAdmin,
  sessionId: string,
  metadata: Stripe.Metadata | null | undefined
) {
  const deliveryOrderId = deliveryOrderIdFromMetadata(metadata)

  if (deliveryOrderId) {
    const byId = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("id", deliveryOrderId)
      .maybeSingle()

    if (byId.data || byId.error) return byId
  }

  return supabase
    .from("delivery_orders")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle()
}

export async function createDeliveryOrderBeforePayment(
  supabase: SupabaseAdmin,
  payload: DeliveryOrderInsert
) {
  return supabase
    .from("delivery_orders")
    .insert({
      ...payload,
      delivery_status: "pending_payment",
      courier_provider: payload.courier_provider || "Interparcel",
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single()
}

export async function upsertDeliveryOrderAfterPayment({
  supabase,
  session,
  orderId,
  listingData,
}: {
  supabase: SupabaseAdmin
  session: Stripe.Checkout.Session
  orderId?: string | null
  listingData?: Record<string, unknown> | null
}) {
  const metadata = session.metadata || {}
  if (!deliveryRequiredFromMetadata(metadata)) return { data: null, error: null }

  const now = new Date().toISOString()
  const existing = await findDeliveryOrderForSession(supabase, session.id, metadata)
  if (existing.error && !isMissingDeliveryOrdersTable(existing.error)) {
    return existing
  }

  const basePayload: DeliveryOrderInsert = {
    order_id: orderId || metadata.order_id || null,
    listing_id: metadata.listing_id || metadata.listingId || "",
    buyer_id: nullableUuid(metadata.buyer_id || metadata.buyerId),
    seller_id: nullableUuid(metadata.seller_id || metadata.sellerId),
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId(session.payment_intent),
    collection_postcode: resolveFullUkPostcode(
      metadata.collection_postcode,
      metadata.collectionPostcode,
      listingData?.collection_postcode,
      listingData?.collection_full_address,
      listingData?.location
    ) || null,
    delivery_postcode: resolveFullUkPostcode(
      metadata.buyer_delivery_postcode,
      metadata.buyerDeliveryPostcode,
      metadata.delivery_postcode,
      metadata.deliveryPostcode
    ) || null,
    weight_kg: numberFromMetadata(metadata.weightKg) || Number(listingData?.pallet_weight_kg || listingData?.weight_kg || 0) || null,
    length_cm: numberFromMetadata(metadata.lengthCm) || Number(listingData?.pallet_length_cm || listingData?.length_cm || 0) || null,
    width_cm: numberFromMetadata(metadata.widthCm) || Number(listingData?.pallet_width_cm || listingData?.width_cm || 0) || null,
    height_cm: numberFromMetadata(metadata.heightCm) || Number(listingData?.pallet_height_cm || listingData?.height_cm || 0) || null,
    pallet_count: numberFromMetadata(metadata.palletCount) || Number(listingData?.pallet_count || 1) || 1,
    insurance_value: numberFromMetadata(metadata.insuranceValue) || numberFromMetadata(metadata.itemPrice) || null,
    selected_service_name: metadata.selected_service_name || metadata.deliveryName || null,
    selected_service_price: numberFromMetadata(metadata.selected_service_price || metadata.deliveryPrice),
    estimated_delivery_time: metadata.estimated_delivery_time || metadata.deliveryEta || null,
    courier_provider: metadata.courier_provider || "Interparcel",
    delivery_status: "paid",
    pallet_size_name: metadata.pallet_size_name || metadata.palletSizeName || null,
    tail_lift_required: booleanFromMetadata(metadata.tailLiftRequired) ?? booleanFromUnknown(listingData?.tail_lift_required),
    forklift_available: booleanFromUnknown(listingData?.forklift_available),
    pallet_truck_available: booleanFromUnknown(listingData?.pallet_truck_available),
    commercial_premises: booleanFromUnknown(listingData?.commercial_premises),
    ground_floor_collection: booleanFromUnknown(listingData?.ground_floor_collection),
    access_restrictions: metadata.buyerAccessRestrictions || String(listingData?.access_restrictions || "") || null,
    access_notes: metadata.buyerAccessRestrictions || String(listingData?.delivery_notes || "") || null,
    pallet_ready_confirmed: booleanFromMetadata(metadata.palletReady) ?? booleanFromUnknown(listingData?.pallet_ready),
    paid_at: now,
    updated_at: now,
  }

  if (existing.data) {
    const paidUpdate = await supabase
      .from("delivery_orders")
      .update({
        ...basePayload,
        delivery_status: "paid",
        paid_at: existing.data.paid_at || now,
        updated_at: now,
      })
      .eq("id", existing.data.id)

    if (paidUpdate.error) return paidUpdate

    return supabase
      .from("delivery_orders")
      .update({
        delivery_status: "booking_requested",
        requested_at: existing.data.requested_at || now,
        updated_at: now,
      })
      .eq("id", existing.data.id)
      .select("*")
      .single()
  }

  const inserted = await supabase
    .from("delivery_orders")
    .insert({
      ...basePayload,
      delivery_status: "paid",
    })
    .select("*")
    .single()

  if (inserted.error) return inserted

  return supabase
    .from("delivery_orders")
    .update({
      delivery_status: "booking_requested",
      requested_at: now,
      updated_at: now,
    })
    .eq("id", inserted.data.id)
    .select("*")
    .single()
}

export async function simulateCourierConfirmation(supabase: SupabaseAdmin, deliveryOrderId: string) {
  if (!isLocalCourierTestMode()) {
    return {
      data: null,
      error: new Error("Test courier confirmation is disabled outside local/test mode."),
    }
  }

  const now = new Date().toISOString()

  return supabase
    .from("delivery_orders")
    .update({
      delivery_status: "courier_confirmed",
      courier_name: "Interparcel Test Courier",
      courier_reference: "TEST-REFERENCE",
      tracking_number: "TEST-TRACKING-NUMBER",
      tracking_url: "#",
      is_test: true,
      booked_at: now,
      updated_at: now,
    })
    .eq("id", deliveryOrderId)
    .select("*")
    .single()
}
