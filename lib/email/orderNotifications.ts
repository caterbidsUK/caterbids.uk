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

export async function sendSubscriptionPaymentFailedEmail({
  supabase,
  invoiceId,
  recipientEmail,
  recipientUserId,
  planName,
}: {
  supabase: SupabaseAdmin
  invoiceId: string
  recipientEmail: string
  recipientUserId?: string | null
  planName?: string | null
}) {
  const dedupeKey = `${invoiceId}:payment-failed`

  const existing = await supabase
    .from("email_events")
    .select("id")
    .eq("dedupe_key", dedupeKey)
    .maybeSingle()

  if (existing.data) return
  if (existing.error && !isMissingEmailEventsTable(existing.error)) {
    console.warn("Could not check payment-failed email event:", existing.error.message)
  }

  const planLabel = planName || "your CaterBids subscription"
  const subject = "Action needed: your CaterBids renewal payment failed"
  const text = [
    `Your renewal payment for ${planLabel} on CaterBids was declined.`,
    ``,
    `Your seller access has been suspended. Stripe will automatically retry the payment — if it goes through, your access is restored automatically.`,
    ``,
    `To avoid further disruption, please update your payment card or contact us at caterbidsuk@gmail.com.`,
    ``,
    `— The CaterBids team`,
  ].join("\n")

  const html = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#001633;padding:40px 0;font-family:Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#002244;border-radius:12px;overflow:hidden;max-width:560px;">
      <tr><td style="background:#002E5D;padding:28px 36px;">
        <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">CaterBids<span style="color:#FF6B00;">.</span>UK</p>
      </td></tr>
      <tr><td style="padding:36px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#FF6B00;">Action Required</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#ffffff;line-height:1.25;">Your renewal payment failed</h1>
        <p style="margin:0 0 16px;font-size:15px;color:#9ab0cc;line-height:1.6;">Your payment for <strong style="color:#fff;">${planLabel}</strong> was declined. Your seller access has been temporarily suspended.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#001633;border-radius:8px;margin:0 0 24px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0 0 4px;font-size:13px;color:#FF6B00;font-weight:700;">What happens next</p>
            <p style="margin:0;font-size:14px;color:#9ab0cc;line-height:1.6;">Stripe will automatically retry your payment. If it succeeds, your access is restored automatically — no action needed on your part.</p>
          </td></tr>
        </table>
        <p style="margin:0 0 24px;font-size:14px;color:#9ab0cc;line-height:1.6;">To guarantee continuity, update your payment card now:</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
          <tr><td style="background:#FF6B00;border-radius:8px;padding:14px 28px;">
            <a href="https://caterbids.uk/account" style="color:#ffffff;font-size:15px;font-weight:900;text-decoration:none;">Update payment details &#8594;</a>
          </td></tr>
        </table>
        <p style="margin:0;font-size:13px;color:#5a7a99;line-height:1.6;">Questions? Reply to this email or contact <a href="mailto:caterbidsuk@gmail.com" style="color:#FF6B00;">caterbidsuk@gmail.com</a>.</p>
      </td></tr>
      <tr><td style="padding:20px 36px;border-top:1px solid #1a3a5c;">
        <p style="margin:0;font-size:12px;color:#3d5c7a;">&copy; CaterBids UK &middot; <a href="https://caterbids.uk" style="color:#3d5c7a;">caterbids.uk</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>`

  const result = await sendEmail({ to: recipientEmail, subject, text, html })
  const status = result.ok ? "sent" : result.status === "not_configured" ? "prepared" : "failed"
  const now = new Date().toISOString()

  await supabase.from("email_events").insert({
    dedupe_key: dedupeKey,
    recipient_user_id: recipientUserId || null,
    recipient_email: recipientEmail,
    template: "subscription_payment_failed",
    subject,
    body: text,
    status,
    provider: (result as any).provider || "unknown",
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
