import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      equipmentSpecId?: string
      listingId?: string
      reason?: string
      details?: string
    }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Please log in before reporting specs." }, { status: 401 })
    }

    if (!body.equipmentSpecId && !body.listingId) {
      return NextResponse.json({ error: "Missing spec or listing ID." }, { status: 400 })
    }

    const { error } = await supabase.from("equipment_spec_reports").insert({
      equipment_spec_id: body.equipmentSpecId || null,
      listing_id: body.listingId || null,
      reporter_id: user.id,
      reason: body.reason || "incorrect_specs",
      details: body.details || null,
      status: "open",
    })

    if (error) throw error

    if (body.listingId) {
      await supabase
        .from("listing_equipment_specs")
        .update({
          verification_status: "reported",
          reported_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("listing_id", body.listingId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Equipment spec report failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not report specs." },
      { status: 500 }
    )
  }
}
