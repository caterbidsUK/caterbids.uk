"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isProtectedSuperAdminEmail } from "@/lib/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { PAYMENT_SETTINGS_ID } from "@/lib/pricing"
import { PROTECTED_SUPER_ADMIN_EMAIL, requireAdmin, writeAdminAuditLog } from "./admin-utils"

const LISTING_STATUSES = ["live", "pending", "draft", "hidden", "sold", "expired", "pending_payment", "paused", "removed"] as const
const USER_ROLES = ["user", "seller", "dealer", "admin", "super_admin"] as const
const USER_VERIFICATION_FIELDS = [
  "verified",
  "email_verified",
  "is_email_verified",
  "phone_verified",
  "is_phone_verified",
  "verified_dealer",
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
  if (field === "phone_verified" || field === "is_phone_verified") {
    update.phone_verified = verified
    update.is_phone_verified = verified
    update.phone_verified_at = verified ? new Date().toISOString() : null
    update.phone_verification_method = "manual"
    update.phone_verification_status = verified ? "verified" : "pending"
  }
  if (field === "verified_dealer") {
    update.seller_verification_level = verified ? "verified" : "unverified"
    update.business_verified = verified
  }

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

export async function setPhoneVerificationStatus(formData: FormData) {
  const context = await requireAdmin()
  const userId = formString(formData, "user_id")
  const status = formString(formData, "status")

  if (!userId || !isAllowed(status, ["pending", "verified", "rejected"])) {
    throw new Error("Choose a valid phone verification status.")
  }

  const verified = status === "verified"
  const update: Record<string, unknown> = {
    phone_verified: verified,
    is_phone_verified: verified,
    phone_verified_at: verified ? new Date().toISOString() : null,
    phone_verification_method: "manual",
    phone_verification_status: status,
    updated_at: new Date().toISOString(),
  }

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update(update as any).eq("id", userId)
  if (error) throw new Error(error.message)

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: `user.phone.${status}`,
    entityType: "profile",
    entityId: userId,
    metadata: { status },
  })

  revalidatePath("/admin")
  revalidatePath("/account")
  revalidatePath("/settings")
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
    isProtectedSuperAdminEmail(context.email) &&
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
    context.profile.role === "super_admin" || isProtectedSuperAdminEmail(context.email)

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
    featured_price_7d: Math.max(0, Number(formString(formData, "featured_price_7d") || "4.99")),
    featured_price_30d: Math.max(0, Number(formString(formData, "featured_price_30d") || "14.99")),
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

export async function updateSellerPlan(
  _prevState: { success?: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const context = await requireAdmin()
  const isSuperAdmin =
    context.profile.role === "super_admin" || isProtectedSuperAdminEmail(context.email)

  if (!isSuperAdmin) {
    return { error: "Only the super admin can edit seller plans." }
  }

  const planId = formString(formData, "plan_id")
  const priceRaw = formString(formData, "price")
  const listingCountRaw = formString(formData, "listing_count")
  const durationDaysRaw = formString(formData, "duration_days")
  const featuresRaw = formString(formData, "features")
  const active = formBoolean(formData, "active")
  const overagePriceRaw = formString(formData, "overage_price")
  const overagePrice = overagePriceRaw && Number.isFinite(Number(overagePriceRaw))
    ? Math.max(0, Number(overagePriceRaw))
    : null

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(planId)) {
    return { error: "Invalid plan ID." }
  }

  const price = Number(priceRaw)
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Price must be a positive number." }
  }

  const listingCount = Math.round(Number(listingCountRaw))
  if (!Number.isFinite(listingCount) || listingCount < 1) {
    return { error: "Listing count must be a whole number of at least 1." }
  }

  const durationDays = Math.round(Number(durationDaysRaw))
  if (!Number.isFinite(durationDays) || durationDays < 1) {
    return { error: "Duration must be a whole number of at least 1 day." }
  }

  const features = featuresRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const admin = createAdminClient()
  const updateResult = await (admin.from("seller_plans" as never) as any)
    .update({
      price,
      listing_count: listingCount,
      duration_days: durationDays,
      features,
      active,
      overage_price: overagePrice,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
  const dbError: { message: string } | null = updateResult?.error ?? null

  if (dbError) {
    return { error: dbError.message || "Failed to save plan." }
  }

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: "seller_plan.update",
    entityType: "seller_plan",
    entityId: planId,
    metadata: { price, listingCount, durationDays, features, active, overagePrice },
  })

  revalidatePath("/admin")
  revalidatePath("/pricing")

  return { success: true }
}

export async function setUserTestFlag(formData: FormData) {
  const context = await requireAdmin()
  const userId = formString(formData, "user_id")
  const isTest = formData.get("is_test") === "true"

  if (!userId) throw new Error("User ID missing.")

  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({ is_test: isTest, updated_at: new Date().toISOString() } as any)
    .eq("id", userId)

  if (error) throw new Error(error.message)

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: isTest ? "user.mark_test" : "user.unmark_test",
    entityType: "profile",
    entityId: userId,
    metadata: { is_test: isTest },
  })

  revalidatePath("/admin")
}

export async function deleteBlogPost(formData: FormData) {
  const context = await requireAdmin()
  const postId = formString(formData, "post_id")

  if (!postId) throw new Error("Missing post_id.")

  const admin = createAdminClient()
  const { error } = await (admin.from("blog_posts" as any) as any).delete().eq("id", postId)

  if (error) throw new Error(error.message)

  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: "blog.post.delete",
    entityType: "blog_post",
    entityId: postId,
    metadata: {},
  })

  revalidatePath("/admin")
  revalidatePath("/blog")
}
