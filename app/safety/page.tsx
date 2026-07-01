import Link from "next/link"
import SiteFooter from "@/components/SiteFooter"
import { ArrowLeft, ShieldCheck, ArrowRight } from "lucide-react"

export default function SafetyCentrePage() {
  return (
    <>
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,107,0,0.16),_transparent_34%),linear-gradient(135deg,#001A35_0%,#062747_50%,#00142B_100%)] px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to CaterBids
          </Link>
          <div className="text-right">
            <p className="text-lg font-black">
              Cater<span className="text-[#FF6B00]">Bids</span>UK
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#FF6B00]">
              Buy · Sell · Save
            </p>
          </div>
        </header>

        {/* Hero */}
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00] ring-1 ring-[#FF6B00]/25">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-[#FF6B00]">Safety Centre</p>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Safe buying &amp; selling</h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            CaterBids wants every transaction to be safe, fair, and transparent. Whether you&apos;re buying
            used catering equipment or listing your own, our guides cover what to check, your rights under
            UK law, and how to avoid the most common pitfalls.
          </p>
        </section>

        {/* Guide cards */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">

          {/* Buyer Safety Guide — live */}
          <Link
            href="/buyer-safety"
            className="group flex flex-col rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-lg transition hover:border-[#FF6B00]/40 hover:bg-white/[0.09]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00] ring-1 ring-[#FF6B00]/25 transition group-hover:bg-[#FF6B00]/25">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#FF6B00]">For buyers</p>
            <h2 className="mt-1 text-xl font-black text-white">Buyer Safety Guide</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-white/65">
              Your rights under UK law, how to verify a seller, inspect used equipment, pay safely,
              and spot scam red flags.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#FF6B00] transition group-hover:gap-3">
              Read the guide <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          {/* Seller Safety Guide — live */}
          <Link
            href="/seller-safety"
            className="group flex flex-col rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-lg transition hover:border-[#FF6B00]/40 hover:bg-white/[0.09]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00] ring-1 ring-[#FF6B00]/25 transition group-hover:bg-[#FF6B00]/25">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#FF6B00]">For sellers</p>
            <h2 className="mt-1 text-xl font-black text-white">Seller Safety Guide</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-white/65">
              How to write an accurate listing, vet buyers, confirm payment safely, arrange
              collection, and avoid seller-side scams.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#FF6B00] transition group-hover:gap-3">
              Read the guide <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

        </div>

      </div>
    </main>
    <SiteFooter />
    </>
  )
}
