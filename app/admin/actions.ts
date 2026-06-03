"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { PAYMENT_SETTINGS_ID } from "@/lib/pricing"
import { PROTECTED_SUPER_ADMIN_EMAIL, requireAdmin, writeAdminAuditLog } from "./admin-utils"

const LISTING_STATUSES = ["live", "draft", "hidden", "sold", "expired", "pending_payment", "paused", "removed"] as const
const USER_ROLES = ["buyer", "seller", "admin", "owner", "super_admin"] as const
const USER_VERIFICATION_FIELDS = [
  "verified",
  "email_verified",
  "is_email_verified",
  "phone_verified",
  "is_phone_verified",
] as const

type PaymentSettingsUpsertResult = {
  error: { message: string } | null
}

type PaymentSettingsUpsertTable<TPayload> = {
  upsert(payload: TPayload, options: { onConflict: string }): Promise<PaymentSettingsUpsertResult>
}

function formString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim()
}

function formBoolean(formData: FormData, key: string) {
  const value = formData.get(key)
  return value === "on" || value === "true"
}

function isAllowed(value: string, allowed: readonly string[]) {
  return allowed.includes(value)
}

function isMissingListingFeatureSchema(message?: string | null) {
  return /schema cache|column .*listings\.(featured|is_featured|featured_until|featured_type|featured_at|featured_by|urgent|is_urgent)|'(featured|featured_at|featured_by|urgent)' column/i.test(
    message || ""
  )
}

export async function updateListingStatus(formData: FormData) {
  const context = await requireAdmin()
  const listingId = formString(formData, "listing_id")
  const status = formString(formData, "status")

  if (!listingId || !isAllowed(status, LISTING_STATUSES)) {
    throw new Error("Choose a valid listing status.")
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("listings")
    .update({
      status,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", listingId)

  if (error) {
    if (isMissingListingFeatureSchema(error.message)) {
      redirect("/admin?tab=listings&setup=listing_feature_columns")
    }
    throw new Error(error.message)
  }

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: "listing.status.update",
    entityType: "listing",
    entityId: listingId,
    metadata: { status },
  })

  revalidatePath("/admin")
  revalidatePath("/search")
  revalidatePath("/listing")
}

export async function quickSetListingStatus(formData: FormData) {
  return updateListingStatus(formData)
}

export async function toggleListingFeatured(formData: FormData) {
  const context = await requireAdmin()
  const listingId = formString(formData, "listing_id")
  const featured = formData.get("featured") === "true"

  if (!listingId) throw new Error("Listing ID missing.")

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await admin
    .from("listings")
    .update({
      featured,
      is_featured: featured,
      featured_type: featured ? "admin" : null,
      featured_at: featured ? now : null,
      featured_by: featured ? context.userId : null,
      featured_until: featured ? formString(formData, "featured_until") || null : null,
      updated_at: now,
    } as any)
    .eq("id", listingId)

  if (error) {
    if (isMissingListingFeatureSchema(error.message)) {
      redirect("/admin?tab=listings&setup=listing_feature_columns")
    }
    throw new Error(error.message)
  }

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: featured ? "listing.feature" : "listing.unfeature",
    entityType: "listing",
    entityId: listingId,
    metadata: { featured },
  })

  revalidatePath("/admin")
  revalidatePath("/")
  revalidatePath("/search")
}

export async function toggleListingUrgent(formData: FormData) {
  const context = await requireAdmin()
  const listingId = formString(formData, "listing_id")
  const urgent = formData.get("urgent") === "true"

  if (!listingId) throw new Error("Listing ID missing.")

  const admin = createAdminClient()
  const firstAttempt = await admin
    .from("listings")
    .update({
      urgent,
      is_urgent: urgent,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", listingId)

  if (firstAttempt.error) {
    const fallback = await admin
      .from("listings")
      .update({
        featured_type: urgent ? "urgent" : null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", listingId)

    if (fallback.error) {
      if (isMissingListingFeatureSchema(fallback.error.message)) {
        redirect("/admin?tab=listings&setup=listing_feature_columns")
      }
      throw new Error(fallback.error.message)
    }
  }

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: urgent ? "listing.urgent" : "listing.not_urgent",
    entityType: "listing",
    entityId: listingId,
    metadata: { urgent },
  })

  revalidatePath("/admin")
  revalidatePath("/")
  revalidatePath("/search")
  revalidatePath("/listing")
}

export async function setUserVerified(formData: FormData) {
  const context = await requireAdmin()
  const userId = formString(formData, "user_id")
  const verified = formData.get("verified") === "true"

  if (!userId) throw new Error("User ID missing.")

  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({
      verified,
      email_verified: verified,
      is_email_verified: verified,
      verified_user_badge: verified,
      verification_level: verified ? "basic" : "basic",
      badge: verified ? "Verified User" : "Email pending",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", userId)

  if (error) throw new Error(error.message)

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: verified ? "user.verify" : "user.unverify",
    entityType: "profile",
    entityId: userId,
    metadata: { verified },
  })

  revalidatePath("/admin")
  revalidatePath("/account")
  revalidatePath("/listing")
}

export async function setUserVerificationFlag(formData: FormData) {
  const context = await requireAdmin()
  const userId = formString(formData, "user_id")
  const field = formString(formData, "field")
  const verified = formData.get("verified") === "true"

  if (!userId || !isAllowed(field, USER_VERIFICATION_FIELDS)) {
    throw new Error("Choose a valid verification field.")
  }

  const update: Record<string, unknown> = {
    [field]: verified,
    updated_at: new Date().toISOString(),
  }

  if (field === "email_verified") update.is_email_verified = verified
  if (field === "is_email_verified") update.email_verified = verified
  if (field === "phone_verified") update.is_phone_verified = verified
  if (field === "is_phone_verified") update.phone_verified = verified

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update(update as any).eq("id", userId)
  if (error) throw new Error(error.message)

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: `user.${field}.${verified ? "mark" : "unmark"}`,
    entityType: "profile",
    entityId: userId,
    metadata: { field, verified },
  })

  revalidatePath("/admin")
  revalidatePath("/account")
  revalidatePath("/listing")
}

export async function updateUserRole(formData: FormData) {
  const context = await requireAdmin()
  const userId = formString(formData, "user_id")
  const role = formString(formData, "role")

  if (!userId || !isAllowed(role, USER_ROLES)) {
    throw new Error("Choose a valid user role.")
  }

  if (
    context.email.toLowerCase() === PROTECTED_SUPER_ADMIN_EMAIL &&
    context.userId === userId &&
    role !== "super_admin"
  ) {
    throw new Error("Protected super admin cannot demote their own account.")
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({
      role,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", userId)

  if (error) throw new Error(error.message)

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: "user.role.update",
    entityType: "profile",
    entityId: userId,
    metadata: { role },
  })

  revalidatePath("/admin")
  revalidatePath("/account")
}

export async function updateSiteSetting(formData: FormData) {
  const context = await requireAdmin()
  const key = formString(formData, "key")
  const value = formString(formData, "value")
  const description = formString(formData, "description")
  const valueType = formString(formData, "value_type") || "text"

  if (!key || !/^[a-z0-9_.-]+$/i.test(key)) {
    throw new Error("Use a simple site setting key.")
  }

  const parsedValue =
    valueType === "boolean"
      ? value === "on" || value === "true"
      : valueType === "number"
        ? Number(value || 0)
        : value

  const admin = createAdminClient()
  const { error } = await admin.from("site_settings" as any).upsert(
    {
      key,
      value: { text: value, value: parsedValue, type: valueType },
      description: description || null,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  )

  if (error) throw new Error(error.message)

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: "site_setting.update",
    entityType: "site_setting",
    entityId: key,
    metadata: { key, value: parsedValue, valueType, description },
  })

  revalidatePath("/admin")
  revalidatePath("/")
}

export async function updatePaymentSettings(formData: FormData) {
  const context = await requireAdmin()
  const isSuperAdmin =
    context.profile.role === "super_admin" || context.email.toLowerCase() === PROTECTED_SUPER_ADMIN_EMAIL

  if (!isSuperAdmin) {
    throw new Error("Only the super admin can update payment settings.")
  }

  const currency = (formString(formData, "currency") || "GBP").toUpperCase()
  const freeListingLimit = Math.max(0, Math.floor(Number(formString(formData, "free_listing_limit") || 100)))
  const payload = {
    id: PAYMENT_SETTINGS_ID,
    payments_enabled: formBoolean(formData, "payments_enabled"),
    free_listing_mode: formBoolean(formData, "free_listing_mode"),
    free_listing_limit: Number.isFinite(freeListingLimit) ? freeListingLimit : 100,
    listing_packs_enabled: formBoolean(formData, "listing_packs_enabled"),
    subscriptions_enabled: formBoolean(formData, "subscriptions_enabled"),
    featured_boosts_enabled: formBoolean(formData, "featured_boosts_enabled"),
    test_mode: formBoolean(formData, "test_mode"),
    currency: currency || "GBP",
    updated_at: new Date().toISOString(),
  }

  const admin = createAdminClient()
  const paymentSettingsTable = admin.from("payment_settings" as never) as unknown as PaymentSettingsUpsertTable<typeof payload>
  const { error } = await paymentSettingsTable.upsert(payload, { onConflict: "id" })

  if (error) throw new Error(error.message)

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: "payment_settings.update",
    entityType: "payment_settings",
    entityId: PAYMENT_SETTINGS_ID,
    metadata: payload,
  })

  revalidatePath("/admin")
  revalidatePath("/pricing")
  revalidatePath("/post-listing")
}
