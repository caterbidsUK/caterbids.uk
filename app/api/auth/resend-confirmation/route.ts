import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function safeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/account"
  }

  return value
}

function normalizeOrigin(origin: string) {
  return origin.replace("0.0.0.0", "localhost").replace(/\/$/, "")
}

function safeRedirectTo(request: NextRequest, bodyRedirectTo: unknown, nextPath: string) {
  const requestOrigin = normalizeOrigin(request.nextUrl.origin)
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  const localOrigin = requestOrigin.match(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/)

  if (typeof bodyRedirectTo === "string") {
    try {
      const redirectUrl = new URL(bodyRedirectTo)
      const normalizedRedirectOrigin = normalizeOrigin(redirectUrl.origin)
      const normalizedConfiguredOrigin = configuredOrigin ? normalizeOrigin(configuredOrigin) : ""
      const redirectIsLocal = normalizedRedirectOrigin.match(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/)

      if (redirectIsLocal || normalizedRedirectOrigin === normalizedConfiguredOrigin) {
        return `${normalizedRedirectOrigin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      }
    } catch {
      // Fall back to a safe generated redirect.
    }
  }

  const origin = localOrigin || !configuredOrigin ? requestOrigin : configuredOrigin
  return `${normalizeOrigin(origin)}/auth/callback?next=${encodeURIComponent(nextPath)}`
}

function emailLooksValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function resendErrorMessage(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : String(error || "")
  const lower = message.toLowerCase()

  if (lower.includes("rate") || lower.includes("too many") || lower.includes("security purposes")) {
    return "Supabase is rate limiting confirmation emails for this address. Please wait a few minutes, then try again."
  }

  if (lower.includes("email rate limit exceeded")) {
    return "Supabase email rate limit exceeded. Please wait before requesting another confirmation email."
  }

  if (lower.includes("not found") || lower.includes("user")) {
    return "No unconfirmed account was found for that email address. Try creating the account again or log in if it is already confirmed."
  }

  if (lower.includes("redirect") || lower.includes("not allowed")) {
    return "The confirmation redirect URL is not allowed in Supabase. Add this site URL to Supabase Auth redirect URLs, then resend."
  }

  return message || "Supabase could not send the confirmation email."
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const nextPath = safeNextPath(body.next)

  if (!email || !emailLooksValid(email)) {
    return NextResponse.json({ error: "Add a valid email address." }, { status: 400 })
  }

  const supabase = await createClient()
  const emailRedirectTo = safeRedirectTo(request, body.redirectTo, nextPath)

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo,
    },
  })

  if (error) {
    console.error("Supabase confirmation resend failed", {
      status: error.status,
      code: error.code,
      message: error.message,
      emailRedirectTo,
    })

    return NextResponse.json(
      {
        error: resendErrorMessage(error),
        supabaseStatus: error.status,
        supabaseCode: error.code,
      },
      { status: error.status || 400 },
    )
  }

  return NextResponse.json({
    success: true,
    message: "Confirmation email requested again. Check your inbox, spam folder and Gmail Promotions tab.",
    emailRedirectTo,
  })
}
