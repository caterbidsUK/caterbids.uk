"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { PlanUsageResponse } from "@/app/api/account/plan-usage/route"

type State =
  | { status: "loading" }
  | { status: "ok"; data: PlanUsageResponse }
  | { status: "error" }

function Skeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#062747]/60 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="h-5 w-36 animate-pulse rounded bg-white/10" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
          <div className="h-9 w-24 animate-pulse rounded-xl bg-white/10" />
        </div>
      </div>
    </div>
  )
}

function PlanPill({ planType, planName }: { planType: PlanUsageResponse["planType"]; planName: string }) {
  const isFoundingOrSubscription = planType === "founding" || planType === "subscription"
  const isNone = planType === "none"

  if (isNone) return null

  return (
    <span
      className={
        isFoundingOrSubscription
          ? "inline-flex items-center rounded-full border border-[#FF6B00]/40 bg-[#002E5D] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#FF6B00]"
          : "inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/60"
      }
    >
      {planName}
    </span>
  )
}

export default function PlanUsageStrip() {
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    fetch("/api/account/plan-usage")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: PlanUsageResponse) => setState({ status: "ok", data }))
      .catch(() => setState({ status: "error" }))
  }, [])

  if (state.status === "loading") return <Skeleton />
  if (state.status === "error") return null

  const { planType, planName, remainingLabel, expiryLabel, buyMoreHref } = state.data

  if (planType === "none") {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#062747]/60 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-bold text-white/50">No active plan</p>
            <p className="text-xs text-white/30">Purchase a listing pack or subscription to start selling</p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#e85f00]"
          >
            Choose a plan →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#062747]/60 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: pill + remaining */}
        <div className="flex flex-wrap items-center gap-2.5">
          <PlanPill planType={planType} planName={planName} />
          <span className="text-sm font-bold text-white">{remainingLabel}</span>
        </div>

        {/* Right: expiry + action */}
        <div className="flex items-center gap-3">
          {expiryLabel && (
            <span className="text-xs font-semibold text-white/40">{expiryLabel}</span>
          )}
          <Link
            href={buyMoreHref}
            className="inline-flex items-center justify-center rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#e85f00]"
          >
            {planType === "pack" ? "Buy more →" : "Post a listing →"}
          </Link>
        </div>
      </div>
    </div>
  )
}
