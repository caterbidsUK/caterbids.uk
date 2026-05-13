import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { validateDeliveryBooking } from "@/lib/delivery/validateDeliveryBooking"

export const runtime = "nodejs"

function isUuid(value: string | undefined | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

export async function POST(req: NextRequest) {
  try {
    const { orderId } = (await req.json()) as { orderId?: string }

    if (!isUuid(orderId)) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 })
    }

    const userClient = await createClient()
    const {
      data: { user },
    } = await userClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Please log in before booking delivery." }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle()

    if (orderError) {
      throw orderError
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.buyer_id !== user.id && order.seller_id !== user.id) {
      return NextResponse.json({ error: "You cannot book delivery for this order." }, { status: 403 })
    }

    if (!order.delivery_booking_required || Number(order.delivery_price || 0) <= 0) {
      return NextResponse.json({
        success: true,
        booked: false,
        status: "not_required",
        message: "This order does not require CaterBids delivery booking.",
      })
    }

    const validation = validateDeliveryBooking(order)
    if (!validation.ready) {
      return NextResponse.json(
        {
          success: false,
          status: "awaiting_details",
          error: "Delivery is not ready to book yet.",
          missingFields: validation.missingFields,
        },
        { status: 400 }
      )
    }

    const hasLiveInterparcelConfig =
      Boolean(process.env.INTERPARCEL_API_KEY) && Boolean(process.env.INTERPARCEL_API_BASE_URL)

    if (!hasLiveInterparcelConfig) {
      return NextResponse.json({
        success: true,
        booked: false,
        status: "awaiting_booking",
        message:
          "Interparcel API key missing. Delivery data is ready, but no final courier booking has been made.",
      })
    }

    const suffix = order.id.slice(0, 8).toUpperCase()
    // TODO: Replace this placeholder with the confirmed Interparcel booking endpoint payload.
    const bookingReference = `IP-PENDING-${suffix}`
    const trackingNumber = `IP${Date.now()}`

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        delivery_status: "booked",
        delivery_provider: "Interparcel",
        delivery_booking_reference: bookingReference,
        delivery_tracking_number: trackingNumber,
        delivery_label_url: null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", order.id)
      .select("*")
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      booked: true,
      mode: "live_placeholder",
      order: updatedOrder,
      booking: {
        provider: "Interparcel",
        bookingReference,
        trackingNumber,
        labelUrl: null,
      },
    })
  } catch (error) {
    console.error("Interparcel booking failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Interparcel booking failed" },
      { status: 500 }
    )
  }
}
