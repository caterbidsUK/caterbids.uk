import { createAdminClient } from "@/lib/supabase/admin"

type AdminClient = ReturnType<typeof createAdminClient>

export type SellerCreditsResult = {
  planType: "founding" | "subscription" | "pack" | "free" | "none"
  planName: string
  subscriptionUsed: number | null
  subscriptionTotal: number | null
  subscriptionExpiresAt: string | null
  packCreditsRemaining: number | null
  packSoonestExpiresAt: string | null
  freeFeatureSlotInUse: boolean | null
  // Pack credits that exist alongside a founding/subscription primary plan.
  // 0 when planType === "pack" (already the primary) or when no packs exist.
  extraPackCredits: number
  extraPackExpiresAt: string | null
}

export async function countLiveListings(admin: AdminClient, userId: string): Promise<number> {
  const { count } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .or(`user_id.eq.${userId},seller_id.eq.${userId}`)
    .or("status.is.null,status.eq.live,status.eq.active,status.eq.payment_pending")
  return count ?? 0
}

export async function getSellerCredits(admin: AdminClient, userId: string): Promise<SellerCreditsResult> {
  const now = new Date()

  const [{ data: profileData }, { data: entitlements }, { data: settingsRow }] = await Promise.all([
    admin.from("profiles").select("is_founding_member").eq("id", userId).maybeSingle(),
    admin
      .from("seller_listing_entitlements")
      .select("id, plan_name, listing_count_total, listing_count_used, monthly, expires_at, active")
      .eq("seller_id", userId)
      .eq("active", true),
    admin.from("payment_settings" as never).select("payments_enabled, free_listing_mode").limit(1).maybeSingle(),
  ])

  const isFoundingMember = Boolean((profileData as any)?.is_founding_member)

  type EntRow = {
    id: string
    plan_name: string
    listing_count_total: number
    listing_count_used: number
    monthly: boolean
    expires_at: string | null
    active: boolean
  }

  const rows = (entitlements ?? []) as EntRow[]

  // Compute pack rows once, before all branching, so every primary plan type
  // can carry the extra credits alongside it.
  const packRows = rows.filter(
    (r) =>
      r.monthly === false &&
      (!r.expires_at || new Date(r.expires_at) > now) &&
      r.listing_count_used < r.listing_count_total,
  )
  const totalPackCredits = packRows.reduce((sum, r) => sum + (r.listing_count_total - r.listing_count_used), 0)
  const packSoonestExpiry =
    packRows
      .map((r) => r.expires_at)
      .filter((d): d is string => d !== null)
      .sort()[0] ?? null

  if (isFoundingMember) {
    const { data: featureSlot } = await admin
      .from("listings")
      .select("id")
      .eq("user_id", userId)
      .eq("featured_type", "founding_free")
      .maybeSingle()

    return {
      planType: "founding",
      planName: "Founding Trade Member",
      subscriptionUsed: null,
      subscriptionTotal: null,
      subscriptionExpiresAt: null,
      packCreditsRemaining: null,
      packSoonestExpiresAt: null,
      freeFeatureSlotInUse: Boolean(featureSlot),
      extraPackCredits: totalPackCredits,
      extraPackExpiresAt: packSoonestExpiry,
    }
  }

  const subscriptionRow = rows.find(
    (r) => r.monthly === true && (!r.expires_at || new Date(r.expires_at) > now),
  )

  if (subscriptionRow) {
    return {
      planType: "subscription",
      planName: subscriptionRow.plan_name,
      subscriptionUsed: subscriptionRow.listing_count_used,
      subscriptionTotal: subscriptionRow.listing_count_total,
      subscriptionExpiresAt: subscriptionRow.expires_at,
      packCreditsRemaining: null,
      packSoonestExpiresAt: null,
      freeFeatureSlotInUse: null,
      extraPackCredits: totalPackCredits,
      extraPackExpiresAt: packSoonestExpiry,
    }
  }

  if (packRows.length > 0) {
    const planName =
      packRows.length === 1 ? packRows[0].plan_name : `${packRows.length} listing packs`

    return {
      planType: "pack",
      planName,
      subscriptionUsed: null,
      subscriptionTotal: null,
      subscriptionExpiresAt: null,
      packCreditsRemaining: totalPackCredits,
      packSoonestExpiresAt: packSoonestExpiry,
      freeFeatureSlotInUse: null,
      extraPackCredits: 0,
      extraPackExpiresAt: null,
    }
  }

  const settings = settingsRow as any
  const inFreeMode = !settings?.payments_enabled || settings?.free_listing_mode

  if (inFreeMode) {
    return {
      planType: "free",
      planName: "Free Listing",
      subscriptionUsed: null,
      subscriptionTotal: null,
      subscriptionExpiresAt: null,
      packCreditsRemaining: null,
      packSoonestExpiresAt: null,
      freeFeatureSlotInUse: null,
      extraPackCredits: 0,
      extraPackExpiresAt: null,
    }
  }

  return {
    planType: "none",
    planName: "No Active Plan",
    subscriptionUsed: null,
    subscriptionTotal: null,
    subscriptionExpiresAt: null,
    packCreditsRemaining: null,
    packSoonestExpiresAt: null,
    freeFeatureSlotInUse: null,
    extraPackCredits: 0,
    extraPackExpiresAt: null,
  }
}
