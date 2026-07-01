import "server-only"

import { sendEmail } from "@/lib/email/sendEmail"
import type { createAdminClient } from "@/lib/supabase/admin"

type SupabaseAdmin = ReturnType<typeof createAdminClient>

async function recipientEmail(admin: SupabaseAdmin, userId: string): Promise<string | null> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error || !data.user?.email) return null
    return data.user.email
  } catch {
    return null
  }
}

export async function sendMessageNotificationEmail({
  admin,
  recipientId,
  listingTitle,
}: {
  admin: SupabaseAdmin
  recipientId: string
  listingTitle: string | null
  messageId: string
}) {
  try {
    const email = await recipientEmail(admin, recipientId)
    if (!email) return

    const subject = listingTitle
      ? `New message about "${listingTitle}" on CaterBids`
      : "You have a new message on CaterBids"

    const text = [
      "You have a new message waiting on CaterBids.",
      "",
      "Log in to read and reply:",
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://caterbids.uk"}/messages`,
      "",
      "— The CaterBids Team",
    ].join("\n")

    await sendEmail({ to: email, subject, text })
  } catch (err) {
    console.warn("Message notification email failed:", err)
  }
}
