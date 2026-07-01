import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_PAYMENT_SETTINGS, SELLER_PLANS, normalisePaymentSettings, normaliseSellerPlan } from "@/lib/pricing"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createClient()
    const [settingsResult, plansResult] = await Promise.all([
      supabase.from("payment_settings" as never).select("*").limit(1).maybeSingle(),
      supabase.from("seller_plans" as never).select("*").eq("active", true).order("price", { ascending: true }),
    ])

    return NextResponse.json({
      settings: normalisePaymentSettings(settingsResult.data),
      plans: plansResult.data?.length ? plansResult.data.map((plan) => normaliseSellerPlan(plan)) : SELLER_PLANS,
    })
  } catch (error) {
    console.warn("Payment settings unavailable, using launch defaults:", error)
    return NextResponse.json({
      settings: DEFAULT_PAYMENT_SETTINGS,
      plans: SELLER_PLANS,
    })
  }
}
