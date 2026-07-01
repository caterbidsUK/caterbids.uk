import { NextRequest, NextResponse } from "next/server"
import { isProtectedSuperAdminEmail } from "@/lib/admin-access"
import { createClient } from "@/lib/supabase/server"
import { providerFromUser, syncVerifiedAuthProfile } from "@/lib/auth/syncProfile"

export const dynamic = "force-dynamic"

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account"
  }

  return value
}

function redirectWithNoStore(url: string) {
  const response = NextResponse.redirect(url)
  response.headers.set("Cache-Control", "no-store")
  return response
}

function loginErrorRedirect(origin: string, next: string) {
  return redirectWithNoStore(`${origin}/login?error=auth_callback_failed&next=${encodeURIComponent(next)}#_`)
}

function logCallbackError(message: string, details: Record<string, unknown>) {
  console.error(`CaterBidsUK auth callback: ${message}`, details)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const requestedNext = searchParams.get("next")
  let next = safeNext(requestedNext)
  const providerError = searchParams.get("error")
  const providerErrorCode = searchParams.get("error_code")
  const providerErrorDescription = searchParams.get("error_description")

  if (providerError || providerErrorCode || providerErrorDescription) {
    logCallbackError("OAuth provider returned an error before token exchange", {
      providerError,
      providerErrorCode,
      providerErrorDescription,
      next,
    })
    return loginErrorRedirect(origin, next)
  }

  if (!code) {
    logCallbackError("Missing code parameter", {
      next,
      searchParams: Object.fromEntries(searchParams.entries()),
    })
    return loginErrorRedirect(origin, next)
  }

  const supabase = await createClient()
  const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    logCallbackError("exchangeCodeForSession failed", {
      message: exchangeError.message,
      name: exchangeError.name,
      status: "status" in exchangeError ? exchangeError.status : undefined,
      code: "code" in exchangeError ? exchangeError.code : undefined,
      next,
    })
    return loginErrorRedirect(origin, next)
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  const sessionUser = user || exchangeData.user || exchangeData.session?.user || null

  if (userError) {
    logCallbackError("Session exchanged but getUser failed", {
      message: userError.message,
      name: userError.name,
      status: "status" in userError ? userError.status : undefined,
      code: "code" in userError ? userError.code : undefined,
      hasSessionUser: Boolean(sessionUser),
    })
  }

  if (!sessionUser) {
    logCallbackError("Session exchanged but no user was returned", { next })
    return loginErrorRedirect(origin, next)
  }

  if (!requestedNext && isProtectedSuperAdminEmail(sessionUser.email)) {
    next = "/admin"
  }

  try {
    await syncVerifiedAuthProfile({
      supabase,
      user: sessionUser,
      provider: providerFromUser(sessionUser, "email"),
      request,
    })
  } catch (syncError) {
    logCallbackError("Profile sync failed after OAuth login", {
      message: syncError instanceof Error ? syncError.message : String(syncError),
      userId: sessionUser.id,
    })
  }

  return redirectWithNoStore(`${origin}${next}`)
}
