import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function configuredOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const callbackUrl = `${configuredOrigin()}/auth/callback?next=/account`
  const oauthCallbackUrl = `${configuredOrigin()}/auth/callback`
  const projectRef = supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1] || ""

  return NextResponse.json({
    ok: Boolean(supabaseUrl && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseUrl,
    projectRef,
    siteUrl: configuredOrigin(),
    googleRedirectTo: oauthCallbackUrl,
    magicLinkRedirectTo: callbackUrl,
    supabaseGoogleCallbackRequiredInGoogleCloud: projectRef
      ? `https://${projectRef}.supabase.co/auth/v1/callback`
      : "Missing NEXT_PUBLIC_SUPABASE_URL",
    generatedAuthorizeUrl: supabaseUrl
      ? `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(oauthCallbackUrl)}&prompt=select_account`
      : "",
  })
}
