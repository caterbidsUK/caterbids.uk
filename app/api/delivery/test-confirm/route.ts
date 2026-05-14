import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isLocalCourierTestMode, simulateCourierConfirmation } from "@/lib/delivery/deliveryOrders"

export const runtime = "nodejs"

function isUuid(value: string | undefined | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

export async function POST(req: NextRequest) {
  try {
    if (!isLocalCourierTestMode()) {
      return NextResponse.json(
        { error: "Test courier confirmation is disabled in production." },
        { status: 403 }
      )
    }

    const { orderId, deliveryOrderId } = (await req.json()) as {
      orderId?: string
      deliveryOrderId?: string
    }

    if (!isUuid(orderId) && !isUuid(deliveryOrderId)) {
      return NextResponse.json({ error: "Missing delivery order ID" }, { status: 400 })
    }

    const userClient = await createClient()
    const {
      data: { user },
    } = await userClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Please log in before confirming delivery." }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    let query = supabaseAdmin.from("delivery_orders").select("*")

    if (isUuid(deliveryOrderId)) {
      query = query.eq("id", deliveryOrderId)
    } else {
      query = query.eq("order_id", orderId || "")
    }

    const { data: deliveryOrder, error: deliveryOrderError } = await query.maybeSingle()

    if (deliveryOrderError) {
      throw deliveryOrderError
    }

    if (!deliveryOrder) {
      return NextResponse.json({ error: "Delivery order not found" }, { status: 404 })
    }

    if (deliveryOrder.buyer_id !== user.id && deliveryOrder.seller_id !== user.id) {
      return NextResponse.json({ error: "You cannot update this delivery order." }, { status: 403 })
    }

    const { data: confirmed, error: confirmError } = await simulateCourierConfirmation(
      supabaseAdmin,
      deliveryOrder.id
    )

    if (confirmError) {
      throw confirmError
    }

    if (deliveryOrder.order_id) {
      await supabaseAdmin
        .from("orders")
        .update({
          delivery_status: "courier_confirmed",
          delivery_provider: "Interparcel Test Courier",
          delivery_booking_reference: "TEST-REFERENCE",
          delivery_tracking_number: "TEST-TRACKING-NUMBER",
          delivery_tracking_url: "#",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", deliveryOrder.order_id)
    }

    return NextResponse.json({
      success: true,
      confirmed: true,
      mode: "test",
      deliveryOrder: confirmed,
      message: "Test courier confirmation saved. This is not a real courier booking.",
    })
  } catch (error) {
    console.error("Test courier confirmation failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test courier confirmation failed" },
      { status: 500 }
    )
  }
}
