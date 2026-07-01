import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/sendEmail"

export const runtime = "nodejs"

const sendLimits = new Map<string, { sentAt: number[] }>()
const ONE_HOUR = 60 * 60 * 1000
const MAX_SENDS_PER_HOUR = 5

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function safeNextPath(value: unknown) {
  const next = typeof value === "string" ? value.trim() : ""
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/account"
  return next
}

function appOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (configured) return configured
  const origin = request.headers.get("origin") || request.nextUrl.origin
  return origin.replace("0.0.0.0", "localhost")
}

function authRedirectUrl(request: NextRequest, nextPath: string, provided?: unknown) {
  const providedUrl = typeof provided === "string" ? provided.trim() : ""
  if (providedUrl.startsWith("http://") || providedUrl.startsWith("https://")) return providedUrl
  return `${appOrigin(request)}/auth/callback?next=${encodeURIComponent(nextPath)}`
}

function requestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") || ""
  return forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
}

function rateLimit(key: string) {
  const now = Date.now()
  const sentAt = (sendLimits.get(key)?.sentAt || []).filter((time) => now - time < ONE_HOUR)
  if (sentAt.length >= MAX_SENDS_PER_HOUR) {
    return "Too many login emails sent. Please wait and try again."
  }

  sentAt.push(now)
  sendLimits.set(key, { sentAt })
  return null
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

async function sendLoginEmail({
  email,
  otp,
  actionLink,
}: {
  email: string
  otp?: string | null
  actionLink?: string | null
}) {
  const safeOtp = otp ? htmlEscape(otp) : ""
  const safeActionLink = actionLink ? htmlEscape(actionLink) : ""
  const text = [
    "Your CaterBidsUK login code",
    "",
    "Use this code to sign in to CaterBidsUK.",
    safeOtp ? `Code: ${otp}` : "Use the secure login link below.",
    actionLink ? `Magic login link: ${actionLink}` : "",
    "",
    "If you did not request this, you can ignore this email.",
  ].filter(Boolean).join("\n")

  const html = `
    <div style="margin:0;padding:0;background:#002E5D;font-family:Arial,sans-serif;color:#001A35">
      <div style="max-width:560px;margin:0 auto;padding:32px 20px">
        <div style="background:#fff;border-radius:24px;padding:28px;border:1px solid rgba(255,255,255,.16)">
          <h1 style="margin:0;color:#002E5D;font-size:28px;font-weight:900">Cater<span style="color:#FF6B00">Bids</span>UK</h1>
          <p style="margin:6px 0 24px;color:#FF6B00;font-weight:900;letter-spacing:3px">BUY • SELL • SAVE</p>
          <h2 style="margin:0 0 12px;color:#002E5D;font-size:22px">Your login code</h2>
          <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.6">Use this code to sign in to CaterBidsUK.</p>
          ${safeOtp ? `<div style="font-size:34px;font-weight:900;letter-spacing:8px;color:#FF6B00;background:#F3F8FF;border-radius:18px;padding:18px 20px;text-align:center">${safeOtp}</div>` : ""}
          ${safeActionLink ? `<p style="margin:22px 0 0"><a href="${safeActionLink}" style="display:inline-block;background:#FF6B00;color:#fff;text-decoration:none;border-radius:16px;padding:14px 20px;font-weight:900">Sign in securely</a></p>` : ""}
          <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.5">This login email was requested for CaterBidsUK. If you did not request this, you can ignore this email.</p>
        </div>
      </div>
    </div>`

  return sendEmail({
    to: email,
    subject: "Your CaterBidsUK login code",
    text,
    html,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = cleanEmail(body.email)
  const next = safeNextPath(body.next)
  const redirectTo = authRedirectUrl(request, next, body.redirectTo)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const limited = rateLimit(`${email}:${requestIp(request)}`)
  if (limited) {
    return NextResponse.json({ error: limited }, { status: 429 })
  }

  let generated
  try {
    const admin = createAdminClient()
    generated = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    })
  } catch (error) {
    console.error("Could not create CaterBidsUK login link:", error)
    return NextResponse.json(
      { error: "Could not create a login code. Please try again." },
      { status: 500 }
    )
  }

  if (generated.error) {
    return NextResponse.json(
      { error: generated.error.message || "Could not create a login code. Please try again." },
      { status: 400 }
    )
  }

  const properties = generated.data.properties as {
    action_link?: string | null
    email_otp?: string | null
    hashed_token?: string | null
  } | null
  const otp = properties?.email_otp || null
  const actionLink = properties?.action_link || null

  const emailResult = await sendLoginEmail({ email, otp, actionLink })
  if (!emailResult.ok) {
    return NextResponse.json({ error: emailResult.error || "Could not send login email." }, { status: 503 })
  }

  return NextResponse.json({
    ok: true,
    message: "Check your email for your CaterBidsUK login code.",
    email,
  })
}
