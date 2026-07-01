import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createClient } from "@/lib/supabase/server"
import {
  MAX_PHONE_VERIFY_ATTEMPTS,
  PHONE_CODE_TTL_MS,
  cachePhoneCode,
  checkPhoneSendRateLimit,
  cleanPhoneCode,
  clearCachedPhoneCode,
  comparePhoneCodeHash,
  generatePhoneCode,
  getCachedPhoneCode,
  getSmsConfig,
  hashPhoneCode,
  incrementCachedPhoneAttempt,
  logSmsConfigDebug,
  normaliseUkMobile,
  sendTwilioSms,
} from "@/lib/verification/phoneVerification"

type ProfileCodeState = {
  codeHash: string | null
  expiresAt: string | null
  attempts: number
  hasCodeColumns: boolean
  emailVerified: boolean
}

function isMissingColumn(error: unknown) {
  if (!error || typeof error !== "object") return false
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : ""
  const code = "code" in error && typeof error.code === "string" ? error.code : ""
  return code === "PGRST204" || message.includes("schema cache") || message.includes("column") || message.includes("could not find")
}

function safeProviderError(error: unknown) {
  if (process.env.NODE_ENV === "development" && error instanceof Error) return error.message
  return "We could not send the SMS code. Please try again."
}

function emailConfirmed(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, profile?: Record<string, unknown> | null) {
  return Boolean(
    user.email_confirmed_at ||
      (user as typeof user & { confirmed_at?: string | null }).confirmed_at ||
      profile?.email_verified ||
      profile?.verified ||
      profile?.is_email_verified ||
      profile?.verified_user_badge
  )
}

async function updateUserVerificationRow(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  values: Record<string, unknown>
) {
  const { error } = await admin.from("user_verifications" as never).upsert(
    {
      user_id: userId,
      ...values,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id" }
  )

  if (error) {
    console.warn("Could not update user_verifications phone state:", error.message)
  }
}

async function persistPhoneCode(admin: ReturnType<typeof createAdminClient>, userId: string, phone: string, codeHash: string, expiresAt: string) {
  const now = new Date().toISOString()
  const fullUpdate = await admin
    .from("profiles")
    .update({
      phone,
      phone_number: phone,
      phone_verified: false,
      is_phone_verified: false,
      phone_verification_code: codeHash,
      phone_verification_expires_at: expiresAt,
      phone_verification_attempts: 0,
      updated_at: now,
    } as never)
    .eq("id", userId)

  if (!fullUpdate.error) return true

  if (!isMissingColumn(fullUpdate.error)) {
    console.warn("Could not persist phone verification code:", fullUpdate.error.message)
    return false
  }

  const fallbackUpdate = await admin
    .from("profiles")
    .update({
      phone,
      phone_number: phone,
      phone_verified: false,
      is_phone_verified: false,
      updated_at: now,
    } as never)
    .eq("id", userId)

  if (fallbackUpdate.error) {
    console.warn("Could not update profile phone during verification:", fallbackUpdate.error.message)
  }

  return false
}

async function saveManualPhonePending(admin: ReturnType<typeof createAdminClient>, userId: string, phone: string) {
  const now = new Date().toISOString()
  const update = await admin
    .from("profiles")
    .update({
      phone,
      phone_number: phone,
      phone_verified: false,
      is_phone_verified: false,
      phone_verified_at: null,
      phone_verification_method: "manual",
      phone_verification_status: "pending",
      phone_verification_code: null,
      phone_verification_expires_at: null,
      phone_verification_attempts: 0,
      updated_at: now,
    } as never)
    .eq("id", userId)

  if (update.error && isMissingColumn(update.error)) {
    await admin
      .from("profiles")
      .update({
        phone,
        phone_number: phone,
        phone_verified: false,
        is_phone_verified: false,
        phone_verified_at: null,
        updated_at: now,
      } as never)
      .eq("id", userId)
  } else if (update.error) {
    throw new Error(update.error.message)
  }

  await updateUserVerificationRow(admin, userId, {
    phone,
    phone_verified: false,
  })
}

async function loadProfileCodeState(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  phone: string,
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
): Promise<ProfileCodeState> {
  const result = await admin
    .from("profiles")
    .select(
      "phone_verification_code,phone_verification_expires_at,phone_verification_attempts,email_verified,verified,is_email_verified,verified_user_badge"
    )
    .eq("id", userId)
    .maybeSingle()

  const cached = getCachedPhoneCode(userId, phone)

  if (result.error && isMissingColumn(result.error)) {
    return {
      codeHash: cached?.codeHash || null,
      expiresAt: cached?.expiresAt || null,
      attempts: cached?.attempts || 0,
      hasCodeColumns: false,
      emailVerified: emailConfirmed(user, null),
    }
  }

  if (result.error) {
    console.warn("Could not load phone verification code:", result.error.message)
  }

  const profile = (result.data || {}) as Record<string, unknown>
  return {
    codeHash: typeof profile.phone_verification_code === "string" ? profile.phone_verification_code : cached?.codeHash || null,
    expiresAt:
      typeof profile.phone_verification_expires_at === "string"
        ? profile.phone_verification_expires_at
        : cached?.expiresAt || null,
    attempts:
      typeof profile.phone_verification_attempts === "number"
        ? profile.phone_verification_attempts
        : cached?.attempts || 0,
    hasCodeColumns: !result.error,
    emailVerified: emailConfirmed(user, profile),
  }
}

async function incrementProfileAttempts(admin: ReturnType<typeof createAdminClient>, userId: string, attempts: number) {
  const { error } = await admin
    .from("profiles")
    .update({ phone_verification_attempts: attempts } as never)
    .eq("id", userId)

  if (error && !isMissingColumn(error)) {
    console.warn("Could not increment phone verification attempts:", error.message)
  }
}

async function markPhoneVerified(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  phone: string,
  emailVerified: boolean
) {
  const now = new Date().toISOString()
  const update = {
    phone,
    phone_number: phone,
    phone_verified: true,
    is_phone_verified: true,
    phone_verified_at: now,
    phone_verification_code: null,
    phone_verification_expires_at: null,
    phone_verification_attempts: 0,
    email_verified: emailVerified,
    is_email_verified: emailVerified,
    verified: emailVerified,
    verification_level: emailVerified ? "verified" : "phone_verified",
    badge: emailVerified ? "Verified User" : "Phone verified",
    verified_user_badge: emailVerified,
    updated_at: now,
  }

  const result = await admin.from("profiles").update(update as never).eq("id", userId)

  if (!result.error) return

  if (!isMissingColumn(result.error)) {
    throw new Error(result.error.message)
  }

  await admin
    .from("profiles")
    .update({
      phone,
      phone_number: phone,
      phone_verified: true,
      is_phone_verified: true,
      phone_verified_at: now,
      email_verified: emailVerified,
      is_email_verified: emailVerified,
      verified: emailVerified,
      verification_level: emailVerified ? "verified" : "phone_verified",
      badge: emailVerified ? "Verified User" : "Phone verified",
      verified_user_badge: emailVerified,
      updated_at: now,
    } as never)
    .eq("id", userId)
}

export async function handleSendPhoneCode(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    if (!user) {
      return NextResponse.json({ ok: false, error: "Sign in to verify your phone." }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const phoneResult = normaliseUkMobile(body.phone_number || body.phone)

    if (!phoneResult.ok) {
      return NextResponse.json({ ok: false, error: phoneResult.error }, { status: 400 })
    }

    logSmsConfigDebug()
    const smsConfig = getSmsConfig()
    if (!smsConfig.configured) {
      const admin = createAdminClient()
      await saveManualPhonePending(admin, user.id, phoneResult.phone)
      return NextResponse.json({
        ok: true,
        configured: false,
        phone: phoneResult.phone,
        phoneVerified: false,
        phoneVerificationMethod: "manual",
        phoneVerificationStatus: "pending",
        message: "SMS verification is disabled during launch. Manual admin verification is active.",
      })
    }

    const limitMessage = checkPhoneSendRateLimit(user.id)
    if (limitMessage) {
      return NextResponse.json({ ok: false, error: limitMessage }, { status: 429 })
    }

    const code = generatePhoneCode()
    const codeHash = hashPhoneCode(user.id, phoneResult.phone, code)
    const expiresAt = new Date(Date.now() + PHONE_CODE_TTL_MS).toISOString()

    await sendTwilioSms(
      phoneResult.phone,
      `Your CaterBidsUK verification code is ${code}. BUY • SELL • SAVE`
    )

    cachePhoneCode(user.id, phoneResult.phone, codeHash, expiresAt)
    const admin = createAdminClient()
    await persistPhoneCode(admin, user.id, phoneResult.phone, codeHash, expiresAt)
    await updateUserVerificationRow(admin, user.id, {
      phone: phoneResult.phone,
      phone_verified: false,
    })

    return NextResponse.json({
      ok: true,
      phone: phoneResult.phone,
      message: "Verification code sent.",
    })
  } catch (error) {
    console.error("Could not send phone verification code:", error)
    return NextResponse.json({ ok: false, error: safeProviderError(error) }, { status: 502 })
  }
}

export async function handleVerifyPhoneCode(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    if (!user) {
      return NextResponse.json({ ok: false, error: "Sign in to verify your phone." }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const phoneResult = normaliseUkMobile(body.phone_number || body.phone)
    const code = cleanPhoneCode(body.code)

    if (!phoneResult.ok) {
      return NextResponse.json({ ok: false, error: phoneResult.error }, { status: 400 })
    }

    if (code.length !== 6) {
      return NextResponse.json({ ok: false, error: "Phone number and code are required." }, { status: 400 })
    }

    const admin = createAdminClient()
    const codeState = await loadProfileCodeState(admin, user.id, phoneResult.phone, user)

    if (!codeState.codeHash || !codeState.expiresAt || Date.parse(codeState.expiresAt) <= Date.now()) {
      clearCachedPhoneCode(user.id, phoneResult.phone)
      return NextResponse.json({ ok: false, error: "Code expired. Send a new code." }, { status: 400 })
    }

    if (codeState.attempts >= MAX_PHONE_VERIFY_ATTEMPTS) {
      return NextResponse.json({ ok: false, error: "Too many verification attempts. Send a new code." }, { status: 429 })
    }

    const codeHash = hashPhoneCode(user.id, phoneResult.phone, code)
    if (!comparePhoneCodeHash(codeState.codeHash, codeHash)) {
      const attempts = codeState.attempts + 1
      incrementCachedPhoneAttempt(user.id, phoneResult.phone)
      if (codeState.hasCodeColumns) {
        await incrementProfileAttempts(admin, user.id, attempts)
      }
      return NextResponse.json({ ok: false, error: "Incorrect code. Try again." }, { status: 400 })
    }

    await markPhoneVerified(admin, user.id, phoneResult.phone, codeState.emailVerified)
    await updateUserVerificationRow(admin, user.id, {
      phone: phoneResult.phone,
      phone_verified: true,
      phone_verified_at: new Date().toISOString(),
      email_verified: codeState.emailVerified,
    })
    clearCachedPhoneCode(user.id, phoneResult.phone)

    return NextResponse.json({
      ok: true,
      phone: phoneResult.phone,
      phoneVerified: true,
      emailVerified: codeState.emailVerified,
      badge: codeState.emailVerified ? "Verified User" : "Phone verified",
      verificationLevel: codeState.emailVerified ? "verified" : "phone_verified",
      message: "Phone verified.",
    })
  } catch (error) {
    console.error("Could not verify phone code:", error)
    return NextResponse.json({ ok: false, error: "Could not verify code. Please try again." }, { status: 500 })
  }
}
