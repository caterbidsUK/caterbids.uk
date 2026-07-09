import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  let body: { action?: string; listingId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { action, listingId } = body
  if (!listingId || !action || !["apply", "move", "remove"].includes(action)) {
    return NextResponse.json({ error: "action and listingId are required" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Server-side re-check: founding member status (never trust client)
  const { data: profile } = await admin
    .from("profiles")
    .select("is_founding_member")
    .eq("id", user.id)
    .maybeSingle()

  if (!(profile as any)?.is_founding_member) {
    return NextResponse.json({ error: "Not a founding member" }, { status: 403 })
  }

  // Server-side re-check: ownership of the target listing
  const { data: targetListing } = await admin
    .from("listings")
    .select("id, user_id, featured_type")
    .eq("id", listingId)
    .maybeSingle()

  if (!targetListing || (targetListing as any).user_id !== user.id) {
    return NextResponse.json({ error: "Listing not found or not yours" }, { status: 403 })
  }

  if (action === "remove") {
    if ((targetListing as any).featured_type !== "founding_free") {
      return NextResponse.json({ error: "This listing is not using the founding free slot" }, { status: 400 })
    }
    const { error } = await admin
      .from("listings")
      .update({ featured: false, featured_type: null } as never)
      .eq("id", listingId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // apply or move: re-check whether the slot is already in use
  const { data: existingSlot } = await admin
    .from("listings")
    .select("id")
    .eq("user_id", user.id)
    .eq("featured_type", "founding_free")
    .maybeSingle()

  if (action === "apply") {
    if (existingSlot) {
      return NextResponse.json(
        { error: "Your founding free slot is already in use on another listing" },
        { status: 409 },
      )
    }
    const { error } = await admin
      .from("listings")
      .update({
        featured: true,
        featured_type: "founding_free",
        featured_at: new Date().toISOString(),
      } as never)
      .eq("id", listingId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // action === "move": unfeature the old slot (if different listing), then feature this one
  if (existingSlot && existingSlot.id !== listingId) {
    const { error: unfeatureErr } = await admin
      .from("listings")
      .update({ featured: false, featured_type: null } as never)
      .eq("id", existingSlot.id)
    if (unfeatureErr) return NextResponse.json({ error: unfeatureErr.message }, { status: 500 })
  }

  const { error } = await admin
    .from("listings")
    .update({
      featured: true,
      featured_type: "founding_free",
      featured_at: new Date().toISOString(),
    } as never)
    .eq("id", listingId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
