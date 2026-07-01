import Image from "next/image"
import Link from "next/link"
import SiteFooter from "@/components/SiteFooter"
import { ArrowLeft, ClipboardCheck } from "lucide-react"

export default function PalletDeliveryGuidePage() {
  return (
    <>
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,107,0,0.16),_transparent_34%),linear-gradient(135deg,#001A35_0%,#062747_50%,#00142B_100%)] px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl">
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
              Buy • Sell • Save
            </p>
          </div>
        </header>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00] ring-1 ring-[#FF6B00]/25">
              <ClipboardCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Pallet Delivery Guide
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-lg font-semibold leading-relaxed text-[#D5E0EF]">
              How to prepare catering equipment for safe pallet collection.
            </p>
          </div>

          <div className="mt-8">
            <Image
              src="/pallet-prep-guide.png"
              alt="CaterBids pallet collection preparation guide"
              width={1200}
              height={1900}
              priority
              className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 shadow-xl"
            />
          </div>

          <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-5 text-base font-semibold leading-relaxed text-orange-50">
            Sellers must ensure equipment is safely disconnected, cleaned, secured, palletised and shrink-wrapped before collection.
            Poor preparation may delay or cancel courier collection.
          </div>

          <div className="mt-7 flex justify-center">
            <Link
              href="/delivery-policy"
              className="text-sm font-black text-white/55 underline-offset-4 hover:text-white hover:underline"
            >
              Read our full Delivery Policy →
            </Link>
          </div>
        </section>
      </div>
    </main>
    <SiteFooter />
    </>
  )
}
