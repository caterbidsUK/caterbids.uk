import { createAdminClient } from "@/lib/supabase/admin"

export const FREE_LISTING_CAP = 100

export async function getFoundingMemberCount(): Promise<{
  sold: number
  cap: number
  remaining: number
}> {
  try {
    const supabase = createAdminClient()
    const [soldResult, capResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_founding_member", true)
        .eq("is_test", false),
      (supabase.from("founding_member_counter" as never) as any)
        .select("cap")
        .limit(1)
        .maybeSingle(),
    ])
    const sold = soldResult.count ?? 0
    const cap = Number(capResult.data?.cap ?? 100)
    return { sold, cap, remaining: Math.max(0, cap - sold) }
  } catch {
    return { sold: 0, cap: 100, remaining: 100 }
  }
}

export async function getFreeListingsRemaining(): Promise<{
  used: number
  cap: number
  remaining: number
}> {
  try {
    const supabase = createAdminClient()
    const [profilesResult, settingsResult] = await Promise.all([
      supabase.from("profiles").select("id").eq("is_test", false),
      (supabase.from("payment_settings" as never) as any)
        .select("free_listing_limit")
        .limit(1)
        .maybeSingle(),
    ])
    const cap = Number(settingsResult.data?.free_listing_limit ?? FREE_LISTING_CAP)
    const nonTestIds = (profilesResult.data || []).map((p) => p.id)
    if (nonTestIds.length === 0) {
      return { used: 0, cap, remaining: cap }
    }
    const { count } = await (supabase.from("free_listing_claims" as never) as any)
      .select("*", { count: "exact", head: true })
      .in("seller_id", nonTestIds)
    const used = (count as number | null) ?? 0
    return { used, cap, remaining: Math.max(0, cap - used) }
  } catch {
    return { used: 0, cap: FREE_LISTING_CAP, remaining: FREE_LISTING_CAP }
  }
}
