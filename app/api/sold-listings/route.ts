import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("orders")
      .select("listing_id")
      .or("payment_status.eq.paid,order_status.eq.paid")
      .not("listing_id", "is", null)
      .limit(500)

    if (error) {
      console.warn("Sold listing lookup failed:", error.message)
      return NextResponse.json({ listingIds: [] })
    }

    const listingIds = Array.from(
      new Set((data || []).map((order) => String(order.listing_id || "")).filter(Boolean))
    )

    return NextResponse.json({ listingIds })
  } catch (error) {
    console.warn("Sold listing lookup unavailable:", error)
    return NextResponse.json({ listingIds: [] })
  }
}
