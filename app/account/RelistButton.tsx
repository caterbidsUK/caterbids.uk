"use client"

import { useState } from "react"

export default function RelistButton({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleRelist() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/stripe/create-relist-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout.")
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRelist}
        disabled={loading}
        className="flex items-center gap-1 rounded-xl border border-[#FF6B00]/40 bg-[#FF6B00]/10 px-2.5 py-1.5 text-xs font-black text-[#FF9A4A] transition hover:bg-[#FF6B00]/20 disabled:opacity-60"
      >
        {loading ? "Loading..." : "Relist for £5"}
      </button>
      {error && (
        <p className="text-right text-[11px] font-semibold text-red-400">{error}</p>
      )}
    </div>
  )
}
