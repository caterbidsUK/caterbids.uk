import type { createAdminClient } from "@/lib/supabase/admin"
import type { DeliveryOrderRow } from "@/lib/delivery/deliveryOrders"
import type { Database } from "@/types/supabase"
import { sendEmail } from "@/lib/email/sendEmail"

type SupabaseAdmin = ReturnType<typeof createAdminClient>
type OrderRow = Database["public"]["Tables"]["orders"]["Row"]

type EmailEventInput = {
  dedupeKey: string
  orderId?: string | null
  deliveryOrderId?: string | null
  recipientUserId?: string | null
  recipientEmail?: string | null
  template: string
  subject: string
  body: string
}

function isMissingEmailEventsTable(error: unknown) {
  if (!error || typeof error !== "object") return false
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : ""
  const code = "code" in error && typeof error.code === "string" ? error.code : ""

  return (
    code === "42P01" ||
    code === "PGRST204" ||
    message.includes("email_events") ||
    message.includes("schema cache") ||
    message.includes("could not find the table")
  )
}

async function emailForUser(supabase: SupabaseAdmin, userId?: string | null) {
  if (!userId) return null

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error) {
      console.warn("Could not load user email for notification:", error.message)
      return null
    }

    return data.user?.email || null
  } catch (error) {
    console.warn("Could not load user email for notification:", error)
    return null
  }
}

async function sendWithConfiguredProvider(input: EmailEventInput) {
  if (!input.recipientEmail) {
    return { status: "prepared" as const, provider: "local", error: null }
  }

  const result = await sendEmail({
    to: input.recipientEmail,
    subject: input.subject,
    text: input.body,
  })

  if (result.ok) {
    return { status: "sent" as const, provider: result.provider, error: null }
  }

  if (result.status === "not_configured") {
    return { status: "prepared" as const, provider: "local", error: null }
  }

  return { status: "failed" as const, provider: result.provider, error: result.error }
}

async function prepareEmailEvent(supabase: SupabaseAdmin, input: EmailEventInput) {
  const existing = await supabase
    .from("email_events")
    .select("id,status")
    .eq("dedupe_key", input.dedupeKey)
    .maybeSingle()

  if (existing.data) return
  if (existing.error && !isMissingEmailEventsTable(existing.error)) {
    console.warn("Could not check email event:", existing.error.message)
  }

  const deliveryResult = await sendWithConfiguredProvider(input)
  const now = new Date().toISOString()
  const insert = await supabase
    .from("email_events")
    .insert({
      dedupe_key: input.dedupeKey,
      order_id: input.orderId || null,
      delivery_order_id: input.deliveryOrderId || null,
      recipient_user_id: input.recipientUserId || null,
      recipient_email: input.recipientEmail || null,
      template: input.template,
      subject: input.subject,
      body: input.body,
      status: deliveryResult.status,
      provider: deliveryResult.provider,
      sent_at: deliveryResult.status === "sent" ? now : null,
      error: deliveryResult.error,
      updated_at: now,
    })

  if (insert.error) {
    if (isMissingEmailEventsTable(insert.error)) {
      console.info("Email event prepared:", {
        template: input.template,
        recipientEmail: input.recipientEmail,
        subject: input.subject,
      })
      return
    }

    console.warn("Could not save email event:", insert.error.message)
  }
}

export async function sendFoundingMemberWelcomeEmail({
  supabase,
  sessionId,
  recipientEmail,
  recipientName,
  recipientUserId,
}: {
  supabase: SupabaseAdmin
  sessionId: string
  recipientEmail?: string | null
  recipientName?: string | null
  recipientUserId?: string | null
}) {
  if (!recipientEmail) return

  const dedupeKey = `${sessionId}:founding-member-welcome`
  const existing = await supabase
    .from("email_events")
    .select("id")
    .eq("dedupe_key", dedupeKey)
    .maybeSingle()

  if (existing.data) return
  if (existing.error && !isMissingEmailEventsTable(existing.error)) {
    console.warn("Could not check founding member email event:", existing.error.message)
  }

  const { foundingMemberWelcome } = await import("@/lib/email/templates/foundingMemberWelcome")
  const { subject, text, html } = foundingMemberWelcome({ name: recipientName })

  const result = await sendEmail({ to: recipientEmail, subject, text, html })
  const status = result.ok ? "sent" : result.status === "not_configured" ? "prepared" : "failed"
  const now = new Date().toISOString()

  await supabase.from("email_events").insert({
    dedupe_key: dedupeKey,
    recipient_user_id: recipientUserId || null,
    recipient_email: recipientEmail,
    template: "founding_member_welcome",
    subject,
    body: text,
    status,
    provider: result.ok || result.status === "not_configured" ? (result as any).provider || "local" : (result as any).provider || "unknown",
    sent_at: status === "sent" ? now : null,
    error: result.ok ? null : (result as any).error || null,
    updated_at: now,
  })
}

export async function sendPaymentSuccessEmails({
  supabase,
  order,
  deliveryOrder,
}: {
  supabase: SupabaseAdmin
  order: OrderRow
  deliveryOrder?: DeliveryOrderRow | null
}) {
  const buyerEmail = await emailForUser(supabase, order.buyer_id)
  const sellerEmail = await emailForUser(supabase, order.seller_id)
  const itemTitle = order.item_title || "CaterBids item"
  const deliveryLine = deliveryOrder
    ? `${deliveryOrder.selected_service_name || order.delivery_name || "Delivery"} - GBP ${Number(deliveryOrder.selected_service_price || order.delivery_price || 0).toFixed(2)}`
    : ""

  await Promise.all([
    prepareEmailEvent(supabase, {
      dedupeKey: `${order.id}:buyer-order-confirmation`,
      orderId: order.id,
      deliveryOrderId: deliveryOrder?.id,
      recipientUserId: order.buyer_id,
      recipientEmail: buyerEmail,
      template: "buyer_order_confirmation",
      subject: "CaterBids order confirmation",
      body: `Payment successful for ${itemTitle}.\n\nOrder total: GBP ${Number(order.total_price || 0).toFixed(2)}.`,
    }),
    prepareEmailEvent(supabase, {
      dedupeKey: `${order.id}:seller-sold`,
      orderId: order.id,
      deliveryOrderId: deliveryOrder?.id,
      recipientUserId: order.seller_id,
      recipientEmail: sellerEmail,
      template: "seller_sold",
      subject: "Your CaterBids item sold",
      body: `${itemTitle} has sold on CaterBids.\n\nPlease prepare the item for collection or delivery.`,
    }),
  ])

  if (!deliveryOrder) return

  await Promise.all([
    prepareEmailEvent(supabase, {
      dedupeKey: `${order.id}:buyer-delivery-request`,
      orderId: order.id,
      deliveryOrderId: deliveryOrder.id,
      recipientUserId: order.buyer_id,
      recipientEmail: buyerEmail,
      template: "buyer_delivery_request_received",
      subject: "Delivery request received",
      body: `Delivery request received for ${itemTitle}.\n\n${deliveryLine}\n\nFinal courier confirmation will follow.`,
    }),
    prepareEmailEvent(supabase, {
      dedupeKey: `${order.id}:seller-delivery-request`,
      orderId: order.id,
      deliveryOrderId: deliveryOrder.id,
      recipientUserId: order.seller_id,
      recipientEmail: sellerEmail,
      template: "seller_delivery_request_received",
      subject: "Delivery requested for sold item",
      body: `Delivery has been requested for ${itemTitle}.\n\nCollection postcode: ${deliveryOrder.collection_postcode || order.collection_postcode || "Pending"}.\nFinal courier confirmation will follow.`,
    }),
  ])
}
