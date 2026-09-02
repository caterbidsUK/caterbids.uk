import type { Metadata } from "next"
import Link from "next/link"
import SiteFooter from "@/components/SiteFooter"

export const metadata: Metadata = {
  title: "About CaterBids UK | Zero-Fee Catering Equipment Marketplace",
  description:
    "CaterBids UK is a free marketplace for buying and selling commercial catering equipment, vans and hospitality assets across the UK.",
}

export default function AboutPage() {
  return (
    <>
    <main className="app-bg min-h-screen px-4 py-8 text-white">
      <section className="premium-card mx-auto max-w-2xl rounded-[2rem] p-6">
        <Link href="/" className="soft-button inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
          Back to CaterBidsUK
        </Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">About</p>
        <h1 className="mt-2 text-3xl font-black">CaterBidsUK</h1>
        <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-[#FF6B00]">
          The UK Marketplace for Catering Equipment
        </p>
        <p className="mt-4 leading-relaxed text-white/70">
          I&rsquo;m Colt. I&rsquo;ve spent twenty five years in commercial kitchens doing stainless
          fabrication, installation and commercial gas. I&rsquo;ve fitted kit, ripped it out, and
          watched perfectly good machines go for scrap because there was nowhere sensible to sell them.
        </p>
        <p className="mt-4 leading-relaxed text-white/70">
          That&rsquo;s why CaterBids exists.
        </p>
        <p className="mt-4 leading-relaxed text-white/70">
          Most places that say they buy your catering equipment are clearance firms. They give you a
          trade-in price, collect it, and sell it on at full retail. CaterBids is not that. You list
          your own kit, you set your own price, and buyers come to you directly.
        </p>
        <p className="mt-4 leading-relaxed text-white/70">
          We cover new and used commercial catering equipment, catering vans, trailers and catering
          businesses, across the UK.
        </p>
        <p className="mt-4 leading-relaxed text-white/70">
          There&rsquo;s no commission and no final value fee. When it sells, every pound is yours.
          Your first listing is free, then it&rsquo;s &pound;5 for 30 days. That&rsquo;s the whole cost.
        </p>
        <p className="mt-4 leading-relaxed text-white/70">
          We&rsquo;re in public beta. If something doesn&rsquo;t work, tell me and I&rsquo;ll fix it.
        </p>
      </section>
    </main>
    <SiteFooter />
    </>
  )
}
