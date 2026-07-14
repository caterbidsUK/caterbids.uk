import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { sendEmail } from "@/lib/email/sendEmail"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://caterbids.uk"

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function contactAckEmail(name: string, topic: string) {
  const subject = "We've got your message — CaterBidsUK"

  const text = [
    `Hi ${name},`,
    "",
    "Your message has been received.",
    "",
    `Topic: ${topic}`,
    "",
    "A real person will read this and reply to your email. We don't use bots for support.",
    "",
    "If your matter is urgent, email us directly at support@caterbids.uk.",
    "",
    "— CaterBidsUK",
    "",
    "BUY · SELL · SAVE",
  ].join("\n")

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-radius:16px;overflow:hidden;">

        <!-- Logo bar -->
        <tr>
          <td style="background:#001225;padding:18px 32px;text-align:center;border-bottom:1px solid rgba(255,107,0,0.28);">
            <span style="font-size:20px;font-weight:900;color:#FF6B00;letter-spacing:-0.3px;">CaterBidsUK</span>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="background:#002E5D;padding:36px 32px 28px;">
            <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:rgba(255,255,255,0.55);">Hi ${name},</p>
            <h1 style="margin:0 0 10px;font-size:24px;font-weight:900;color:#ffffff;line-height:1.25;">Message received.</h1>
            <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.55;">A real person will read this and reply to your email. We don&rsquo;t use bots for support.</p>
          </td>
        </tr>

        <!-- Topic box -->
        <tr>
          <td style="background:#002E5D;padding:0 32px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(0,0,0,0.22);border-radius:10px;">
              <tr>
                <td style="padding:18px 24px;">
                  <p style="margin:0 0 6px;font-size:10px;font-weight:900;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.2em;">Your topic</p>
                  <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">${topic}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Urgent note -->
        <tr>
          <td style="background:#002E5D;padding:0 32px 36px;">
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6;">
              If your matter is urgent, email us directly at <a href="mailto:support@caterbids.uk" style="color:#FF6B00;text-decoration:none;font-weight:700;">support@caterbids.uk</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#001225;padding:18px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.07);">
            <p style="margin:0 0 6px;font-size:11px;font-weight:900;color:rgba(255,107,0,0.6);letter-spacing:0.18em;">BUY &middot; SELL &middot; SAVE</p>
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6;">
              CaterBidsUK &bull; The UK marketplace for catering equipment<br>
              <a href="${SITE_URL}" style="color:rgba(255,107,0,0.55);text-decoration:none;">caterbids.uk</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`

  return { subject, text, html }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Honeypot — bots fill this hidden field, humans never see it
    // Early return: neither email is sent for bot submissions
    if (body.website) {
      return NextResponse.json({ ok: true })
    }

    const name = clean(body.name, 120)
    const email = clean(body.email, 254)
    const topic = clean(body.topic, 80)
    const message = clean(body.message, 2000)

    if (!name || !email || !topic || !message) {
      return NextResponse.json(
        { error: "Name, email, topic and message are all required." },
        { status: 400 }
      )
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
    }

    // Resolve user_id if logged in — failure must not block submission
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const user = await getCurrentUser(supabase)
      userId = user?.id ?? null
    } catch {
      // not logged in or session error — proceed as guest
    }

    // INSERT first. The message must survive even if either email send fails.
    const admin = createAdminClient()
    const { error: insertError } = await (admin.from("contact_submissions" as never) as any)
      .insert({ name, email, topic, message, user_id: userId, status: "open" })

    if (insertError) {
      console.error("contact_submissions insert failed:", insertError)
      return NextResponse.json(
        { error: "We could not save your message. Please email support@caterbids.uk directly." },
        { status: 500 }
      )
    }

    // Fire both emails concurrently and independently.
    // Promise.allSettled guarantees both are attempted regardless of the other's outcome.
    const ack = contactAckEmail(name, topic)
    const [notifyResult, ackResult] = await Promise.allSettled([
      sendEmail({
        to: "support@caterbids.uk",
        subject: `[Contact] ${topic} — from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`,
        html: `<p><strong>Name:</strong> ${name}<br><strong>Reply-to:</strong> ${email}<br><strong>Topic:</strong> ${topic}</p><hr><p>${message.replace(/\n/g, "<br>")}</p>`,
      }),
      sendEmail({
        to: email,
        subject: ack.subject,
        text: ack.text,
        html: ack.html,
      }),
    ])

    if (notifyResult.status === "rejected" || (notifyResult.status === "fulfilled" && !notifyResult.value.ok)) {
      const err = notifyResult.status === "rejected" ? notifyResult.reason : notifyResult.value
      console.error("contact form: support notification failed — submission saved in contact_submissions:", err)
    }

    if (ackResult.status === "rejected" || (ackResult.status === "fulfilled" && !ackResult.value.ok)) {
      const err = ackResult.status === "rejected" ? ackResult.reason : ackResult.value
      console.error("contact form: acknowledgement email failed — submission saved in contact_submissions:", err)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("contact route unexpected error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please email support@caterbids.uk directly." },
      { status: 500 }
    )
  }
}
