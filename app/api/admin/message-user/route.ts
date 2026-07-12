import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminContext } from "@/app/admin/admin-utils"
import { sendEmail } from "@/lib/email/sendEmail"

export const dynamic = "force-dynamic"

// Admin-initiated threads use "/icon-192.png" (the 192×192 PWA icon — the orange bell mark)
// as the brand avatar so they appear in the inbox as a CaterBids system message.
const ADMIN_AVATAR = "/icon-192.png"
const ADMIN_THREAD_LABEL = "CaterBids Team"
const MESSAGE_MAX_LENGTH = 2000

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://caterbids.uk"

function buildHtmlEmail(subject: string, body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#001633;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#001633;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="padding:0 0 24px 0;">
            <img src="${SITE_URL}/icon-192.png" alt="CaterBids" width="48" height="48" style="border-radius:12px;display:block;">
          </td>
        </tr>
        <tr>
          <td style="background:#002E5D;border-radius:16px;border:1px solid rgba(255,255,255,0.1);padding:32px;">
            <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#FF6B00;">CaterBids Team</p>
            <h1 style="margin:0 0 24px 0;font-size:22px;font-weight:900;color:#ffffff;line-height:1.3;">${subject}</h1>
            <div style="font-size:15px;line-height:1.7;color:rgba(255,255,255,0.75);">${escaped}</div>
            <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.1);">
              <a href="${SITE_URL}/messages"
                 style="display:inline-block;background:#FF6B00;color:#ffffff;text-decoration:none;font-weight:900;font-size:14px;padding:12px 24px;border-radius:12px;">
                Reply in CaterBids →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 0 0 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);">
              © CaterBids · <a href="${SITE_URL}" style="color:rgba(255,255,255,0.4);text-decoration:none;">caterbids.uk</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext()
  if (!context) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { targetUserId, subject, message, sendEmailFlag } = body as {
    targetUserId?: unknown
    subject?: unknown
    message?: unknown
    sendEmailFlag?: unknown
  }

  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json({ error: "targetUserId is required." }, { status: 400 })
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message body is required." }, { status: 400 })
  }

  const trimmedMessage = message.trim().slice(0, MESSAGE_MAX_LENGTH)
  const messageSubject = typeof subject === "string" && subject.trim() ? subject.trim() : null
  const emailSubject = messageSubject ?? "A message from CaterBids"

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Resolve target user email for optional email sending
  const { data: targetAuthUser } = await admin.auth.admin.getUserById(targetUserId)
  const targetEmail = targetAuthUser?.user?.email ?? null

  // Find or reuse the admin↔user conversation.
  // Admin occupies seller_id; target user occupies buyer_id.
  // We match on listing_id IS NULL so admin threads are distinct from any
  // listing conversation the same two users might have as buyer/seller.
  const { data: existingConv } = await admin
    .from("conversations")
    .select("id")
    .eq("seller_id", context.userId)
    .eq("buyer_id", targetUserId)
    .is("listing_id", null)
    .maybeSingle()

  let conversationId: string

  if (existingConv) {
    conversationId = existingConv.id
  } else {
    const { data: newConv, error: convError } = await admin
      .from("conversations")
      .insert({
        buyer_id: targetUserId,
        // NOTE: admin occupies the seller_id slot in all admin-initiated threads
        seller_id: context.userId,
        listing_id: null,
        platform: "caterbids",
        listing_title: ADMIN_THREAD_LABEL,
        participant_name: ADMIN_THREAD_LABEL,
        participant_avatar: ADMIN_AVATAR,
        last_message: "",
        unread_count: 0,
      })
      .select("id")
      .single()

    if (convError || !newConv) {
      console.error("[admin/message-user] conversation create error:", convError)
      return NextResponse.json(
        { error: convError?.message ?? "Could not create conversation." },
        { status: 500 }
      )
    }
    conversationId = newConv.id
  }

  // Insert the message
  const { error: msgError } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: context.userId,
      recipient_id: targetUserId,
      sender_name: ADMIN_THREAD_LABEL,
      subject: messageSubject,
      body: trimmedMessage,
      message_text: trimmedMessage,
      platform: "caterbids",
      is_read: false,
      created_at: now,
    })

  if (msgError) {
    console.error("[admin/message-user] message insert error:", msgError)
    return NextResponse.json(
      { error: msgError.message ?? "Could not send message." },
      { status: 500 }
    )
  }

  // Update conversation summary
  await admin
    .from("conversations")
    .update({
      last_message: trimmedMessage,
      last_message_at: now,
      updated_at: now,
      unread_count: 1,
    })
    .eq("id", conversationId)

  // Email — always degrade gracefully: message is already saved at this point
  let emailSent = false
  let emailError: string | null = null

  if (sendEmailFlag && targetEmail) {
    const result = await sendEmail({
      to: targetEmail,
      subject: emailSubject,
      text: [
        `Hello,`,
        ``,
        `You have a new message from the CaterBids team:`,
        ``,
        trimmedMessage,
        ``,
        `Log in to reply: ${SITE_URL}/messages`,
        ``,
        `— The CaterBids Team`,
      ].join("\n"),
      html: buildHtmlEmail(emailSubject, trimmedMessage),
    })

    emailSent = result.ok
    if (!result.ok) {
      emailError = result.error
    }
  }

  return NextResponse.json({ messageSaved: true, conversationId, emailSent, emailError })
}
