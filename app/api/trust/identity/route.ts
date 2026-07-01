import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    if (!user) {
      return NextResponse.json({ error: "Sign in to verify your identity." }, { status: 401 })
    }

    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        { error: "ID verification is not connected yet.", configured: false },
        { status: 501 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const returnUrl =
      typeof body.returnUrl === "string" && body.returnUrl.startsWith("/")
        ? `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}${body.returnUrl}`
        : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/account`

    const stripe = new Stripe(secretKey, { apiVersion: "2026-04-22.dahlia" })
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id: user.id,
        marketplace: "CaterBidsUK",
      },
      return_url: returnUrl,
      options: {
        document: {
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
    })

    const now = new Date().toISOString()
    const admin = createAdminClient()
    await admin.from("user_verifications" as any).upsert(
      {
        user_id: user.id,
        id_verification_provider: "stripe_identity",
        id_verification_status: "pending",
        verification_consent_at: now,
        verification_consent_version: "trust-v1",
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    await admin
      .from("profiles")
      .update({
        stripe_identity_session_id: session.id,
        stripe_identity_status: session.status,
        seller_verification_level: "id_pending",
      } as any)
      .eq("id", user.id)

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error("Could not start ID verification:", error)
    return NextResponse.json({ error: "Could not start ID verification." }, { status: 500 })
  }
}
