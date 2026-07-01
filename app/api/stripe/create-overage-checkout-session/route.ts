import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/auth"
import { normalisePaymentSettings } from "@/lib/pricing"

export async function POST() {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)

  if (!user) {
    return NextResponse.json({ error: "Sign in before purchasing extra listings." }, { status: 401 })
  }

  const admin = createAdminClient()
  const [{ data: settingsRow }, { data: entitlements }] = await Promise.all([
    admin.from("payment_settings" as never).select("*").limit(1).maybeSingle(),
    admin
      .from("seller_listing_entitlements")
      .select("id, plan_name, listing_count_total, listing_count_used, monthly, expires_at, active")
      .eq("seller_id", user.id)
      .eq("active", true)
      .eq("monthly", true),
  ])
  const settings = normalisePaymentSettings(settingsRow as Record<string, unknown> | null)

  if (!settings.payments_enabled) {
    return NextResponse.json({ error: "Payments are currently disabled." }, { status: 409 })
  }

  const now = new Date()
  const rows = ((entitlements || []) as Record<string, unknown>[])
  const entitlementAtLimit = rows.find((e) => {
    if (!e.active) return false
    if (e.expires_at && new Date(String(e.expires_at)) < now) return false
    return Number(e.listing_count_used) >= Number(e.listing_count_total)
  })

  if (!entitlementAtLimit) {
    return NextResponse.json({ error: "No overage-eligible subscription found." }, { status: 409 })
  }

  const { data: planRow } = await (admin.from("seller_plans" as never) as any)
    .select("overage_price")
    .eq("name", String(entitlementAtLimit.plan_name || ""))
    .eq("active", true)
    .maybeSingle()

  const overagePrice = Number((planRow as Record<string, unknown> | null)?.overage_price || 0)
  if (overagePrice <= 0) {
    return NextResponse.json({ error: "This plan does not support overage charges." }, { status: 409 })
  }

  const amount = Math.round(overagePrice * 100)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: settings.currency.toLowerCase(),
          unit_amount: amount,
          product_data: {
            name: `CaterBidsUK — Extra Listing (${String(entitlementAtLimit.plan_name || "Starter Plan")})`,
            description: "Adds one additional listing slot to your current subscription.",
          },
        },
      },
    ],
    metadata: {
      checkout_type: "listing_overage",
      sellerId: user.id,
      entitlementId: String(entitlementAtLimit.id || ""),
    },
    success_url: `${siteUrl}/post-listing?overage=success`,
    cancel_url: `${siteUrl}/post-listing`,
  })

  return NextResponse.json({ url: session.url })
}
