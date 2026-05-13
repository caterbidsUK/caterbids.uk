import Link from "next/link"

export default function HowItWorksPage() {
  return (
    <main className="app-bg min-h-screen px-4 py-8 text-white">
      <section className="premium-card mx-auto max-w-2xl rounded-[2rem] p-6">
        <Link href="/" className="soft-button inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
          Back to CaterBidsUK
        </Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">How It Works</p>
        <h1 className="mt-2 text-3xl font-black">Search, compare, list for free</h1>
        <div className="mt-5 space-y-4 text-white/70">
          <p>Search CaterBidsUK listings and live marketplace results in one place.</p>
          <p>Save listings and searches with a free account so you can come back later.</p>
          <p>List your own catering equipment, vans or trailers for free during public beta.</p>
        </div>
      </section>
    </main>
  )
}
