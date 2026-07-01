"use client"

import { useState } from "react"

export default function SellerPlanCheckoutButton({ planName, featured }: { planName: string; featured?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function startCheckout() {
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/stripe/create-seller-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planName }),
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
    <div className="mt-5">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className={[
          "w-full rounded-2xl bg-[#FF6B00] font-black text-white transition hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-60",
          featured
            ? "px-4 py-4 text-base shadow-[0_20px_45px_rgba(255,107,0,0.35)]"
            : "px-4 py-3 text-sm shadow-lg shadow-[#FF6B00]/25",
        ].join(" ")}
      >
        {loading ? "Opening checkout..." : "Choose plan"}
      </button>
      {error && <p className="mt-2 text-sm font-bold text-red-700">{error}</p>}
    </div>
  )
}
