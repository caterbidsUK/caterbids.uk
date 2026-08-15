import "server-only"

import nodemailer from "nodemailer"

export const DEFAULT_EMAIL_FROM = "CaterBidsUK <caterbidsuk@gmail.com>"

export const EMAIL_SETUP_MESSAGE =
  "Email sending is not configured yet. Add RESEND_API_KEY and EMAIL_FROM=CaterBidsUK <caterbidsuk@gmail.com>, or set EMAIL_PROVIDER=gmail with GMAIL_USER and GMAIL_APP_PASSWORD, then try again."

const SAFE_SEND_ERROR = "We could not send the login email. Please try again."

type SendEmailInput = {
  to: string | string[]
  subject: string
  text: string
  html?: string
  from?: string
}

type SendEmailResult =
  | { ok: true; provider: "gmail" | "resend"; error: null }
  | { ok: false; provider: "gmail" | "resend" | "none"; status: "failed" | "not_configured"; error: string }

function envValue(name: string) {
  return (process.env[name] || "").trim().replace(/^["']|["']$/g, "")
}

function secretEnvValue(name: string) {
  return envValue(name).replace(/\s+/g, "")
}

function formatProviderError(error: unknown, fallback = SAFE_SEND_ERROR) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : ""
  return process.env.NODE_ENV === "development" && message ? message : fallback
}

export function configuredEmailFrom() {
  return envValue("EMAIL_FROM") || envValue("FROM_EMAIL") || DEFAULT_EMAIL_FROM
}

function missingGmailConfig() {
  const missing: string[] = []
  if (envValue("EMAIL_PROVIDER").toLowerCase() !== "gmail") missing.push("EMAIL_PROVIDER")
  if (!envValue("GMAIL_USER")) missing.push("GMAIL_USER")
  if (!secretEnvValue("GMAIL_APP_PASSWORD")) missing.push("GMAIL_APP_PASSWORD")
  return missing
}

function debugEmailConfig(provider: SendEmailResult["provider"], missing: string[] = []) {
  if (process.env.NODE_ENV !== "development") return

  console.info("CaterBids email config:", {
    "EMAIL_PROVIDER exists": Boolean(envValue("EMAIL_PROVIDER")),
    "GMAIL_USER exists": Boolean(envValue("GMAIL_USER")),
    "GMAIL_APP_PASSWORD exists": Boolean(secretEnvValue("GMAIL_APP_PASSWORD")),
    "EMAIL_FROM exists": Boolean(envValue("EMAIL_FROM")),
    "RESEND_API_KEY exists": Boolean(secretEnvValue("RESEND_API_KEY")),
    "Using email provider": provider,
    ...(missing.length ? { missing } : {}),
  })
}

async function sendWithGmail(input: SendEmailInput, from: string): Promise<SendEmailResult> {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: envValue("GMAIL_USER"),
        pass: secretEnvValue("GMAIL_APP_PASSWORD"),
      },
    })

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    })

    return { ok: true, provider: "gmail", error: null }
  } catch (error) {
    console.error("[sendEmail] Gmail SMTP error:", error)
    return {
      ok: false,
      provider: "gmail",
      status: "failed",
      error: formatProviderError(error),
    }
  }
}

async function sendWithResend(input: SendEmailInput, from: string): Promise<SendEmailResult> {
  const apiKey = secretEnvValue("RESEND_API_KEY")

  if (from.toLowerCase().includes("@gmail.com")) {
    console.warn(
      "Resend may require a verified sender/domain. If caterbidsuk@gmail.com is rejected by Resend, use Gmail SMTP for development email testing."
    )
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error("[sendEmail] Resend rejected the request:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        from,
        to: input.to,
      })
      return {
        ok: false,
        provider: "resend",
        status: "failed",
        error: formatProviderError(errorText || response.statusText),
      }
    }

    return { ok: true, provider: "resend", error: null }
  } catch (error) {
    console.error("[sendEmail] Resend fetch error:", error)
    return {
      ok: false,
      provider: "resend",
      status: "failed",
      error: formatProviderError(error),
    }
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = input.from || configuredEmailFrom()
  const gmailMissing = missingGmailConfig()

  if (gmailMissing.length === 0) {
    debugEmailConfig("gmail")
    return sendWithGmail(input, from)
  }

  if (secretEnvValue("RESEND_API_KEY")) {
    debugEmailConfig("resend", gmailMissing)
    return sendWithResend(input, from)
  }

  debugEmailConfig("none", gmailMissing)
  console.error("[sendEmail] No email provider configured. Missing env vars:", gmailMissing)

  return {
    ok: false,
    provider: "none",
    status: "not_configured",
    error: gmailMissing.length
      ? `Email sending is not configured. Missing: ${gmailMissing.join(", ")}.`
      : EMAIL_SETUP_MESSAGE,
  }
}
