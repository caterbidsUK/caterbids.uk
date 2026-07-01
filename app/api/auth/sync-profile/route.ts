import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { providerFromUser, syncVerifiedAuthProfile } from "@/lib/auth/syncProfile"

export const runtime = "nodejs"

function requestedProvider(value: unknown) {
  const provider = typeof value === "string" ? value.toLowerCase() : ""
  if (provider === "google" || provider === "apple" || provider === "facebook" || provider === "email" || provider === "password") {
    return provider
  }
  return undefined
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const provider = requestedProvider(body.provider) || providerFromUser(user)
  const result = await syncVerifiedAuthProfile({
    supabase,
    user,
    provider,
    request,
  })

  return NextResponse.json({
    success: true,
    provider: result.provider,
    emailVerified: result.emailVerified,
    badge: result.emailVerified ? "Verified User" : "Email pending",
  })
}
