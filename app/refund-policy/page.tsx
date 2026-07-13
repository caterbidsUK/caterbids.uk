import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import SiteFooter from "@/components/SiteFooter"

export const metadata: Metadata = {
  title: "Refund & Returns Policy | CaterBids.uk",
  description:
    "Refund and returns policy for CaterBids.uk — the UK marketplace for used catering equipment. Operated by Colt Price trading as CaterBids.uk.",
}

export default function RefundPolicyPage() {
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

        {/* Page header */}
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FF6B00]">Legal</p>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Refund &amp; Returns Policy</h1>
          <p className="mt-3 text-xs font-semibold text-white/45">Last updated: 25 June 2026</p>
          <div className="mt-4 rounded-2xl border border-[#FF6B00]/20 bg-[#FF6B00]/[0.06] px-4 py-3 text-sm font-semibold leading-relaxed text-white/70">
            This policy is provided in good faith and is being finalised. If you have any questions,
            contact{" "}
            <a href="mailto:support@caterbids.uk" className="font-black text-[#FF6B00] hover:underline">
              support@caterbids.uk
            </a>
            .
          </div>
          <div className="mt-4 space-y-1 text-sm font-semibold text-white/55">
            <p>Colt Price, sole trader trading as CaterBids.uk</p>
            <p>Greyfriars House, Birmingham, B37 5HY</p>
            <p>
              <a href="mailto:support@caterbids.uk" className="hover:text-[#FF6B00]">
                support@caterbids.uk
              </a>
            </p>
            <p>
              <a href="https://caterbids.uk" className="hover:text-[#FF6B00]">
                https://caterbids.uk
              </a>
            </p>
          </div>
        </section>

        {/* Body — content drops in here */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <div className="prose-legal">
            <p className="text-sm leading-relaxed text-white/60 italic">[CONTENT GOING IN NEXT]</p>
          </div>
        </section>

      </div>
    </main>
    <SiteFooter />
    </>
  )
}
