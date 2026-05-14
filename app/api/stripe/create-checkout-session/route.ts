import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createDeliveryOrderBeforePayment } from "@/lib/delivery/deliveryOrders"
import { resolveFullUkPostcode } from "@/lib/delivery/postcodes"

type CheckoutRequestBody = {
  listingId?: string
  title?: string
  itemPrice?: number | string
  deliveryName?: string
  deliveryPrice?: number | string
  deliveryQuoteId?: string
  deliveryProvider?: string
  estimatedDeliveryTime?: string
  deliveryPostcode?: string
  buyerDeliveryFullAddress?: string
  buyerDeliveryPostcode?: string
  buyerPhone?: string
  buyerAccessRestrictions?: string
  collectionPostcode?: string
  weightKg?: number | string
  lengthCm?: number | string
  widthCm?: number | string
  heightCm?: number | string
  palletReady?: string
  tailLiftRequired?: string
  palletCount?: number | string
  insuranceValue?: number | string
  returnUrl?: string
  buyerId?: string
  sellerId?: string
}

function isUuid(value: string | undefined | null) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : ""
  const code = "code" in error && typeof error.code === "string" ? error.code : ""
  return code === "PGRST204" || message.includes("schema cache") || message.includes("column")
}

async function createPendingDeliveryOrder(payload: Record<string, unknown>) {
  const supabaseAdmin = createAdminClient()
  const result = await supabaseAdmin.from("orders").insert(payload as any).select("id").single()

  if (!result.error || !isMissingColumnError(result.error)) return result

  const {
    delivery_provider: _deliveryProvider,
    delivery_quote_id: _deliveryQuoteId,
    delivery_postcode: _deliveryPostcode,
    collection_postcode: _collectionPostcode,
    delivery_booking_required: _deliveryBookingRequired,
    buyer_delivery_full_address: _buyerDeliveryFullAddress,
    buyer_delivery_postcode: _buyerDeliveryPostcode,
    buyer_phone: _buyerPhone,
    buyer_access_restrictions: _buyerAccessRestrictions,
    pallet_weight_kg: _palletWeightKg,
    pallet_length_cm: _palletLengthCm,
    pallet_width_cm: _palletWidthCm,
    pallet_height_cm: _palletHeightCm,
    pallet_count: _palletCount,
    insurance_value: _insuranceValue,
    ...corePayload
  } = payload

  return supabaseAdmin.from("orders").insert(corePayload as any).select("id").single()
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutRequestBody

    const {
      listingId,
      title,
      itemPrice,
      deliveryName,
      deliveryPrice,
      deliveryQuoteId,
      deliveryProvider,
      estimatedDeliveryTime,
      deliveryPostcode,
      buyerDeliveryFullAddress,
      buyerDeliveryPostcode,
      buyerPhone,
      buyerAccessRestrictions,
      collectionPostcode,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      palletReady,
      tailLiftRequired,
      palletCount,
      insuranceValue,
      returnUrl,
      buyerId,
      sellerId: bodySellerId,
    } = body
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

    const itemAmount = Math.round(Number(itemPrice || 0) * 100)
    const deliveryAmount = Math.round(Number(deliveryPrice || 0) * 100)

    if (!listingId || !title || itemAmount <= 0) {
      return NextResponse.json({ error: "Missing listing details" }, { status: 400 })
    }

    if (!buyerId) {
      return NextResponse.json(
        { error: "You must be logged in before checkout." },
        { status: 401 }
      )
    }

    if (
      deliveryAmount > 0 &&
      (!deliveryQuoteId || !deliveryName || !buyerDeliveryFullAddress || !buyerDeliveryPostcode || !buyerPhone)
    ) {
      return NextResponse.json(
        { error: "Choose a delivery option and add delivery address details before payment." },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const buyer = await getCurrentUser(supabase)
    const checkoutBuyerId = buyer?.id || buyerId
    let sellerId = isUuid(bodySellerId) ? bodySellerId : ""
    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .maybeSingle()

    if (!isUuid(checkoutBuyerId)) {
      return NextResponse.json(
        { error: "Please sign in with a real CaterBids account before checkout." },
        { status: 401 }
      )
    }

    if (listing?.status === "sold") {
      return NextResponse.json(
        { error: "This listing has already sold." },
        { status: 409 }
      )
    }

    if (!sellerId) {
      sellerId = isUuid(listing?.seller_id)
        ? listing?.seller_id || ""
        : isUuid(listing?.user_id)
          ? listing?.user_id || ""
          : ""
    }

    if (!isUuid(sellerId)) {
      return NextResponse.json(
        { error: "Seller account ID could not be found for this listing. Publish the listing to Supabase before checkout." },
        { status: 400 }
      )
    }

    const fullCollectionPostcode = resolveFullUkPostcode(
      collectionPostcode,
      (listing as any)?.collection_postcode,
      (listing as any)?.collection_full_address,
      (listing as any)?.location
    )
    const fullDeliveryPostcode = resolveFullUkPostcode(buyerDeliveryPostcode, deliveryPostcode)

    if (deliveryAmount > 0 && !fullCollectionPostcode) {
      return NextResponse.json(
        { error: "Collection postcode not provided. Seller must add a full collection postcode before delivery checkout." },
        { status: 400 }
      )
    }

    if (deliveryAmount > 0 && !fullDeliveryPostcode) {
      return NextResponse.json(
        { error: "Enter a full delivery postcode before payment." },
        { status: 400 }
      )
    }

    const total = Number(itemPrice || 0) + Number(deliveryPrice || 0)
    const supabaseAdmin = createAdminClient()
    const deliveryRequestPayload = {
      listing_id: listingId,
      buyer_id: checkoutBuyerId,
      seller_id: sellerId,
      item_title: title,
      item_price: Number(itemPrice || 0),
      delivery_name: deliveryName || null,
      delivery_price: Number(deliveryPrice || 0),
      delivery_provider: deliveryProvider || (deliveryAmount > 0 ? "Interparcel-ready CaterBids Delivery" : null),
      delivery_quote_id: deliveryQuoteId || null,
      delivery_postcode: fullDeliveryPostcode || null,
      collection_postcode: fullCollectionPostcode || null,
      delivery_booking_required: deliveryAmount > 0,
      buyer_delivery_full_address: buyerDeliveryFullAddress || null,
      buyer_delivery_postcode: fullDeliveryPostcode || null,
      buyer_phone: buyerPhone || null,
      buyer_access_restrictions: buyerAccessRestrictions || null,
      pallet_weight_kg: Number(weightKg || (listing as any)?.pallet_weight_kg || (listing as any)?.weight_kg || 0) || null,
      pallet_length_cm: Number(lengthCm || (listing as any)?.pallet_length_cm || (listing as any)?.length_cm || 0) || null,
      pallet_width_cm: Number(widthCm || (listing as any)?.pallet_width_cm || (listing as any)?.width_cm || 0) || null,
      pallet_height_cm: Number(heightCm || (listing as any)?.pallet_height_cm || (listing as any)?.height_cm || 0) || null,
      pallet_count: Number(palletCount || (listing as any)?.pallet_count || 1) || 1,
      insurance_value: Number(insuranceValue || (listing as any)?.insurance_value || itemPrice || 0) || null,
      total_price: total,
      payment_status: "pending",
      order_status: "pending_payment",
      delivery_status: deliveryAmount > 0 ? "pending_payment" : "not_required",
      updated_at: new Date().toISOString(),
    }

    const { data: pendingOrder, error: pendingOrderError } = await createPendingDeliveryOrder(deliveryRequestPayload)

    if (pendingOrderError) {
      console.error("Pending delivery request create failed:", pendingOrderError)
      return NextResponse.json(
        { error: "Could not create the delivery/payment request before checkout." },
        { status: 500 }
      )
    }

    let deliveryOrderId = ""

    if (deliveryAmount > 0) {
      const { data: deliveryOrder, error: deliveryOrderError } = await createDeliveryOrderBeforePayment(supabaseAdmin, {
        order_id: pendingOrder?.id || null,
        listing_id: listingId,
        buyer_id: checkoutBuyerId,
        seller_id: sellerId,
        collection_postcode: fullCollectionPostcode || null,
        delivery_postcode: fullDeliveryPostcode || null,
        weight_kg: Number(weightKg || (listing as any)?.pallet_weight_kg || (listing as any)?.weight_kg || 0) || null,
        length_cm: Number(lengthCm || (listing as any)?.pallet_length_cm || (listing as any)?.length_cm || 0) || null,
        width_cm: Number(widthCm || (listing as any)?.pallet_width_cm || (listing as any)?.width_cm || 0) || null,
        height_cm: Number(heightCm || (listing as any)?.pallet_height_cm || (listing as any)?.height_cm || 0) || null,
        pallet_count: Number(palletCount || (listing as any)?.pallet_count || 1) || 1,
        insurance_value: Number(insuranceValue || (listing as any)?.insurance_value || itemPrice || 0) || null,
        selected_service_name: deliveryName || "CaterBids Delivery",
        selected_service_price: Number(deliveryPrice || 0),
        estimated_delivery_time: estimatedDeliveryTime || null,
        courier_provider: "Interparcel",
        pallet_size_name: null,
        tail_lift_required: tailLiftRequired === "true" || (listing as any)?.tail_lift_required === true,
        forklift_available: (listing as any)?.forklift_available ?? null,
        pallet_truck_available: (listing as any)?.pallet_truck_available ?? null,
        commercial_premises: (listing as any)?.commercial_premises ?? null,
        ground_floor_collection: (listing as any)?.ground_floor_collection ?? null,
        access_restrictions: buyerAccessRestrictions || (listing as any)?.access_restrictions || null,
        access_notes: buyerAccessRestrictions || (listing as any)?.delivery_notes || null,
        pallet_ready_confirmed: palletReady === "true" || palletReady === "1" || (listing as any)?.pallet_ready === true,
      })

      if (deliveryOrderError) {
        console.error("Delivery order create failed:", deliveryOrderError)
        return NextResponse.json(
          { error: "Could not create the delivery order before checkout. Run the delivery_orders migration, then try again." },
          { status: 500 }
        )
      }

      deliveryOrderId = deliveryOrder?.id || ""

      if (pendingOrder?.id && deliveryOrderId) {
        await supabaseAdmin
          .from("orders")
          .update({
            delivery_order_id: deliveryOrderId,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", pendingOrder.id)
      }
    }

    const lineItems = [
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: title,
            description: `CaterBids listing ID: ${listingId}`,
          },
          unit_amount: itemAmount,
        },
        quantity: 1,
      },
    ]

    if (deliveryAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "gbp",
          product_data: {
            name: deliveryName || "CaterBids Delivery",
            description: "Tracked delivery estimate",
          },
          unit_amount: deliveryAmount,
        },
        quantity: 1,
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}${deliveryOrderId ? `&delivery_order_id=${deliveryOrderId}` : ""}`,
      cancel_url: `${siteUrl}${returnUrl || "/"}`,
      metadata: {
        listingId,
        listing_id: listingId,
        title,
        itemPrice: String(itemPrice || 0),
        deliveryName: deliveryName || "",
        deliveryPrice: String(deliveryPrice || 0),
        selected_service_name: deliveryName || "",
        selected_service_price: String(deliveryPrice || 0),
        deliveryQuoteId: deliveryQuoteId || "",
        deliveryProvider: deliveryProvider || "",
        courier_provider: "Interparcel",
        estimated_delivery_time: estimatedDeliveryTime || "",
        deliveryPostcode: fullDeliveryPostcode || "",
        delivery_postcode: fullDeliveryPostcode || "",
        buyerDeliveryFullAddress: buyerDeliveryFullAddress || "",
        buyerDeliveryPostcode: fullDeliveryPostcode || "",
        buyer_delivery_postcode: fullDeliveryPostcode || "",
        buyerPhone: buyerPhone || "",
        buyerAccessRestrictions: buyerAccessRestrictions || "",
        collectionPostcode: fullCollectionPostcode || "",
        collection_postcode: fullCollectionPostcode || "",
        weightKg: String(weightKg || ""),
        lengthCm: String(lengthCm || ""),
        widthCm: String(widthCm || ""),
        heightCm: String(heightCm || ""),
        palletReady: palletReady || "",
        tailLiftRequired: tailLiftRequired || "",
        palletCount: String(palletCount || ""),
        insuranceValue: String(insuranceValue || ""),
        order_id: pendingOrder?.id || "",
        deliveryRequestId: pendingOrder?.id || "",
        deliveryOrderId,
        delivery_order_id: deliveryOrderId,
        total: String(total),
        buyerId: checkoutBuyerId,
        buyer_id: checkoutBuyerId,
        sellerId: sellerId || "",
        seller_id: sellerId || "",
      },
    })

    if (pendingOrder?.id && session.id) {
      // Real Interparcel booking will use this same order/request after payment.
      await supabaseAdmin
        .from("orders")
        .update({
          stripe_session_id: session.id,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", pendingOrder.id)
    }

    if (deliveryOrderId && session.id) {
      await supabaseAdmin
        .from("delivery_orders")
        .update({
          stripe_checkout_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deliveryOrderId)
    }

    return NextResponse.json({
      success: true,
      url: session.url,
    })
  } catch (error) {
    console.error("Stripe checkout error:", error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe checkout failed" },
      { status: 500 }
    )
  }
}
