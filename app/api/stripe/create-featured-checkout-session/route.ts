import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/auth"
import { normalisePaymentSettings } from "@/lib/pricing"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)

  if (!user) {
    return NextResponse.json({ error: "Sign in before boosting a listing." }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { listingId?: string; durationDays?: number }
  const listingId = String(body.listingId || "").trim()
  const durationDays = Number(body.durationDays) === 30 ? 30 : 7

  if (!listingId) {
    return NextResponse.json({ error: "Listing ID required." }, { status: 400 })
  }

  const admin = createAdminClient()
  const [{ data: settingsRow }, { data: listing }] = await Promise.all([
    admin.from("payment_settings" as never).select("*").limit(1).maybeSingle(),
    admin
      .from("listings")
      .select("id, user_id, seller_id, featured, is_featured, featured_until")
      .eq("id", listingId)
      .maybeSingle(),
  ])
  const settings = normalisePaymentSettings(settingsRow as Record<string, unknown> | null)

  if (!settings.payments_enabled) {
    return NextResponse.json({ error: "Payments are currently disabled." }, { status: 409 })
  }
  if (!settings.featured_boosts_enabled) {
    return NextResponse.json({ error: "Featured boosts are not currently available." }, { status: 409 })
  }
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 })
  }

  const listingAny = listing as Record<string, unknown>
  const ownerUserId = listingAny.user_id || listingAny.seller_id
  if (ownerUserId !== user.id) {
    return NextResponse.json({ error: "You can only boost your own listings." }, { status: 403 })
  }

  const alreadyFeatured = Boolean(listingAny.featured || listingAny.is_featured)
  const featuredUntil = listingAny.featured_until ? new Date(String(listingAny.featured_until)) : null
  if (alreadyFeatured && (!featuredUntil || featuredUntil > new Date())) {
    return NextResponse.json({ error: "This listing is already featured." }, { status: 409 })
  }

  const price = durationDays === 30 ? settings.featured_price_30d : settings.featured_price_7d
  const amount = Math.round(price * 100)

  if (amount <= 0) {
    return NextResponse.json({ error: "Featured boost price is not configured." }, { status: 400 })
  }

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
            name: `CaterBidsUK Featured Listing — ${durationDays} days`,
            description: `Your listing appears above standard results for ${durationDays} days.`,
          },
        },
      },
    ],
    metadata: {
      checkout_type: "featured_boost",
      sellerId: user.id,
      listingId,
      durationDays: String(durationDays),
    },
    success_url: `${siteUrl}/listing?id=${encodeURIComponent(listingId)}&featured=success`,
    cancel_url: `${siteUrl}/listing?id=${encodeURIComponent(listingId)}`,
  })

  return NextResponse.json({ url: session.url })
}
