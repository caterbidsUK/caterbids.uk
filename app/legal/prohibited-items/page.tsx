import Link from "next/link"

export default function ProhibitedItemsPage() {
  return (
    <main className="app-bg min-h-screen px-4 py-8 text-white">
      <section className="premium-card mx-auto max-w-2xl rounded-[2rem] p-6">
        <Link href="/" className="soft-button inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
          Back to CaterBidsUK
        </Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">Prohibited Items</p>
        <h1 className="mt-2 text-3xl font-black">What cannot be listed</h1>
        <p className="mt-4 leading-relaxed text-white/70">
          Do not list stolen goods, unsafe equipment, illegal items, misleading business sales,
          counterfeit goods, or items you do not have the right to sell.
        </p>
      </section>
    </main>
  )
}
