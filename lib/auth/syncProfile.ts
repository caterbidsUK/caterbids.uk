import type { SupabaseClient, User } from "@supabase/supabase-js"
import { isProtectedSuperAdminEmail } from "@/lib/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"

type AuthProvider = "google" | "apple" | "facebook" | "email" | "password" | "unknown"
type ExistingProfileTrust = {
  badge?: string | null
  role?: string | null
  account_type?: string | null
  business_name?: string | null
  phone_number?: string | null
  phone_verified_at?: string | null
  phone_verified?: boolean | null
  is_phone_verified?: boolean | null
  verified_user_badge?: boolean | null
  verified_dealer?: boolean | null
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : ""
  const code = "code" in error && typeof error.code === "string" ? error.code : ""
  return (
    code === "PGRST204" ||
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("column") ||
    message.includes("could not find") ||
    message.includes("does not exist")
  )
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message
  }
  return String(error)
}

export function providerFromUser(user: User, fallback: AuthProvider = "unknown"): AuthProvider {
  const provider = String(user.app_metadata?.provider || fallback || "unknown").toLowerCase()
  if (provider === "google" || provider === "apple" || provider === "facebook" || provider === "email" || provider === "password") {
    return provider
  }
  return fallback
}

function displayNameFromUser(user: User) {
  const metadata = user.user_metadata || {}
  return (
    String(metadata.full_name || metadata.name || "").trim() ||
    String(user.email || "").split("@")[0] ||
    "CaterBidsUK user"
  )
}

function avatarFromUser(user: User) {
  const metadata = user.user_metadata || {}
  return String(metadata.avatar_url || metadata.picture || "").trim()
}

function requestIp(request?: Request) {
  const forwardedFor = request?.headers.get("x-forwarded-for") || ""
  return forwardedFor.split(",")[0]?.trim() || request?.headers.get("x-real-ip") || null
}

function requestUserAgent(request?: Request) {
  return request?.headers.get("user-agent") || null
}

function verifiedEmail(user: User, provider: AuthProvider) {
  return Boolean(
    user.email_confirmed_at ||
      (user as User & { confirmed_at?: string | null }).confirmed_at ||
      provider === "google" ||
      provider === "apple" ||
      provider === "facebook"
  )
}

function emailFromUser(user: User) {
  return user.email?.trim().toLowerCase() || null
}

function protectedRoleForUser(user: User, existing?: ExistingProfileTrust | null) {
  const email = emailFromUser(user)
  if (isProtectedSuperAdminEmail(email)) return "super_admin"
  if (existing?.role) return existing.role
  return "user"
}

function accountTypeForUser(existing?: ExistingProfileTrust | null) {
  if (existing?.account_type === "seller") return "seller"
  if (existing?.role === "seller" || existing?.role === "dealer") return "seller"
  return "buyer"
}

function badgeForEmailSync(emailVerified: boolean, existing?: ExistingProfileTrust | null) {
  if (!emailVerified) return existing?.badge || "Email pending"
  if (existing?.phone_verified || existing?.is_phone_verified || existing?.badge === "Trusted User") {
    return "Trusted User"
  }
  return "Verified User"
}

function launchedProfilePayload(user: User, provider: AuthProvider, existing?: ExistingProfileTrust | null) {
  const emailVerified = verifiedEmail(user, provider)
  const now = new Date().toISOString()
  const displayName = displayNameFromUser(user)
  const avatarUrl = avatarFromUser(user)

  return {
    id: user.id,
    email: emailFromUser(user),
    name: displayName,
    full_name: displayName,
    avatar_url: avatarUrl,
    verified: emailVerified,
    email_verified: emailVerified,
    badge: badgeForEmailSync(emailVerified, existing),
    verification_level: "basic",
    verified_user_badge: emailVerified || Boolean(existing?.verified_user_badge),
    role: protectedRoleForUser(user, existing),
    account_type: accountTypeForUser(existing),
    business_name: existing?.business_name || null,
    phone_number: existing?.phone_number || null,
    phone_verified_at: existing?.phone_verified_at || null,
    verified_dealer: Boolean(existing?.verified_dealer),
    is_email_verified: emailVerified,
    auth_provider: provider,
    auth_providers: [provider],
    connected_social_providers: provider === "email" || provider === "password" || provider === "unknown" ? [] : [provider],
    last_login_at: now,
    updated_at: now,
  }
}

function legacyProfilePayload(user: User, provider: AuthProvider, existing?: ExistingProfileTrust | null) {
  const emailVerified = verifiedEmail(user, provider)
  const now = new Date().toISOString()

  return {
    id: user.id,
    email: emailFromUser(user),
    name: displayNameFromUser(user),
    avatar_url: avatarFromUser(user),
    verified: emailVerified,
    email_verified: emailVerified,
    verification_level: "basic",
    badge: badgeForEmailSync(emailVerified, existing),
    role: protectedRoleForUser(user, existing),
    auth_provider: provider,
    auth_providers: [provider],
    connected_social_providers: provider === "email" || provider === "password" || provider === "unknown" ? [] : [provider],
    last_login_at: now,
    updated_at: now,
  }
}

async function upsertProfile(client: SupabaseClient, user: User, provider: AuthProvider) {
  let existingProfile = await client
    .from("profiles")
    .select("badge,role,account_type,business_name,phone_number,phone_verified_at,phone_verified,is_phone_verified,verified_user_badge,verified_dealer")
    .eq("id", user.id)
    .maybeSingle()

  if (existingProfile.error && isMissingColumnError(existingProfile.error)) {
    existingProfile = await client
      .from("profiles")
      .select("badge,role,phone_verified,is_phone_verified,verified_user_badge")
      .eq("id", user.id)
      .maybeSingle()
  }

  const existing = existingProfile.data as ExistingProfileTrust | null
  const payloads = [
    launchedProfilePayload(user, provider, existing),
    legacyProfilePayload(user, provider, existing),
    {
      id: user.id,
      email: emailFromUser(user),
      updated_at: new Date().toISOString(),
    },
  ]

  let lastError: unknown = null
  for (const payload of payloads) {
    const { error } = await client.from("profiles").upsert(payload, { onConflict: "id" })
    if (!error) return null
    lastError = error
    if (!isMissingColumnError(error)) return error
  }

  return lastError
}

async function upsertUserVerification(client: SupabaseClient, user: User, provider: AuthProvider) {
  const emailVerified = verifiedEmail(user, provider)
  const now = new Date().toISOString()
  const existing = await client
    .from("user_verifications")
    .select("email_verified")
    .eq("user_id", user.id)
    .maybeSingle()
  const { error } = await client.from("user_verifications").upsert(
    {
      user_id: user.id,
      email_verified: emailVerified || Boolean((existing.data as { email_verified?: boolean } | null)?.email_verified),
      updated_at: now,
    },
    { onConflict: "user_id" }
  )

  return error
}

async function insertAuditEvent(client: SupabaseClient, user: User, provider: AuthProvider, request?: Request) {
  const basePayload = {
    user_id: user.id,
    provider,
    ip_address: requestIp(request),
    user_agent: requestUserAgent(request),
  }

  const { error } = await client.from("auth_login_events").insert({
    ...basePayload,
    event_type: "login",
  })

  if (error && isMissingColumnError(error)) {
    const retry = await client.from("auth_login_events").insert(basePayload)
    return retry.error
  }

  return error
}

function adminClientOrNull() {
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

export async function syncVerifiedAuthProfile({
  supabase,
  user,
  provider,
  request,
}: {
  supabase: SupabaseClient
  user: User
  provider?: AuthProvider
  request?: Request
}) {
  const resolvedProvider = provider || providerFromUser(user)
  const admin = adminClientOrNull()
  const client = admin || supabase

  const profileError = await upsertProfile(client as SupabaseClient, user, resolvedProvider)
  if (profileError) {
    console.warn("CaterBidsUK profile sync warning:", errorMessage(profileError))
  }

  const verificationError = await upsertUserVerification(client as SupabaseClient, user, resolvedProvider)
  if (verificationError && !isMissingColumnError(verificationError)) {
    console.warn("CaterBidsUK verification sync warning:", errorMessage(verificationError))
  }

  const auditError = await insertAuditEvent(client as SupabaseClient, user, resolvedProvider, request)
  if (auditError && !isMissingColumnError(auditError)) {
    console.warn("CaterBidsUK login audit warning:", errorMessage(auditError))
  }

  return {
    provider: resolvedProvider,
    emailVerified: verifiedEmail(user, resolvedProvider),
  }
}
