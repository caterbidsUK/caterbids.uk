import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/auth"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)

  if (!user) {
    return NextResponse.json({ error: "Sign in before relisting." }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { listingId?: string }
  const listingId = String(body.listingId || "").trim()

  if (!listingId) {
    return NextResponse.json({ error: "Listing ID required." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: listing } = await admin
    .from("listings")
    .select("id, user_id, seller_id")
    .eq("id", listingId)
    .maybeSingle()

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 })
  }

  const listingAny = listing as Record<string, unknown>
  const ownerUserId = listingAny.user_id || listingAny.seller_id
  if (ownerUserId !== user.id) {
    return NextResponse.json({ error: "You can only relist your own listings." }, { status: 403 })
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
          currency: "gbp",
          unit_amount: 500,
          product_data: {
            name: "CaterBidsUK Relist — 30 days",
            description: "Your listing goes live again for 30 more days.",
          },
        },
      },
    ],
    metadata: {
      type: "relist",
      listingId,
      userId: user.id,
    },
    success_url: `${siteUrl}/listing?id=${encodeURIComponent(listingId)}&relist=success`,
    cancel_url: `${siteUrl}/listing?id=${encodeURIComponent(listingId)}`,
  })

  return NextResponse.json({ url: session.url })
}
