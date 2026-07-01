import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { stripe } from "@/lib/stripe"

function isSocialProvider(authProvider: string | null, authProviders: unknown): boolean {
  const p = authProvider?.toLowerCase()
  if (p && p !== "email") return true
  if (Array.isArray(authProviders)) {
    return authProviders.some((x) => typeof x === "string" && x.toLowerCase() !== "email")
  }
  return false
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { password, confirmEmail } = body as { password?: string; confirmEmail?: string }

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from("profiles")
      .select("auth_provider, auth_providers, deletion_scheduled_at")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.deletion_scheduled_at) {
      return NextResponse.json(
        { error: "Account deletion is already in progress." },
        { status: 400 }
      )
    }

    // ── Identity re-verification ───────────────────────────────────────────────
    const socialUser = isSocialProvider(
      profile?.auth_provider ?? null,
      profile?.auth_providers ?? []
    )

    if (socialUser) {
      if (!confirmEmail || confirmEmail.toLowerCase() !== user.email?.toLowerCase()) {
        return NextResponse.json(
          { error: "Email address does not match your account." },
          { status: 403 }
        )
      }
    } else {
      if (!password) {
        return NextResponse.json(
          { error: "Password is required to delete your account." },
          { status: 400 }
        )
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password,
      })
      if (signInError) {
        return NextResponse.json(
          { error: "Incorrect password. Please try again." },
          { status: 403 }
        )
      }
    }

    // ── Point of no return: ban user + mark for deletion ──────────────────────
    // Both must succeed before any data is touched; if either fails, return 500
    // with no state changes committed yet.
    const now = new Date().toISOString()

    const banResult = await admin.auth.admin.updateUserById(user.id, {
      ban_duration: "876000h",
    })
    if (banResult.error) {
      return NextResponse.json(
        { error: "Could not disable account. Please try again." },
        { status: 500 }
      )
    }

    const { error: markError } = await admin
      .from("profiles")
      .update({ deletion_scheduled_at: now })
      .eq("id", user.id)
    if (markError) {
      // Auth is banned but deletion marker failed — log for manual follow-up
      console.error("CRITICAL: user banned but deletion_scheduled_at not set:", user.id, markError)
    }

    // ── Best-effort anonymisation — collect warnings, always continue ─────────
    const warnings: string[] = []

    // Remove live/draft listings
    const { error: listingsErr } = await admin
      .from("listings")
      .update({ status: "removed" })
      .eq("user_id", user.id)
      .in("status", ["live", "draft", "pending"])
    if (listingsErr) warnings.push("listings:" + listingsErr.message)

    // Anonymise sent messages
    const { error: msgsErr } = await admin
      .from("messages")
      .update({ sender_name: "Deleted user" })
      .eq("sender_id", user.id)
    if (msgsErr) warnings.push("messages:" + msgsErr.message)

    // Anonymise conversations
    const { error: convsErr } = await admin
      .from("conversations")
      .update({ participant_name: "Deleted user" })
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    if (convsErr) warnings.push("conversations:" + convsErr.message)

    // Orders — buyer-side personal fields only (preserve seller's data in same row)
    const { error: ordersBuyerErr } = await admin
      .from("orders")
      .update({
        buyer_delivery_full_address: null,
        buyer_delivery_postcode: null,
        buyer_phone: null,
        buyer_access_restrictions: null,
        delivery_postcode: null,
      })
      .eq("buyer_id", user.id)
    if (ordersBuyerErr) warnings.push("orders-buyer:" + ordersBuyerErr.message)

    // Orders — seller-side personal fields only (preserve buyer's data in same row)
    const { error: ordersSellerErr } = await admin
      .from("orders")
      .update({
        seller_contact_name: null,
        seller_phone: null,
        collection_full_address: null,
        collection_city: null,
        collection_postcode: null,
      })
      .eq("seller_id", user.id)
    if (ordersSellerErr) warnings.push("orders-seller:" + ordersSellerErr.message)

    // Orders — ambiguous fields that could contain either party's info
    const { error: ordersSharedErr } = await admin
      .from("orders")
      .update({ access_restrictions: null, delivery_notes: null })
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    if (ordersSharedErr) warnings.push("orders-shared:" + ordersSharedErr.message)

    // delivery_orders — per-side
    const { error: doSellerErr } = await admin
      .from("delivery_orders")
      .update({ collection_postcode: null, access_restrictions: null, access_notes: null })
      .eq("seller_id", user.id)
    if (doSellerErr) warnings.push("delivery_orders-seller:" + doSellerErr.message)

    const { error: doBuyerErr } = await admin
      .from("delivery_orders")
      .update({ delivery_postcode: null, access_restrictions: null, access_notes: null })
      .eq("buyer_id", user.id)
    if (doBuyerErr) warnings.push("delivery_orders-buyer:" + doBuyerErr.message)

    // Cancel Stripe subscriptions
    try {
      const { data: entitlements } = await admin
        .from("seller_listing_entitlements")
        .select("stripe_subscription_id")
        .eq("seller_id", user.id)
        .eq("active", true)
        .not("stripe_subscription_id", "is", null)

      if (entitlements?.length) {
        await Promise.allSettled(
          entitlements
            .filter((e) => e.stripe_subscription_id !== null)
            .map((e) => stripe.subscriptions.cancel(e.stripe_subscription_id!))
        )
      }
    } catch (err) {
      warnings.push("stripe:" + (err instanceof Error ? err.message : String(err)))
    }

    if (warnings.length) {
      console.warn("Account deletion completed with warnings for user", user.id, warnings)
    }

    // Sign out last — so even if a warning occurred above, the session ends
    await supabase.auth.signOut()

    return NextResponse.json({ ok: true, warnings: warnings.length ? warnings : undefined })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete account."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
