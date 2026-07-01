import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

async function anonymiseUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<string[]> {
  const errs: string[] = []

  const { error: msgsErr } = await admin
    .from("messages")
    .update({ sender_name: "Deleted user" })
    .eq("sender_id", userId)
  if (msgsErr) errs.push("messages:" + msgsErr.message)

  const { error: convsErr } = await admin
    .from("conversations")
    .update({ participant_name: "Deleted user" })
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
  if (convsErr) errs.push("conversations:" + convsErr.message)

  const { error: ordersBuyerErr } = await admin
    .from("orders")
    .update({
      buyer_delivery_full_address: null,
      buyer_delivery_postcode: null,
      buyer_phone: null,
      buyer_access_restrictions: null,
      delivery_postcode: null,
    })
    .eq("buyer_id", userId)
  if (ordersBuyerErr) errs.push("orders-buyer:" + ordersBuyerErr.message)

  const { error: ordersSellerErr } = await admin
    .from("orders")
    .update({
      seller_contact_name: null,
      seller_phone: null,
      collection_full_address: null,
      collection_city: null,
      collection_postcode: null,
    })
    .eq("seller_id", userId)
  if (ordersSellerErr) errs.push("orders-seller:" + ordersSellerErr.message)

  const { error: ordersSharedErr } = await admin
    .from("orders")
    .update({ access_restrictions: null, delivery_notes: null })
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
  if (ordersSharedErr) errs.push("orders-shared:" + ordersSharedErr.message)

  const { error: doSellerErr } = await admin
    .from("delivery_orders")
    .update({ collection_postcode: null, access_restrictions: null, access_notes: null })
    .eq("seller_id", userId)
  if (doSellerErr) errs.push("delivery_orders-seller:" + doSellerErr.message)

  const { error: doBuyerErr } = await admin
    .from("delivery_orders")
    .update({ delivery_postcode: null, access_restrictions: null, access_notes: null })
    .eq("buyer_id", userId)
  if (doBuyerErr) errs.push("delivery_orders-buyer:" + doBuyerErr.message)

  return errs
}

export async function POST(request: Request) {
  const purgeSecret = process.env.ACCOUNT_PURGE_SECRET
  const authHeader = request.headers.get("authorization")

  if (!purgeSecret || authHeader !== `Bearer ${purgeSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()

  const { data: pending, error } = await admin
    .from("profiles")
    .select("id")
    .not("deletion_scheduled_at", "is", null)
    .lt("deletion_scheduled_at", cutoff)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!pending?.length) {
    return NextResponse.json({ purged: 0, skipped: 0, skippedIds: [] })
  }

  let purged = 0
  const skippedIds: string[] = []

  for (const { id } of pending) {
    const anonErrs = await anonymiseUser(admin, id)

    if (anonErrs.length > 0) {
      console.error(
        `[purge] Anonymisation failed for user ${id} — skipping hard-delete. Errors:`,
        anonErrs
      )
      skippedIds.push(id)
      continue
    }

    const { error: deleteErr } = await admin.auth.admin.deleteUser(id)
    if (deleteErr) {
      console.error(`[purge] Hard-delete failed for user ${id}:`, deleteErr.message)
      skippedIds.push(id)
    } else {
      purged++
    }
  }

  if (skippedIds.length) {
    console.error(
      `[purge] ${skippedIds.length} user(s) not purged — will retry on next run:`,
      skippedIds
    )
  }

  return NextResponse.json({ purged, skipped: skippedIds.length, skippedIds })
}
