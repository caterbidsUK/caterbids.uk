import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { validateDeliveryBooking } from "@/lib/delivery/validateDeliveryBooking"
import type { Database } from "@/types/supabase"

export const runtime = "nodejs"
type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"]

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

    const bookingReference = `TEST-IP-${String(order.id).slice(0, 8)}`
    const trackingNumber = `IPTEST${Date.now()}`
    const localMockMode = process.env.NODE_ENV !== "production" || process.env.INTERPARCEL_MOCK_BOOKING === "true"

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        delivery_status: localMockMode ? "booked" : "awaiting_booking",
        delivery_provider: "Interparcel",
        delivery_booking_reference: localMockMode ? bookingReference : order.delivery_booking_reference || null,
        delivery_tracking_number: localMockMode ? trackingNumber : order.delivery_tracking_number || null,
        updated_at: new Date().toISOString(),
      } satisfies OrderUpdate)
      .eq("id", order.id)
      .select("*")
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      booked: localMockMode,
      mode: localMockMode ? "local_mock" : "live_not_connected",
      status: updatedOrder.delivery_status,
      booking_reference: localMockMode ? bookingReference : updatedOrder.delivery_booking_reference,
      tracking_number: localMockMode ? trackingNumber : updatedOrder.delivery_tracking_number,
      order: updatedOrder,
      message:
        localMockMode
          ? "Local mock Interparcel booking created."
          : "Delivery request is ready. No courier booking has been made because the real Interparcel booking API is not connected.",
    })
  } catch (error) {
    console.error("Interparcel booking failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Interparcel booking failed" },
      { status: 500 }
    )
  }
}
