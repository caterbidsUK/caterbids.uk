"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2 } from "lucide-react"

const TOPICS = [
  "Support",
  "Payment or Stripe question",
  "Delivery booking",
  "Buyer or seller dispute",
  "Safety report",
  "Business partnership",
]

type FormState = "idle" | "loading" | "success" | "error"

export default function ContactForm() {
  const [state, setState] = useState<FormState>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState("loading")
    setErrorMsg("")

    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      topic: (form.elements.namedItem("topic") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      website: (form.elements.namedItem("website") as HTMLInputElement).value,
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setErrorMsg(json.error || "Something went wrong. Please email support@caterbids.uk directly.")
        setState("error")
      } else {
        setState("success")
      }
    } catch {
      setErrorMsg("Could not send your message. Please email support@caterbids.uk directly.")
      setState("error")
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-start gap-4 py-4">
        <CheckCircle2 className="h-10 w-10 text-green-400" />
        <p className="text-xl font-black text-white">Message received.</p>
        <p className="text-sm leading-6 text-white/68">
          We will reply to your email address within one business day. If your matter is urgent,
          email <a href="mailto:support@caterbids.uk" className="text-[#FF6B00] hover:underline">support@caterbids.uk</a> directly.
        </p>
      </div>
    )
  }

  return (
    <form className="mt-4 grid gap-3" onSubmit={handleSubmit} noValidate>
      {/* Honeypot — hidden from humans, filled by bots */}
      <input
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
      />

      <label className="grid gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Name</span>
        <input
          name="name"
          required
          maxLength={120}
          className="premium-input rounded-2xl px-4 py-3 text-sm"
          placeholder="Your name"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Email</span>
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          className="premium-input rounded-2xl px-4 py-3 text-sm"
          placeholder="you@example.com"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Topic</span>
        <select name="topic" className="premium-input rounded-2xl px-4 py-3 text-sm" defaultValue="Support">
          {TOPICS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Message</span>
        <textarea
          name="message"
          required
          maxLength={2000}
          className="premium-input min-h-32 rounded-2xl px-4 py-3 text-sm"
          placeholder="Tell us what happened..."
        />
      </label>

      {state === "error" && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "loading"}
        className="premium-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        {state === "loading" ? "Sending…" : "Send Message"}
        {state !== "loading" && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  )
}
