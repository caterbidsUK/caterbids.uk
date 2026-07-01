import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createClient } from "@/lib/supabase/server"
import { normaliseUkMobile } from "@/lib/verification/phoneVerification"

export const runtime = "nodejs"

function isMissingColumn(error: unknown) {
  if (!error || typeof error !== "object") return false
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : ""
  const code = "code" in error && typeof error.code === "string" ? error.code : ""
  return code === "PGRST204" || message.includes("schema cache") || message.includes("column") || message.includes("could not find")
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to save your mobile number." }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const phoneResult = normaliseUkMobile(body.phone_number || body.phone)

  if (!phoneResult.ok) {
    return NextResponse.json({ ok: false, error: phoneResult.error }, { status: 400 })
  }

  const now = new Date().toISOString()
  const admin = createAdminClient()
  const fullUpdate = await admin
    .from("profiles")
    .update({
      phone: phoneResult.phone,
      phone_number: phoneResult.phone,
      phone_verified: false,
      is_phone_verified: false,
      phone_verified_at: null,
      phone_verification_method: "manual",
      phone_verification_status: "pending",
      phone_verification_code: null,
      phone_verification_expires_at: null,
      phone_verification_attempts: 0,
      updated_at: now,
    })
    .eq("id", user.id)

  if (fullUpdate.error) {
    if (!isMissingColumn(fullUpdate.error)) {
      return NextResponse.json({ ok: false, error: fullUpdate.error.message }, { status: 500 })
    }

    const fallbackUpdate = await admin
      .from("profiles")
      .update({
        phone: phoneResult.phone,
        phone_number: phoneResult.phone,
        phone_verified: false,
        is_phone_verified: false,
        phone_verified_at: null,
        updated_at: now,
      })
      .eq("id", user.id)

    if (fallbackUpdate.error) {
      return NextResponse.json({ ok: false, error: fallbackUpdate.error.message }, { status: 500 })
    }
  }

  await admin.from("user_verifications" as never).upsert(
    {
      user_id: user.id,
      phone: phoneResult.phone,
      phone_verified: false,
      updated_at: now,
    } as never,
    { onConflict: "user_id" }
  )

  return NextResponse.json({
    ok: true,
    phone: phoneResult.phone,
    phoneVerified: false,
    phoneVerificationMethod: "manual",
    phoneVerificationStatus: "pending",
    message: "Phone verification is reviewed manually during launch.",
  })
}
