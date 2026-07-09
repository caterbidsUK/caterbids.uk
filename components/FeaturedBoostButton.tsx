"use client"

import { useState, useEffect } from "react"
import { Star, Zap } from "lucide-react"
import type { PaymentSettings } from "@/lib/pricing"

type Props = {
  listingId: string
  isFeatured: boolean
  featuredUntil: string | null
  featuredType?: string | null
}

type BoostSettings = Pick<PaymentSettings, "featured_boosts_enabled" | "featured_price_7d" | "featured_price_30d">

type FMData = {
  isFoundingMember: boolean
  hasFoundingFreeFeature: boolean
}

function isActivelyFeatured(isFeatured: boolean, featuredUntil: string | null): boolean {
  if (!isFeatured) return false
  if (!featuredUntil) return true
  return new Date(featuredUntil).getTime() > Date.now()
}

export default function FeaturedBoostButton({ listingId, isFeatured, featuredUntil, featuredType }: Props) {
  const [settings, setSettings] = useState<BoostSettings | null>(null)
  const [fmData, setFmData] = useState<FMData | null>(null)
  const [confirmAction, setConfirmAction] = useState<"remove" | "move" | null>(null)
  const [fmLoading, setFmLoading] = useState(false)
  const [fmError, setFmError] = useState("")
  const [boostLoading, setBoostLoading] = useState(false)
  const [boostError, setBoostError] = useState("")

  useEffect(() => {
    fetch("/api/payment-settings")
      .then((res) => res.json())
      .then(
        (data: {
          settings?: Partial<PaymentSettings>
          isFoundingMember?: boolean
          hasFoundingFreeFeature?: boolean
        }) => {
          if (data?.settings) {
            setSettings({
              featured_boosts_enabled: Boolean(data.settings.featured_boosts_enabled),
              featured_price_7d: Number(data.settings.featured_price_7d) || 4.99,
              featured_price_30d: Number(data.settings.featured_price_30d) || 14.99,
            })
          }
          setFmData({
            isFoundingMember: Boolean(data?.isFoundingMember),
            hasFoundingFreeFeature: Boolean(data?.hasFoundingFreeFeature),
          })
        },
      )
      .catch(() => {
        setFmData({ isFoundingMember: false, hasFoundingFreeFeature: false })
      })
  }, [])

  async function callFreeFeature(action: "apply" | "move" | "remove") {
    setFmLoading(true)
    setFmError("")
    try {
      const res = await fetch("/api/founding-member/free-feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, listingId }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not update feature slot.")
      window.location.reload()
    } catch (err) {
      setFmError(err instanceof Error ? err.message : "Something went wrong.")
      setFmLoading(false)
      setConfirmAction(null)
    }
  }

  async function boostListing(durationDays: 7 | 30) {
    setBoostError("")
    setBoostLoading(true)
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
      setBoostError(err instanceof Error ? err.message : "Could not start checkout.")
      setBoostLoading(false)
    }
  }

  // ── State 1: THIS listing holds the founding free slot ──────────────────────
  if (featuredType === "founding_free") {
    return (
      <div className="rounded-3xl border-2 border-[#FF6B00]/60 bg-gradient-to-br from-[#FF6B00]/15 via-[#FF6B00]/8 to-[#FF6B00]/10 p-5 shadow-[0_12px_40px_rgba(255,107,0,0.18)]">
        <div className="flex items-center gap-2.5">
          <Star className="h-6 w-6 fill-[#FF6B00] text-[#FF6B00]" />
          <p className="text-base font-black uppercase tracking-[0.12em] text-[#FF6B00]">Founding Member Feature Active</p>
        </div>
        <p className="mt-2 text-sm font-semibold text-white/75">
          <Zap className="mr-1 inline h-3.5 w-3.5 text-[#FF6B00]" strokeWidth={2.5} />
          Your free founding slot is keeping this listing at the top of search.
        </p>
        <div className="mt-4">
          {confirmAction === "remove" ? (
            <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-3">
              <p className="mb-3 text-xs font-bold text-white/70">Remove the founding feature from this listing?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  disabled={fmLoading}
                  className="flex-1 rounded-xl border border-white/20 bg-white/10 py-2 text-xs font-black text-white/80 transition hover:bg-white/15 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => callFreeFeature("remove")}
                  disabled={fmLoading}
                  className="flex-1 rounded-xl border border-red-400/30 bg-red-500/15 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
                >
                  {fmLoading ? "Removing…" : "Confirm remove"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmAction("remove")}
              className="text-xs font-bold text-white/40 transition hover:text-white/65"
            >
              Remove feature
            </button>
          )}
        </div>
        {fmError && <p className="mt-3 text-xs font-bold text-red-400">{fmError}</p>}
      </div>
    )
  }

  // All other states require the API response
  if (fmData === null) return null

  // ── State 2: Actively featured (paid or admin) ───────────────────────────────
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

  // ── State 3: Founding member — free slot available ───────────────────────────
  if (fmData.isFoundingMember && !fmData.hasFoundingFreeFeature) {
    return (
      <div className="rounded-3xl border-2 border-[#FF6B00]/70 bg-gradient-to-br from-[#FF6B00]/18 via-[#FF6B00]/10 to-[#FF6B00]/12 p-5 shadow-[0_12px_48px_rgba(255,107,0,0.22)]">
        <div className="mb-2 flex items-center gap-2.5">
          <Star className="h-6 w-6 fill-[#FF6B00] text-[#FF6B00]" />
          <p className="text-base font-black uppercase tracking-[0.12em] text-[#FF6B00]">Free Founding Member feature</p>
        </div>
        <p className="mb-5 text-sm font-semibold text-white/80">
          As a Founding Member, you have one free featured listing slot. Apply it here — no payment needed.
        </p>
        <button
          type="button"
          disabled={fmLoading}
          onClick={() => callFreeFeature("apply")}
          className="w-full rounded-2xl border border-[#FF6B00]/60 bg-[#FF6B00]/20 py-3 text-sm font-black text-white shadow-[0_4px_16px_rgba(255,107,0,0.25)] transition hover:bg-[#FF6B00]/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {fmLoading ? "Applying…" : "Feature this listing — free"}
        </button>
        {fmError && <p className="mt-3 text-xs font-bold text-red-400">{fmError}</p>}
      </div>
    )
  }

  // ── State 4: Founding member — slot already used on another listing ──────────
  if (fmData.isFoundingMember && fmData.hasFoundingFreeFeature) {
    return (
      <div className="rounded-3xl border-2 border-[#FF6B00]/40 bg-gradient-to-br from-[#FF6B00]/10 via-[#FF6B00]/6 to-[#FF6B00]/8 p-5 shadow-[0_8px_32px_rgba(255,107,0,0.14)]">
        <div className="mb-2 flex items-center gap-2.5">
          <Star className="h-6 w-6 text-[#FF6B00]" />
          <p className="text-base font-black uppercase tracking-[0.12em] text-[#FF6B00]">Feature this listing</p>
        </div>
        <p className="mb-4 text-sm font-semibold text-white/70">
          Your free founding slot is in use on another listing. Move it here instead?
        </p>
        {confirmAction === "move" ? (
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-3">
            <p className="mb-3 text-xs font-bold text-white/70">Move the founding feature to this listing? The other listing will no longer be featured.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={fmLoading}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 py-2 text-xs font-black text-white/80 transition hover:bg-white/15 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => callFreeFeature("move")}
                disabled={fmLoading}
                className="flex-1 rounded-xl border border-[#FF6B00]/50 bg-[#FF6B00]/20 py-2 text-xs font-black text-white transition hover:bg-[#FF6B00]/30 disabled:opacity-50"
              >
                {fmLoading ? "Moving…" : "Confirm move"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmAction("move")}
            className="w-full rounded-2xl border border-[#FF6B00]/50 bg-[#FF6B00]/15 py-3 text-sm font-black text-white transition hover:bg-[#FF6B00]/25"
          >
            Feature this listing instead →
          </button>
        )}
        {fmError && <p className="mt-3 text-xs font-bold text-red-400">{fmError}</p>}
      </div>
    )
  }

  // ── State 5: Non-founding member — paid boost ────────────────────────────────
  if (!settings?.featured_boosts_enabled) return null

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
          disabled={boostLoading}
          onClick={() => boostListing(7)}
          className="flex flex-col items-center rounded-2xl border border-[#FF6B00]/45 bg-[#FF6B00]/15 px-3 py-4 transition hover:bg-[#FF6B00]/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-2xl font-black text-white">£{settings.featured_price_7d.toFixed(2)}</span>
          <span className="mt-1 text-xs font-black text-white/75">7 days</span>
        </button>
        <button
          type="button"
          disabled={boostLoading}
          onClick={() => boostListing(30)}
          className="relative flex flex-col items-center rounded-2xl border border-[#FF6B00]/70 bg-[#FF6B00]/22 px-3 py-4 transition hover:bg-[#FF6B00]/32 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-2xl font-black text-white">£{settings.featured_price_30d.toFixed(2)}</span>
          <span className="mt-1 text-xs font-black text-white/75">30 days</span>
          <span className="mt-0.5 text-[10px] font-black text-[#FF6B00]">Best value</span>
        </button>
      </div>
      {boostLoading && (
        <p className="mt-4 text-center text-xs font-bold text-white/60">Opening checkout…</p>
      )}
      {boostError && <p className="mt-3 text-xs font-bold text-red-400">{boostError}</p>}
    </div>
  )
}
