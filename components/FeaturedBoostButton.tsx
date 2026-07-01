"use client"

import { useState, useEffect } from "react"
import { Star, Zap } from "lucide-react"
import type { PaymentSettings } from "@/lib/pricing"

type Props = {
  listingId: string
  isFeatured: boolean
  featuredUntil: string | null
}

type BoostSettings = Pick<PaymentSettings, "featured_boosts_enabled" | "featured_price_7d" | "featured_price_30d">

function isActivelyFeatured(isFeatured: boolean, featuredUntil: string | null): boolean {
  if (!isFeatured) return false
  if (!featuredUntil) return true
  return new Date(featuredUntil).getTime() > Date.now()
}

export default function FeaturedBoostButton({ listingId, isFeatured, featuredUntil }: Props) {
  const [settings, setSettings] = useState<BoostSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/payment-settings")
      .then((res) => res.json())
      .then((data: { settings?: Partial<PaymentSettings> }) => {
        if (data?.settings) {
          setSettings({
            featured_boosts_enabled: Boolean(data.settings.featured_boosts_enabled),
            featured_price_7d: Number(data.settings.featured_price_7d) || 4.99,
            featured_price_30d: Number(data.settings.featured_price_30d) || 14.99,
          })
        }
      })
      .catch(() => {})
  }, [])

  if (!settings?.featured_boosts_enabled) return null

  if (isActivelyFeatured(isFeatured, featuredUntil)) {
    const expiry = featuredUntil
      ? new Date(featuredUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "ongoing"
    return (
      <div className="rounded-3xl border-2 border-[#FF6B00]/60 bg-gradient-to-br from-[#FF6B00]/15 via-[#FF6B00]/8 to-[#FF6B00]/10 p-5 shadow-[0_12px_40px_rgba(255,107,0,0.18)]">
        <div className="flex items-center gap-2.5">
          <Star className="h-6 w-6 fill-[#FF6B00] text-[#FF6B00]" />
          <p className="text-base font-black uppercase tracking-[0.12em] text-[#FF6B00]">This listing is Featured</p>
        </div>
        <p className="mt-2 text-sm font-semibold text-white/75">
          <Zap className="mr-1 inline h-3.5 w-3.5 text-[#FF6B00]" strokeWidth={2.5} />
          Showing on the homepage &amp; top of search results
        </p>
        <p className="mt-1.5 text-xs font-bold text-white/50">Expires {expiry}</p>
      </div>
    )
  }

  async function boostListing(durationDays: 7 | 30) {
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/create-featured-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, durationDays }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout.")
      window.location.assign(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.")
      setLoading(false)
    }
  }

  return (
    <div className="rounded-3xl border-2 border-[#FF6B00]/70 bg-gradient-to-br from-[#FF6B00]/18 via-[#FF6B00]/10 to-[#FF6B00]/12 p-5 shadow-[0_12px_48px_rgba(255,107,0,0.22)]">
      <div className="mb-2 flex items-center gap-2.5">
        <Star className="h-6 w-6 fill-[#FF6B00] text-[#FF6B00]" />
        <p className="text-base font-black uppercase tracking-[0.12em] text-[#FF6B00]">★ Feature this listing</p>
      </div>
      <p className="mb-5 text-sm font-semibold text-white/80">
        Featured on the homepage &amp; top of search results.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => boostListing(7)}
          className="flex flex-col items-center rounded-2xl border border-[#FF6B00]/45 bg-[#FF6B00]/15 px-3 py-4 transition hover:bg-[#FF6B00]/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-2xl font-black text-white">£{settings.featured_price_7d.toFixed(2)}</span>
          <span className="mt-1 text-xs font-black text-white/75">7 days</span>
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => boostListing(30)}
          className="relative flex flex-col items-center rounded-2xl border border-[#FF6B00]/70 bg-[#FF6B00]/22 px-3 py-4 transition hover:bg-[#FF6B00]/32 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-2xl font-black text-white">£{settings.featured_price_30d.toFixed(2)}</span>
          <span className="mt-1 text-xs font-black text-white/75">30 days</span>
          <span className="mt-0.5 text-[10px] font-black text-[#FF6B00]">Best value</span>
        </button>
      </div>
      {loading && (
        <p className="mt-4 text-center text-xs font-bold text-white/60">Opening checkout…</p>
      )}
      {error && <p className="mt-3 text-xs font-bold text-red-400">{error}</p>}
    </div>
  )
}
