import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"

function clean(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    if (!user) {
      return NextResponse.json({ error: "Sign in to report a trust issue." }, { status: 401 })
    }

    const body = await req.json()
    const entityType = clean(body.entityType || body.entity_type, 40)
    const entityId = clean(body.entityId || body.entity_id, 120)
    const flaggedUserId = clean(body.flaggedUserId || body.flagged_user_id, 80)
    const flagType = clean(body.flagType || body.flag_type, 80) || "trust_report"
    const reason = clean(body.reason, 500)
    const severity = Math.max(1, Math.min(5, Number(body.severity || 1)))

    if (!entityType || !reason) {
      return NextResponse.json({ error: "Report type and reason are required." }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("trust_moderation_flags" as any)
      .insert({
        flagged_user_id: flaggedUserId || null,
        reporter_user_id: user.id,
        entity_type: entityType,
        entity_id: entityId || null,
        flag_type: flagType,
        severity,
        reason,
        status: "open",
      })
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json({ flag: data })
  } catch (error) {
    console.error("Could not create trust flag:", error)
    return NextResponse.json({ error: "Could not submit report." }, { status: 500 })
  }
}
