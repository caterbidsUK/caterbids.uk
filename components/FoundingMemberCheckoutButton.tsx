"use client"

import { useState } from "react"

export default function FoundingMemberCheckoutButton({
  soldCount,
  cap = 100,
}: {
  soldCount: number
  cap?: number
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const remaining = Math.max(0, cap - soldCount)
  const soldOut = remaining === 0

  async function startCheckout() {
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/stripe/create-seller-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName: "Founding Trade Member" }),
      })
      const payload = (await response.json()) as { url?: string; redirectTo?: string; error?: string }

      if (response.status === 401) {
        window.location.assign(`/login?next=${encodeURIComponent("/pricing")}`)
        return
      }
      if (payload.redirectTo) {
        window.location.assign(payload.redirectTo)
        return
      }
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Could not start checkout.")
      }
      window.location.assign(payload.url)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not start checkout.")
      setLoading(false)
    }
  }

  return (
    <div className="mt-5 space-y-2">
      {!soldOut && (
        <p className="text-center text-sm font-bold text-[#001A35]/70">
          {remaining} of {cap} spots remaining
        </p>
      )}
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading || soldOut}
        className="w-full rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {soldOut ? "Sold out" : loading ? "Opening checkout…" : "Claim your membership: £249"}
      </button>
      {error && <p className="text-sm font-bold text-red-700">{error}</p>}
    </div>
  )
}
