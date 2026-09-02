"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

const REASONS = [
  "Misleading or inaccurate description",
  "Counterfeit or prohibited item",
  "Suspicious seller behaviour",
  "Duplicate listing",
  "Price manipulation",
  "Other safety concern",
]

type FormState = "idle" | "loading" | "success" | "error"

export default function ReportListingPage() {
  const [state, setState] = useState<FormState>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState("loading")
    setErrorMsg("")

    const form = e.currentTarget
    const listingUrl = (form.elements.namedItem("listingUrl") as HTMLInputElement).value.trim()
    const reason = (form.elements.namedItem("reason") as HTMLSelectElement).value
    const details = (form.elements.namedItem("details") as HTMLTextAreaElement).value.trim()
    const reporterEmail = (form.elements.namedItem("reporterEmail") as HTMLInputElement).value.trim()

    const fullReason = `${reason}${details ? ` — ${details}` : ""}${reporterEmail ? ` (reporter: ${reporterEmail})` : ""}`

    try {
      const res = await fetch("/api/trust/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "listing",
          entityId: listingUrl,
          flagType: "listing_report",
          reason: fullReason,
          severity: 2,
        }),
      })

      if (res.status === 401) {
        setErrorMsg("You need to be signed in to submit a report. Please sign in, or email support@caterbids.uk with the listing link and details.")
        setState("error")
        return
      }

      const json = await res.json()
      if (!res.ok || json.error) {
        setErrorMsg(json.error || "Could not submit your report. Please email support@caterbids.uk directly.")
        setState("error")
      } else {
        setState("success")
      }
    } catch {
      setErrorMsg("Could not submit your report. Please email support@caterbids.uk directly.")
      setState("error")
    }
  }

  return (
    <main className="app-bg min-h-screen px-4 py-8 text-white">
      <section className="premium-card mx-auto max-w-2xl rounded-[2rem] p-6">
        <Link href="/" className="soft-button inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
          Back to CaterBidsUK
        </Link>

        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">Report Listing</p>
        <h1 className="mt-2 text-3xl font-black">Report a listing</h1>
        <p className="mt-4 leading-relaxed text-white/70">
          If a listing looks unsafe, misleading or suspicious, use this form to let us know.
          We review every report and will take action if the listing breaches our policies.
        </p>

        {state === "success" ? (
          <div className="mt-8 flex flex-col items-start gap-4">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
            <p className="text-xl font-black text-white">Report received.</p>
            <p className="text-sm leading-6 text-white/68">
              Thank you. We will review this listing and take action if it breaches our policies.
              You do not need to do anything else.
            </p>
            <Link href="/" className="soft-button mt-2 inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
              Back to marketplace
            </Link>
          </div>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit} noValidate>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                Listing URL or title
              </span>
              <input
                name="listingUrl"
                required
                maxLength={500}
                className="premium-input rounded-2xl px-4 py-3 text-sm"
                placeholder="https://caterbids.uk/listing/… or listing title"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                Reason
              </span>
              <select name="reason" className="premium-input rounded-2xl px-4 py-3 text-sm">
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                Details <span className="normal-case font-medium">(optional)</span>
              </span>
              <textarea
                name="details"
                maxLength={1000}
                className="premium-input min-h-28 rounded-2xl px-4 py-3 text-sm"
                placeholder="Describe what concerned you about this listing…"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                Your email <span className="normal-case font-medium">(optional, for follow-up)</span>
              </span>
              <input
                name="reporterEmail"
                type="email"
                maxLength={254}
                className="premium-input rounded-2xl px-4 py-3 text-sm"
                placeholder="you@example.com"
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
              className="premium-button rounded-2xl px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {state === "loading" ? "Submitting…" : "Submit Report"}
            </button>

            <p className="text-xs leading-5 text-white/40">
              Reports are reviewed by our trust team. You can also email{" "}
              <a href="mailto:support@caterbids.uk" className="text-[#FF6B00] hover:underline">
                support@caterbids.uk
              </a>{" "}
              directly.
            </p>
          </form>
        )}
      </section>
    </main>
  )
}
