import { NextRequest, NextResponse } from "next/server"
import type { CaterBidsDeliveryOption } from "@/lib/delivery/options"
import { resolveFullUkPostcode } from "@/lib/delivery/postcodes"
import { createAdminClient } from "@/lib/supabase/admin"

function isUuid(value: unknown) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

async function resolveListingCollectionPostcode(listingId: unknown) {
  if (!isUuid(listingId)) return ""
  const safeListingId = listingId as string

  try {
    const supabase = createAdminClient()
    const { data: listing } = await supabase
      .from("listings")
      .select("collection_postcode,collection_full_address,location,city,seller_id,user_id")
      .eq("id", safeListingId)
      .maybeSingle()

    const listingPostcode = resolveFullUkPostcode(
      (listing as any)?.collection_postcode,
      (listing as any)?.collection_full_address,
      (listing as any)?.location,
      (listing as any)?.city
    )
    if (listingPostcode) return listingPostcode

    const sellerId = isUuid((listing as any)?.seller_id)
      ? (listing as any).seller_id
      : isUuid((listing as any)?.user_id)
        ? (listing as any).user_id
        : ""
    if (!sellerId) return ""

    const { data: profile } = await supabase
      .from("profiles")
      .select("collection_postcode,collection_full_address,collection_city,location")
      .eq("id", sellerId)
      .maybeSingle()

    return resolveFullUkPostcode(
      (profile as any)?.collection_postcode,
      (profile as any)?.collection_full_address,
      (profile as any)?.collection_city,
      (profile as any)?.location
    )
  } catch (error) {
    console.warn("Could not resolve delivery collection postcode:", error)
    return ""
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      collectionPostcode,
      deliveryPostcode,
      listingId,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      tailLiftRequired,
      palletCount,
      insuranceValue,
    } = body

    const fullCollectionPostcode =
      resolveFullUkPostcode(collectionPostcode) || (await resolveListingCollectionPostcode(listingId))
    const fullDeliveryPostcode = resolveFullUkPostcode(deliveryPostcode)

    if (!fullCollectionPostcode) {
      return NextResponse.json(
        { error: "Full collection postcode is required" },
        { status: 400 }
      )
    }

    if (!fullDeliveryPostcode) {
      return NextResponse.json(
        { error: "Full delivery postcode is required" },
        { status: 400 }
      )
    }

    const weight = Number(weightKg || 0)
    const length = Number(lengthCm || 0)
    const width = Number(widthCm || 0)
    const height = Number(heightCm || 0)

    if (weight <= 0 || length <= 0 || width <= 0 || height <= 0) {
      return NextResponse.json(
        { error: "Seller must provide checked weight and dimensions before delivery can be quoted" },
        { status: 400 }
      )
    }

    const pallets = Math.max(1, Number(palletCount || 1))
    const insurance = Number(insuranceValue || 0)
    let base = 78

    if (weight > 150) base += 15
    if (weight > 300) base += 45
    if (tailLiftRequired) base += 25
    if (pallets > 1) base += (pallets - 1) * 42
    if (insurance > 1000) base += 12

    // Real Interparcel quote API wiring belongs here later. Keep this structure stable
    // so the UI and checkout can swap preview estimates for live courier quotes.
    const quotes: CaterBidsDeliveryOption[] = [
      {
        id: "economy-pallet",
        name: "Economy Pallet",
        price: base,
        eta: "3-5 working days",
        description: "Delivery estimate. Final Interparcel booking confirmed after payment.",
        recommended: true,
      },
      {
        id: "express-pallet",
        name: "Express Pallet",
        price: Math.max(base + 34, 127 + (weight > 150 ? 20 : 0) + (tailLiftRequired ? 30 : 0)),
        eta: "1-2 working days",
        description: "Faster Interparcel pallet estimate. Final booking confirmed after payment.",
        recommended: false,
      },
      {
        id: "timed-pallet",
        name: "Timed Pallet",
        price: Math.max(base + 97, 190 + (weight > 200 ? 40 : 0)),
        eta: "Delivery window / premium service",
        description: "Premium Interparcel pallet estimate with a timed delivery window.",
        recommended: false,
      },
    ]

    return NextResponse.json({
      success: true,
      provider: "Interparcel",
      mode: "test_booking_ready",
      bookingReady: true,
      interparcelReady: true,
      collectionPostcode: fullCollectionPostcode,
      deliveryPostcode: fullDeliveryPostcode,
      package: {
        weightKg: weight,
        lengthCm: length,
        widthCm: width,
        heightCm: height,
        palletCount: pallets,
      },
      quotes,
    })
  } catch {
    return NextResponse.json(
      { error: "Unable to calculate delivery quote" },
      { status: 500 }
    )
  }
}
