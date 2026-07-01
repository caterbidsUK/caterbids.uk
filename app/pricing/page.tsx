import Link from "next/link"
import SiteLogo from "@/components/SiteLogo"
import type { Metadata } from "next"
import SiteFooter from "@/components/SiteFooter"
import {
  BadgePoundSterling,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flag,
  ListChecks,
  Menu,
  Rocket,
  ShieldCheck,
  Tags,
  TrendingUp,
} from "lucide-react"
import { SELLER_PLANS, type SellerPlan, formatPlanPrice, normaliseSellerPlan } from "@/lib/pricing"
import { createClient } from "@/lib/supabase/server"
import SellerPlanCheckoutButton from "./SellerPlanCheckoutButton"

export const metadata: Metadata = {
  title: "CaterBidsUK Seller Pricing",
  description:
    "Simple pricing for UK catering equipment sellers. First 100 listings free, no seller success fees and no final value fees.",
}

const packIcons = [ListChecks, CalendarDays, Tags]
const planIcons = [Rocket, TrendingUp, ShieldCheck]
const searchAllHref = "/search?q=all&category=All%20Categories&location=All%20UK"
const sellHref = "/post-listing"

// ── Nav ─────────────────────────────────────────────────────────────────────

function PricingNav({
  accountHref,
  accountLabel,
}: {
  accountHref: string
  accountLabel: string
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#001225]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <Link href="/" aria-label="CaterBidsUK home">
          <SiteLogo size="sm" />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-black text-white/80 lg:flex" aria-label="Primary">
          <Link className="transition hover:text-[#FF6B00]" href="/">Home</Link>
          <Link className="transition hover:text-[#FF6B00]" href={searchAllHref}>Marketplace</Link>
          <Link className="transition hover:text-[#FF6B00]" href="/blog">Blog</Link>
          <Link className="transition hover:text-[#FF6B00]" href={sellHref}>Sell</Link>
          <Link className="text-[#FF6B00]" href="/pricing">Pricing</Link>
          <Link className="transition hover:text-[#FF6B00]" href={accountHref}>{accountLabel}</Link>
          <Link
            href={sellHref}
            className="rounded-2xl bg-[#FF6B00] px-4 py-2.5 text-white shadow-[0_12px_30px_rgba(255,107,0,0.28)] transition hover:brightness-110"
          >
            Start Free Listing
          </Link>
        </nav>

        <details className="relative lg:hidden">
          <summary className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-full border border-white/20 bg-white/8 text-white [&::-webkit-details-marker]:hidden">
            <Menu className="h-6 w-6" strokeWidth={2.2} />
          </summary>
          <div className="absolute right-0 top-16 z-30 w-64 rounded-3xl border border-white/14 bg-[#001a34]/96 p-3 shadow-2xl backdrop-blur-xl">
            {(
              [
                ["Home", "/"],
                ["Marketplace", searchAllHref],
                ["Blog", "/blog"],
                ["Sell an Item", sellHref],
                ["Pricing", "/pricing"],
                [accountLabel, accountHref],
                ["About", "/about"],
                ["Contact", "/contact"],
              ] as [string, string][]
            ).map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black text-white transition hover:bg-white/8 hover:text-[#FF6B00]"
              >
                {label}
                <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
              </Link>
            ))}
          </div>
        </details>
      </div>
    </header>
  )
}

// ── Pricing card ─────────────────────────────────────────────────────────────

function PricingCard({
  plan,
  index,
  featured,
}: {
  plan: SellerPlan
  index: number
  featured?: boolean
}) {
  const Icon = plan.monthly ? planIcons[index] || ShieldCheck : packIcons[index] || ListChecks

  return (
    <div className="relative flex flex-col">
      {featured && (
        <div className="absolute -top-4 left-0 right-0 z-10 flex justify-center">
          <span className="rounded-full bg-[#FF6B00] px-4 py-1 text-xs font-black uppercase tracking-widest text-white shadow-lg">
            Most Popular
          </span>
        </div>
      )}
      <article
        className={[
          "flex h-full flex-col rounded-[1.75rem] bg-white p-6 text-center text-[#001A35]",
          featured
            ? "scale-[1.04] shadow-[0_32px_80px_rgba(255,107,0,0.22)] ring-2 ring-[#FF6B00]"
            : "shadow-2xl shadow-black/20 ring-1 ring-white/70",
        ].join(" ")}
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#002E5D] text-white shadow-lg">
          <Icon className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-[-0.03em]">{plan.name}</h2>
        <div className="mx-auto mt-4 h-px w-36 bg-[#FF6B00]/45" />
        <p className="mt-5 text-5xl font-black tracking-[-0.06em] text-[#FF6B00]">
          {formatPlanPrice(plan)}
        </p>
        <ul className="mt-5 flex-1 space-y-2 text-base font-semibold leading-tight text-[#001A35]/85">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#FF6B00]" strokeWidth={2.2} />
              {feature}
            </li>
          ))}
        </ul>
        <SellerPlanCheckoutButton planName={plan.name} featured={featured} />
      </article>
    </div>
  )
}

// ── Founding member hero ──────────────────────────────────────────────────────

function FoundingMemberHero({
  plan,
  remaining,
  cap,
}: {
  plan: SellerPlan
  remaining: number
  cap: number
}) {
  return (
    <section className="mt-10 overflow-hidden rounded-[2rem] border-2 border-[#FF6B00] bg-[linear-gradient(135deg,#071e3d_0%,#0a2d58_60%,#071e3d_100%)] shadow-[0_32px_90px_rgba(255,107,0,0.18)]">
      <div className="px-6 py-10 sm:px-10 md:flex md:items-center md:gap-10">
        <div className="mx-auto mb-6 flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-[#FF6B00] bg-[#FF6B00]/12 md:mx-0 md:mb-0">
          <Crown className="h-12 w-12 text-[#FF6B00]" strokeWidth={1.7} />
        </div>

        <div className="flex-1 text-center md:text-left">
          <span className="inline-block rounded-full bg-[#FF6B00] px-4 py-1 text-xs font-black uppercase tracking-widest text-white">
            Limited Founding Offer
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl">
            {plan.name}
          </h2>
          <p className="mt-2 text-xl font-black text-[#FF6B00]">
            {formatPlanPrice(plan)}{" "}
            <span className="text-base font-semibold text-white/70">· one-time · lifetime access</span>
          </p>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.22em] text-[#FF6B00]/80">
            Only {remaining} of {cap} spots remaining
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-white/85 md:justify-start">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#FF6B00]" strokeWidth={2.2} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-7 shrink-0 text-center md:mt-0 md:min-w-[200px]">
          {remaining > 0 ? (
            <SellerPlanCheckoutButton planName={plan.name} featured />
          ) : (
            <p className="rounded-2xl border border-white/20 px-8 py-4 text-sm font-black text-white/50">
              Sold out
            </p>
          )}
          <p className="mt-3 text-xs font-semibold text-white/45">Secure checkout · One-time payment</p>
        </div>
      </div>
    </section>
  )
}

// ── eBay comparison ───────────────────────────────────────────────────────────

function EbayComparison() {
  const rows = [
    { sale: "£500", ebay: "~£64" },
    { sale: "£2,000", ebay: "~£256" },
    { sale: "£5,000", ebay: "~£640" },
  ]

  return (
    <section className="mt-12">
      <div className="text-center">
        <h2 className="text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl">
          Why not just use eBay?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg font-semibold text-white/70">
          eBay charges a final value fee on every sale. CaterBidsUK charges zero.
        </p>
      </div>

      <div className="mt-7 overflow-hidden rounded-[1.75rem] border border-white/14 bg-[#031d38]/80 shadow-xl">
        <div className="grid grid-cols-3 border-b border-white/10 bg-[#002E5D]/60 px-6 py-4 text-sm font-black uppercase tracking-widest text-white/60">
          <span>Sale value</span>
          <span className="text-center text-red-400">eBay fee (~12.8%)</span>
          <span className="text-right text-[#FF6B00]">CaterBids fee</span>
        </div>
        {rows.map(({ sale, ebay }, i) => (
          <div
            key={sale}
            className={[
              "grid grid-cols-3 items-center px-6 py-5 text-lg font-black",
              i < rows.length - 1 ? "border-b border-white/8" : "",
            ].join(" ")}
          >
            <span className="text-white">{sale}</span>
            <span className="text-center text-red-400 line-through opacity-80">{ebay}</span>
            <span className="text-right text-[#FF6B00]">£0</span>
          </div>
        ))}
        <p className="border-t border-white/8 px-6 py-3 text-xs font-semibold text-white/40">
          eBay rates based on standard Business seller final value fees (approx. 12.8%). Actual fees vary by category and account tier.
        </p>
      </div>
    </section>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SellerPricingPage() {
  const supabase = await createClient()

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData.user?.id || null
  const accountHref = userId ? "/account" : "/login?next=%2Faccount"
  const accountLabel = userId ? "Account" : "Sign In"

  let plans: SellerPlan[] = SELLER_PLANS.filter((p) => p.active)
  try {
    const { data } = await (supabase.from("seller_plans" as never) as any)
      .select("*")
      .eq("active", true)
      .order("price", { ascending: true })
    if (data?.length) {
      plans = data.map(normaliseSellerPlan)
    }
  } catch {
    // keep fallback
  }

  const foundingPlan = plans.find((p) => p.type === "founding_member")
  let foundingRemaining = 0
  let foundingCap = 100
  if (foundingPlan) {
    try {
      const { data: counterData } = await (supabase.from("founding_member_counter" as never) as any)
        .select("cap,sold")
        .limit(1)
      if (counterData?.[0]) {
        foundingCap = Number(counterData[0].cap)
        foundingRemaining = Math.max(0, foundingCap - Number(counterData[0].sold))
      }
    } catch {
      foundingRemaining = 100
    }
  }

  const listingPacks = plans.filter((p) => p.type === "single_pack")
  const monthlyPlans = plans.filter((p) => p.type === "subscription")

  // Pro Plan: middle subscription by price (typically £24.99)
  const proIndex = monthlyPlans.reduce<number>(
    (best, p, i) => (p.price > 20 && p.price < 35 ? i : best),
    -1
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#083D70_0,#001A35_42%,#000B18_100%)] text-white">
      <PricingNav accountHref={accountHref} accountLabel={accountLabel} />

      {/* Hero strip */}
      <section className="border-b border-white/10 px-5 pb-10 pt-12 text-center">
        <span className="inline-block rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/10 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-[#FF6B00]">
          BUY • SELL • SAVE
        </span>
        <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] sm:text-5xl lg:text-6xl">
          CaterBidsUK Seller Pricing
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-xl font-semibold text-white/75">
          Simple, transparent pricing for UK catering equipment sellers. No final value fees — ever.
        </p>
      </section>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-2 sm:px-6 lg:px-8">
        {/* Launch offer */}
        <div className="mt-8 rounded-[1.75rem] border-2 border-white bg-[#FF6B00] px-6 py-6 text-center shadow-2xl shadow-[#FF6B00]/25 md:flex md:items-center md:justify-center md:gap-8 md:text-left">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white text-[#FF6B00] md:mx-0">
            <BadgePoundSterling className="h-12 w-12" />
          </div>
          <div>
            <p className="mt-4 text-4xl font-black uppercase tracking-[-0.05em] md:mt-0 lg:text-5xl">
              First 100 listings free
            </p>
            <p className="mt-2 text-xl font-black text-[#001A35]">
              No seller success fees • Keep 100% of your sale
            </p>
          </div>
        </div>

        {/* Founding member */}
        {foundingPlan && (
          <FoundingMemberHero
            plan={foundingPlan}
            remaining={foundingRemaining}
            cap={foundingCap}
          />
        )}

        {/* Listing packs */}
        {listingPacks.length > 0 && (
          <section className="mt-12">
            <h2 className="text-center text-3xl font-black tracking-[-0.045em]">Listing Packs</h2>
            <p className="mt-2 text-center text-base font-semibold text-white/65">
              Pay once, list multiple items. No recurring charges.
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {listingPacks.map((plan, index) => (
                <PricingCard key={plan.name} plan={plan} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Monthly plans */}
        {monthlyPlans.length > 0 && (
          <section className="mt-14">
            <h2 className="text-center text-3xl font-black tracking-[-0.045em]">Monthly Plans</h2>
            <p className="mt-2 text-center text-base font-semibold text-white/65">
              Unlimited access for active sellers. Cancel anytime.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {monthlyPlans.map((plan, index) => (
                <PricingCard
                  key={plan.name}
                  plan={plan}
                  index={index}
                  featured={index === proIndex}
                />
              ))}
            </div>
          </section>
        )}

        <EbayComparison />

        {/* Trust row */}
        <div className="mt-10 grid gap-4 rounded-[1.5rem] border border-[#FF6B00]/80 bg-[#002E5D]/70 p-5 text-lg font-black shadow-xl shadow-black/20 md:grid-cols-3">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#FF6B00] text-[#FF6B00]">
              <BadgePoundSterling className="h-8 w-8" />
            </span>
            <span>No seller success fees</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#FF6B00] text-[#FF6B00]">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <span>Keep 100% of your sale</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#FF6B00] text-[#FF6B00]">
              <Flag className="h-8 w-8" />
            </span>
            <span>Built for UK catering equipment</span>
          </div>
        </div>

        {/* Final CTA */}
        <Link
          href="/post-listing"
          className="mt-6 flex items-center justify-between gap-4 rounded-[1.5rem] border border-[#FF6B00] bg-[#002E5D]/75 px-5 py-5 text-white shadow-xl shadow-black/25 transition hover:bg-[#07345f] focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/35"
        >
          <span className="flex items-center gap-4 text-2xl font-black tracking-[-0.04em] md:text-4xl">
            <span className="text-[#FF6B00]">
              <Tags className="h-10 w-10" />
            </span>
            List for free on CaterBidsUK
          </span>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#FF6B00] text-3xl font-black">
            →
          </span>
        </Link>
      </div>

      <SiteFooter />
    </main>
  )
}
