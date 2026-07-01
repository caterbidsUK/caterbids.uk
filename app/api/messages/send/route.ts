import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { sendMessageNotificationEmail } from "@/lib/email/messageNotifications"

const MESSAGE_MAX_LENGTH = 2000

function isUuid(value: unknown) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function cleanMessage(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MESSAGE_MAX_LENGTH) : ""
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Please sign in with your CaterBids account to send messages." },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const conversationId = body?.conversationId
    const message = cleanMessage(body?.message)

    if (!isUuid(conversationId)) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 400 })
    }

    if (!message) {
      return NextResponse.json({ error: "Write a message before sending." }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: conversation, error: conversationError } = await admin
      .from("conversations")
      .select("id,buyer_id,seller_id,platform,listing_title")
      .eq("id", conversationId)
      .maybeSingle()

    if (conversationError) {
      return NextResponse.json({ error: conversationError.message || "Could not load conversation." }, { status: 500 })
    }

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 })
    }

    const isBuyer = conversation.buyer_id === user.id
    const isSeller = conversation.seller_id === user.id

    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: "You do not have access to this conversation." }, { status: 403 })
    }

    const recipientId = isBuyer ? conversation.seller_id : conversation.buyer_id
    if (!recipientId) {
      return NextResponse.json({ error: "This conversation is missing the other participant." }, { status: 400 })
    }

    const { count: priorUnread } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("recipient_id", recipientId)
      .eq("is_read", false)

    const now = new Date().toISOString()
    const { data: insertedMessage, error: insertError } = await admin
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        recipient_id: recipientId,
        sender_name: user.email || "CaterBids user",
        body: message,
        message_text: message,
        platform: conversation.platform || "caterbids",
        is_read: false,
        created_at: now,
      })
      .select("*")
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message || "Could not send message." }, { status: 500 })
    }

    const { error: updateError } = await admin
      .from("conversations")
      .update({
        last_message: message,
        last_message_at: now,
        updated_at: now,
        unread_count: 1,
      })
      .eq("id", conversation.id)

    if (updateError) {
      console.warn("Message sent but conversation summary update failed:", updateError.message)
    }

    if (priorUnread === 0) {
      void sendMessageNotificationEmail({
        admin,
        recipientId,
        listingTitle: conversation.listing_title ?? null,
        messageId: insertedMessage.id,
      })
    }

    return NextResponse.json({ message: insertedMessage })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send message."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
