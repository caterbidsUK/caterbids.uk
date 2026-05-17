import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { runEquipmentSpecPipeline } from "@/lib/equipment-specs/pipeline"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Please log in before checking specs." }, { status: 401 })
    }

    const listingId = String(body.listingId || "")
    if (!listingId) {
      return NextResponse.json({ error: "Missing listing ID." }, { status: 400 })
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id,user_id,seller_id,title")
      .eq("id", listingId)
      .maybeSingle()

    if (listingError) throw listingError
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 })
    }
    if (listing.user_id !== user.id && listing.seller_id !== user.id) {
      return NextResponse.json({ error: "You can only verify specs for your own listings." }, { status: 403 })
    }

    const result = await runEquipmentSpecPipeline(createAdminClient(), {
      ...body,
      listingId,
      sellerId: user.id,
      listingTitle: body.listingTitle || listing.title,
    })

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Equipment spec analysis failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Equipment spec analysis failed." },
      { status: 500 }
    )
  }
}
