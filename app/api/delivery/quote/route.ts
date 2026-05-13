import { NextRequest, NextResponse } from "next/server"
import type { CaterBidsDeliveryOption } from "@/lib/delivery/options"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      collectionPostcode,
      deliveryPostcode,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      tailLiftRequired,
      palletCount,
      insuranceValue,
    } = body

    if (!collectionPostcode) {
      return NextResponse.json(
        { error: "Collection postcode is required" },
        { status: 400 }
      )
    }

    if (!deliveryPostcode) {
      return NextResponse.json(
        { error: "Delivery postcode is required" },
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
        description: "Interparcel-ready UK pallet freight estimate",
        recommended: true,
      },
      {
        id: "express-freight",
        name: "Express Freight",
        price: Math.max(base + 34, 127 + (weight > 150 ? 20 : 0) + (tailLiftRequired ? 30 : 0)),
        eta: "1-2 working days",
        description: "Faster Interparcel-ready freight estimate",
        recommended: false,
      },
      {
        id: "specialist-2-man",
        name: "2-Man / Specialist Delivery",
        price: Math.max(base + 97, 190 + (weight > 200 ? 40 : 0)),
        eta: "2-5 working days",
        description: "For awkward, heavy or non-palletised catering equipment",
        recommended: false,
      },
    ]

    return NextResponse.json({
      success: true,
      provider: "Interparcel-ready CaterBids Delivery",
      mode: "test_booking_ready",
      bookingReady: true,
      interparcelReady: true,
      collectionPostcode,
      deliveryPostcode,
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
