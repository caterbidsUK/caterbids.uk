"use client"

import { BadgeCheck, Building2, ShieldCheck, Star, Zap } from "lucide-react"
import type { ReactNode } from "react"
import { buildSellerTrustSummary, formatUKDate, type SellerTrustInput, type TrustBadgeKey } from "@/lib/trust/badges"

type SellerTrustCardProps = {
  sellerName?: string | null
  createdAt?: string | null
  trust: SellerTrustInput
  compact?: boolean
}

const badgeIcon: Record<TrustBadgeKey, ReactNode> = {
  verified_user: <BadgeCheck className="h-3.5 w-3.5" />,
  id_verified: <ShieldCheck className="h-3.5 w-3.5" />,
  verified_business: <Building2 className="h-3.5 w-3.5" />,
  top_rated: <Star className="h-3.5 w-3.5" />,
  fast_responder: <Zap className="h-3.5 w-3.5" />,
  trusted_seller: <ShieldCheck className="h-3.5 w-3.5" />,
}

export default function SellerTrustCard({ sellerName, createdAt, trust, compact = false }: SellerTrustCardProps) {
  const summary = buildSellerTrustSummary({ ...trust, createdAt })
  const visibleBadges = summary.badges.length > 0 ? summary.badges : [{
    key: "verified_user" as const,
    label: trust.emailVerified ? "Email verified" : "New seller",
    description: trust.emailVerified
      ? "This account has verified email ownership."
      : "This seller is building their CaterBidsUK trust profile.",
  }]

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white p-5 text-[#002E5D] shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF6B00]">
            Verified by CaterBidsUK
          </p>
          <h2 className="mt-1 text-xl font-black">{sellerName || "Seller trust"}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Joined {formatUKDate(createdAt)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#002E5D] p-3 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {visibleBadges.map((badge) => (
          <span
            key={badge.key}
            title={badge.description}
            className="inline-flex items-center gap-1 rounded-full border border-[#002E5D]/10 bg-[#002E5D]/5 px-3 py-1.5 text-xs font-black text-[#002E5D]"
          >
            {badgeIcon[badge.key]}
            {badge.label}
          </span>
        ))}
      </div>

      {!compact && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-lg font-black">{summary.ratingLabel}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Rating</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-lg font-black">{summary.completedSales}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Sales</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-sm font-black leading-5">{summary.responseLabel}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Messages</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-[#002E5D]/5 p-4">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide">
              <span>Trust profile</span>
              <span className="text-[#FF6B00]">{summary.progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-[#FF6B00]"
                style={{ width: `${summary.progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-600">{summary.progressText}</p>
          </div>
        </>
      )}
    </section>
  )
}
