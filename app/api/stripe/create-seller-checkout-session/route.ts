import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/auth"
import { normalisePaymentSettings, normaliseSellerPlan } from "@/lib/pricing"

type SellerPlanRow = Record<string, unknown>

function isPlanRow(row: unknown): row is SellerPlanRow {
  return Boolean(row && typeof row === "object")
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)

  if (!user) {
    return NextResponse.json({ error: "Sign in before choosing a seller plan." }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { planName?: string }
  const planName = String(body.planName || "").trim()

  if (!planName) {
    return NextResponse.json({ error: "Choose a seller plan." }, { status: 400 })
  }

  const admin = createAdminClient()
  const [{ data: settingsRow }, { data: planRow, error: planError }] = await Promise.all([
    admin.from("payment_settings" as never).select("*").limit(1).maybeSingle(),
    admin.from("seller_plans" as never).select("*").eq("name", planName).eq("active", true).maybeSingle(),
  ])
  const settings = normalisePaymentSettings(settingsRow as Record<string, unknown> | null)

  if (!settings.payments_enabled) {
    return NextResponse.json({ error: "Payments are currently disabled — free listing mode is active.", redirectTo: "/post-listing/start" }, { status: 409 })
  }

  if (planError || !isPlanRow(planRow)) {
    return NextResponse.json({ error: "Seller plan not found." }, { status: 404 })
  }

  const plan = normaliseSellerPlan(planRow)

  if (plan.type === "founding_member") {
    const { data: counter } = await (admin.from("founding_member_counter" as never) as any)
      .select("sold,cap")
      .eq("id", 1)
      .maybeSingle()
    if (counter && counter.sold >= counter.cap) {
      return NextResponse.json(
        { error: "Sold out — all 100 Founding Trade Memberships have been claimed." },
        { status: 409 }
      )
    }
    const { data: existingMembership } = await admin
      .from("seller_listing_entitlements")
      .select("id")
      .eq("seller_id", user.id)
      .eq("plan_name", "Founding Trade Member")
      .eq("active", true)
      .limit(1)
      .maybeSingle()
    if (existingMembership) {
      return NextResponse.json({ error: "You already have a Founding Trade Membership." }, { status: 409 })
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const amount = Math.round(plan.price * 100)

  if (amount <= 0) {
    return NextResponse.json({ error: "Plan price is invalid." }, { status: 400 })
  }

  const recurring = plan.monthly
    ? {
        interval: "month" as const,
      }
    : undefined

  const session = await stripe.checkout.sessions.create({
    mode: plan.monthly ? "subscription" : "payment",
    payment_method_types: ["card"],
    customer_email: user.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: settings.currency.toLowerCase(),
          unit_amount: amount,
          recurring,
          product_data: {
            name: `CaterBidsUK ${plan.name}`,
            description: plan.features.join(" • "),
          },
        },
      },
    ],
    metadata: {
      checkout_type: plan.type === "founding_member" ? "founding_member" : "seller_plan",
      sellerId: user.id,
      planName: plan.name,
      planId: plan.id || "",
      listingCount: String(plan.listing_count),
      durationDays: String(plan.duration_days || 30),
      monthly: String(plan.monthly),
    },
    success_url:
      plan.type === "founding_member"
        ? `${siteUrl}/founding-member/welcome?checkout=success`
        : `${siteUrl}/post-listing?seller_plan=success`,
    cancel_url: `${siteUrl}/pricing?seller_plan=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
