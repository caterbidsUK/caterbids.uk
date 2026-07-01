import { createHash, randomInt, timingSafeEqual } from "node:crypto"

export const PHONE_CODE_TTL_MS = 10 * 60 * 1000
export const PHONE_SEND_WINDOW_MS = 15 * 60 * 1000
export const MAX_PHONE_SENDS_PER_WINDOW = 3
export const MAX_PHONE_VERIFY_ATTEMPTS = 5

type CachedCode = {
  codeHash: string
  expiresAt: string
  attempts: number
}

const sendAttempts = new Map<string, number[]>()
const cachedCodes = new Map<string, CachedCode>()

export function normaliseUkMobile(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : ""
  const digits = raw.replace(/\D/g, "")

  let phone: string | null = null
  if (/^07\d{9}$/.test(digits)) phone = `+44${digits.slice(1)}`
  if (/^7\d{9}$/.test(digits)) phone = `+44${digits}`
  if (/^447\d{9}$/.test(digits)) phone = `+${digits}`

  if (phone && /^\+447\d{9}$/.test(phone)) {
    return { ok: true as const, phone }
  }

  return { ok: false as const, error: "Enter a valid UK mobile number." }
}

export function cleanPhoneCode(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, 6) : ""
}

export function generatePhoneCode() {
  return randomInt(100000, 1000000).toString()
}

export function hashPhoneCode(userId: string, phone: string, code: string) {
  const secret =
    process.env.PHONE_VERIFICATION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.TWILIO_AUTH_TOKEN ||
    "caterbids-dev-phone-verification"

  return createHash("sha256").update(`${userId}:${phone}:${code}:${secret}`).digest("hex")
}

export function comparePhoneCodeHash(expectedHash: string, actualHash: string) {
  try {
    return timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(actualHash, "hex"))
  } catch {
    return false
  }
}

function cacheKey(userId: string, phone: string) {
  return `${userId}:${phone}`
}

export function cachePhoneCode(userId: string, phone: string, codeHash: string, expiresAt: string) {
  cachedCodes.set(cacheKey(userId, phone), {
    codeHash,
    expiresAt,
    attempts: 0,
  })
}

export function getCachedPhoneCode(userId: string, phone: string) {
  return cachedCodes.get(cacheKey(userId, phone)) || null
}

export function incrementCachedPhoneAttempt(userId: string, phone: string) {
  const key = cacheKey(userId, phone)
  const current = cachedCodes.get(key)
  if (!current) return 0
  current.attempts += 1
  cachedCodes.set(key, current)
  return current.attempts
}

export function clearCachedPhoneCode(userId: string, phone: string) {
  cachedCodes.delete(cacheKey(userId, phone))
}

export function checkPhoneSendRateLimit(userId: string) {
  const now = Date.now()
  const attempts = (sendAttempts.get(userId) || []).filter((time) => now - time < PHONE_SEND_WINDOW_MS)

  if (attempts.length >= MAX_PHONE_SENDS_PER_WINDOW) {
    return "Too many SMS codes sent. Please try again later."
  }

  attempts.push(now)
  sendAttempts.set(userId, attempts)
  return null
}

export function getSmsConfig() {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase() || ""
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER
  const missing: string[] = []

  if (provider !== "twilio") missing.push("SMS_PROVIDER=twilio")
  if (!accountSid) missing.push("TWILIO_ACCOUNT_SID")
  if (!authToken) missing.push("TWILIO_AUTH_TOKEN")
  if (!fromNumber) missing.push("TWILIO_FROM_NUMBER")

  return {
    provider,
    accountSid,
    authToken,
    fromNumber,
    missing,
    configured: missing.length === 0,
  }
}

export function logSmsConfigDebug() {
  if (process.env.NODE_ENV !== "development") return

  const config = getSmsConfig()
  console.info("CaterBids phone verification SMS config:", {
    SMS_PROVIDER: Boolean(process.env.SMS_PROVIDER),
    TWILIO_ACCOUNT_SID: Boolean(process.env.TWILIO_ACCOUNT_SID),
    TWILIO_AUTH_TOKEN: Boolean(process.env.TWILIO_AUTH_TOKEN),
    TWILIO_FROM_NUMBER: Boolean(process.env.TWILIO_FROM_NUMBER),
    usingProvider: config.configured ? "twilio" : "none",
  })
}

export function missingSmsConfigMessage(missing: string[]) {
  return `SMS sending is not configured. Missing: ${missing.join(" / ")}.`
}

export async function sendTwilioSms(to: string, body: string) {
  const config = getSmsConfig()
  if (!config.configured || !config.accountSid || !config.authToken || !config.fromNumber) {
    throw new Error(missingSmsConfigMessage(config.missing))
  }

  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: config.fromNumber,
        Body: body,
      }),
    }
  )

  const text = await response.text().catch(() => "")
  let payload: { message?: string } = {}
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = {}
  }

  if (!response.ok) {
    throw new Error(payload.message || `Twilio SMS failed with status ${response.status}.`)
  }
}
