import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { sendEmail } from "@/lib/email/sendEmail"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Honeypot — bots fill this hidden field, humans never see it
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

    // INSERT first. The message must survive even if the email send fails.
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

    // THEN send notification email — failure does NOT roll back the DB row
    const emailResult = await sendEmail({
      to: "support@caterbids.uk",
      subject: `[Contact] ${topic} — from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${name}<br><strong>Reply-to:</strong> ${email}<br><strong>Topic:</strong> ${topic}</p><hr><p>${message.replace(/\n/g, "<br>")}</p>`,
    })

    if (!emailResult.ok) {
      console.error(
        "contact form: email notification failed — submission is saved in contact_submissions:",
        emailResult
      )
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
