import Link from "next/link"
import SiteLogo from "@/components/SiteLogo"
import { ArrowRight, Bot, CheckCircle2, Clock, Store } from "lucide-react"
import { redirect } from "next/navigation"
import { marketplaceIsLive } from "@/lib/launch-gates"

export default function MarketplaceRedirectPage() {
  if (marketplaceIsLive()) {
    redirect("/search?q=all&category=All%20Categories&location=All%20UK")
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(255,107,0,0.18),transparent_34%),linear-gradient(145deg,#001A35_0%,#002E5D_54%,#001427_100%)] text-white">
      <header className="border-b border-white/10 bg-[#001A35]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" aria-label="CaterBidsUK home">
            <SiteLogo size="sm" priority />
          </Link>

          <Link
            href="/blog"
            className="hidden rounded-2xl border border-white/14 bg-white/8 px-5 py-3 text-sm font-black text-white transition hover:border-[#FF6B00]/60 hover:text-[#FFB37A] sm:inline-flex"
          >
            Read the Blog
          </Link>
        </div>
      </header>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/42 bg-[#FF6B00]/14 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#FFB37A]">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Private setup mode
            </span>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl">
              The CaterBids Marketplace Is Opening Soon
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-semibold leading-relaxed text-[#A7B5C9]">
              We&apos;re preparing the UK&apos;s dedicated marketplace for commercial catering equipment, food vans,
              catering trailers and hospitality assets.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#launch-list"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#FF6B00] px-6 text-base font-black text-white shadow-[0_20px_50px_rgba(255,107,0,0.28)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/30"
              >
                Join the Launch List
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/blog"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/8 px-6 text-base font-black text-white transition hover:border-[#FF6B00]/70 hover:bg-white/12 focus:outline-none focus:ring-4 focus:ring-white/15"
              >
                Read the Blog
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/12 bg-[#062747]/88 p-6 shadow-2xl backdrop-blur-md sm:p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF6B00] text-white shadow-[0_18px_45px_rgba(255,107,0,0.28)]">
              <Store className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className="mt-6 text-2xl font-black">Launch preparation underway</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#A7B5C9]">
              The marketplace is currently in private setup mode while we prepare verified listings and seller tools.
            </p>
            <ul className="mt-6 space-y-4">
              {[
                "First listings opening soon",
                "Built for UK restaurants, cafes, takeaways and dealers",
                "CaterBot AI listing help coming at launch",
                "Buy • Sell • Save on commercial catering equipment",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm font-bold text-white/84">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#FF6B00]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 rounded-2xl border border-[#FF6B00]/28 bg-[#FF6B00]/10 p-4">
              <div className="flex items-start gap-3">
                <Bot className="mt-1 h-5 w-5 shrink-0 text-[#FFB37A]" aria-hidden="true" />
                <p className="text-sm font-semibold leading-relaxed text-[#F5F7FB]">
                  Seller tools, verification and CaterBot listing help stay available in local development while public
                  access remains locked for launch.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
