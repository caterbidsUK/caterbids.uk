import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const ALLOWED_PLATFORMS = new Set(["native", "whatsapp", "facebook", "x", "linkedin", "email", "copy"])

function cleanText(value: unknown, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength)
}

function missingSocialShareTable(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String((error as any).message) : ""
  const code = error && typeof error === "object" && "code" in error ? String((error as any).code) : ""
  return code === "42P01" || /social_share_events|schema cache|does not exist/i.test(message)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const listingId = cleanText(body.listingId || body.listing_id, 120)
    const platform = cleanText(body.platform, 40).toLowerCase()
    const sharedUrl = cleanText(body.sharedUrl || body.shared_url, 1000)

    if (!listingId || !platform || !sharedUrl || !ALLOWED_PLATFORMS.has(platform)) {
      return NextResponse.json({ ok: false, error: "Invalid share event." }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from("social_share_events").insert({
      listing_id: isUuid(listingId) ? listingId : null,
      user_id: user?.id || null,
      platform,
      shared_url: sharedUrl,
      metadata: {
        ...(body.metadata && typeof body.metadata === "object" ? body.metadata : {}),
        listing_id: listingId,
      },
    } as any)

    if (error) {
      if (missingSocialShareTable(error)) {
        return NextResponse.json({ ok: false, error: "Share tracking is not configured yet." })
      }
      return NextResponse.json({ ok: false, error: "Could not record share." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "Could not record share." }, { status: 500 })
  }
}
