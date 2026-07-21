import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { countLiveListings, getSellerCredits } from "@/lib/entitlements/usage"

export const dynamic = "force-dynamic"

function daysUntil(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

export type PlanUsageResponse = {
  planType: "founding" | "subscription" | "pack" | "free" | "none"
  planName: string
  remainingLabel: string
  remainingCount: number | null
  totalCount: number | null
  liveListings: number
  expiryLabel: string | null
  expiryDays: number | null
  buyMoreHref: string
  extra: Record<string, unknown> | null
  extraCredits: {
    count: number
    expiresAt: string | null
    expiryDays: number | null
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
    }

    const admin = createAdminClient()
    const [credits, liveListings] = await Promise.all([
      getSellerCredits(admin, user.id),
      countLiveListings(admin, user.id),
    ])

    const {
      planType,
      planName,
      subscriptionUsed,
      subscriptionTotal,
      subscriptionExpiresAt,
      packCreditsRemaining,
      packSoonestExpiresAt,
      freeFeatureSlotInUse,
      extraPackCredits,
      extraPackExpiresAt,
    } = credits

    let remainingLabel: string
    let remainingCount: number | null = null
    let totalCount: number | null = null

    switch (planType) {
      case "founding":
        remainingLabel = `${liveListings} of 30 live`
        remainingCount = liveListings
        totalCount = 30
        break
      case "subscription":
        remainingLabel = `${subscriptionUsed} of ${subscriptionTotal} this month`
        remainingCount = (subscriptionTotal ?? 0) - (subscriptionUsed ?? 0)
        totalCount = subscriptionTotal
        break
      case "pack":
        remainingLabel = `${packCreditsRemaining} listing ${packCreditsRemaining === 1 ? "credit" : "credits"}`
        remainingCount = packCreditsRemaining
        totalCount = null
        break
      case "free":
        remainingLabel = "Free listing"
        break
      case "none":
      default:
        remainingLabel = "No active plan"
        break
    }

    let expiryLabel: string | null = null
    let expiryDays: number | null = null

    if (planType === "subscription" && subscriptionExpiresAt) {
      expiryDays = daysUntil(subscriptionExpiresAt)
      expiryLabel = `Renews in ${expiryDays} day${expiryDays === 1 ? "" : "s"}`
    } else if (planType === "pack" && packSoonestExpiresAt) {
      expiryDays = daysUntil(packSoonestExpiresAt)
      expiryLabel = `Expires in ${expiryDays} day${expiryDays === 1 ? "" : "s"}`
    }

    const buyMoreHref = planType === "founding" || planType === "subscription" ? "/post-listing/start" : "/pricing"

    const extra: Record<string, unknown> | null =
      planType === "founding" ? { freeFeatureSlotInUse: Boolean(freeFeatureSlotInUse) } : null

    const extraCredits = {
      count: extraPackCredits,
      expiresAt: extraPackExpiresAt,
      expiryDays: extraPackExpiresAt ? daysUntil(extraPackExpiresAt) : null,
    }

    const body: PlanUsageResponse = {
      planType,
      planName,
      remainingLabel,
      remainingCount,
      totalCount,
      liveListings,
      expiryLabel,
      expiryDays,
      buyMoreHref,
      extra,
      extraCredits,
    }

    return NextResponse.json(body)
  } catch (err) {
    console.error("[plan-usage]", err)
    return NextResponse.json({ error: "Could not load plan usage." }, { status: 500 })
  }
}
