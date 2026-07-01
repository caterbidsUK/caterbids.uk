import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

function emailConfirmed(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  return Boolean(user.email_confirmed_at || (user as typeof user & { confirmed_at?: string | null }).confirmed_at)
}

async function syncEmailStatus(request?: NextRequest) {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)

  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 })
  }

  const emailVerified = emailConfirmed(user)
  const now = new Date().toISOString()
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("phone_verified,is_phone_verified")
    .eq("id", user.id)
    .maybeSingle()
  const phoneVerified = Boolean(profile?.phone_verified || (profile as any)?.is_phone_verified)
  const badge = emailVerified && phoneVerified ? "Verified User" : emailVerified ? "Email Verified" : "Email pending"
  const verificationLevel = emailVerified && phoneVerified ? "verified" : emailVerified ? "email_verified" : "basic"

  await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email || null,
      email_verified: emailVerified,
      is_email_verified: emailVerified,
      verified: emailVerified,
      verification_level: verificationLevel,
      badge,
      verified_user_badge: emailVerified && phoneVerified,
      updated_at: now,
    } as any,
    { onConflict: "id" }
  )

  await admin.from("user_verifications" as any).upsert(
    {
      user_id: user.id,
      email_verified: emailVerified,
      updated_at: now,
    },
    { onConflict: "user_id" }
  )

  return NextResponse.json({
    ok: true,
    email: user.email || null,
    emailVerified,
    phoneVerified,
    badge,
    verificationLevel,
  })
}

export async function GET(request: NextRequest) {
  return syncEmailStatus(request)
}

export async function POST(request: NextRequest) {
  return syncEmailStatus(request)
}
