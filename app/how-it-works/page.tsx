import type { Metadata } from "next"
import Link from "next/link"
import SiteFooter from "@/components/SiteFooter"

export const metadata: Metadata = {
  title: "How It Works: Buy and Sell Catering Equipment | CaterBids UK",
  description:
    "Search new and used catering equipment listings, save favourites and list your kit. CaterBids UK brings buyers and sellers together in one place.",
}

export default function HowItWorksPage() {
  return (
    <>
    <main className="app-bg min-h-screen px-4 py-8 text-white">
      <section className="premium-card mx-auto max-w-2xl rounded-[2rem] p-6">
        <Link href="/" className="soft-button inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
          Back to CaterBidsUK
        </Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">How It Works</p>
        <h1 className="mt-2 text-3xl font-black">Search, compare, list your kit</h1>
        <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-[#FF6B00]">
          The UK Marketplace for Catering Equipment
        </p>
        <div className="mt-5 space-y-4 text-white/70">
          <p>Search CaterBidsUK listings and live marketplace results in one place.</p>
          <p>Save listings and searches with a free account so you can come back later.</p>
          <p>List your catering equipment, vans or trailers. Your first listing is free, then £5 for 30 days.</p>
        </div>
      </section>
    </main>
    <SiteFooter />
    </>
  )
}
