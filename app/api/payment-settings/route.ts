import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_PAYMENT_SETTINGS, SELLER_PLANS, normalisePaymentSettings, normaliseSellerPlan } from "@/lib/pricing"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createClient()
    const [settingsResult, plansResult, { data: { user } }] = await Promise.all([
      supabase.from("payment_settings" as never).select("*").limit(1).maybeSingle(),
      supabase.from("seller_plans" as never).select("*").eq("active", true).order("price", { ascending: true }),
      supabase.auth.getUser(),
    ])

    let isFoundingMember = false
    let hasFoundingFreeFeature = false
    let activeFoundingFreeListingId: string | null = null

    if (user) {
      const [profileResult, slotResult] = await Promise.all([
        supabase.from("profiles").select("is_founding_member").eq("id", user.id).maybeSingle(),
        supabase.from("listings").select("id").eq("user_id", user.id).eq("featured_type", "founding_free").maybeSingle(),
      ])
      isFoundingMember = Boolean((profileResult.data as any)?.is_founding_member)
      hasFoundingFreeFeature = Boolean(slotResult.data?.id)
      activeFoundingFreeListingId = slotResult.data?.id ?? null
    }

    return NextResponse.json({
      settings: normalisePaymentSettings(settingsResult.data),
      plans: plansResult.data?.length ? plansResult.data.map((plan) => normaliseSellerPlan(plan)) : SELLER_PLANS,
      isFoundingMember,
      hasFoundingFreeFeature,
      activeFoundingFreeListingId,
    })
  } catch (error) {
    console.warn("Payment settings unavailable, using launch defaults:", error)
    return NextResponse.json({
      settings: DEFAULT_PAYMENT_SETTINGS,
      plans: SELLER_PLANS,
      isFoundingMember: false,
      hasFoundingFreeFeature: false,
      activeFoundingFreeListingId: null,
    })
  }
}
