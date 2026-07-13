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
    const { data: nonTestProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_test", false)
    if (!nonTestProfiles || nonTestProfiles.length === 0) {
      return { used: 0, cap: FREE_LISTING_CAP, remaining: FREE_LISTING_CAP }
    }
    const sellerIds = nonTestProfiles.map((p) => p.id)
    const { count } = await supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .in("seller_id", sellerIds)
    const used = count ?? 0
    return { used, cap: FREE_LISTING_CAP, remaining: Math.max(0, FREE_LISTING_CAP - used) }
  } catch {
    return { used: 0, cap: FREE_LISTING_CAP, remaining: FREE_LISTING_CAP }
  }
}
