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
    }
  }

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
    }
  }

  const packRows = rows.filter(
    (r) =>
      r.monthly === false &&
      (!r.expires_at || new Date(r.expires_at) > now) &&
      r.listing_count_used < r.listing_count_total,
  )

  if (packRows.length > 0) {
    const totalRemaining = packRows.reduce((sum, r) => sum + (r.listing_count_total - r.listing_count_used), 0)
    const soonestExpiry =
      packRows
        .map((r) => r.expires_at)
        .filter((d): d is string => d !== null)
        .sort()[0] ?? null
    const planName =
      packRows.length === 1 ? packRows[0].plan_name : `${packRows.length} listing packs`

    return {
      planType: "pack",
      planName,
      subscriptionUsed: null,
      subscriptionTotal: null,
      subscriptionExpiresAt: null,
      packCreditsRemaining: totalRemaining,
      packSoonestExpiresAt: soonestExpiry,
      freeFeatureSlotInUse: null,
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
  }
}
