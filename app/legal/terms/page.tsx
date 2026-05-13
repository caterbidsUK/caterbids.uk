import Link from "next/link"

export default function TermsPage() {
  return (
    <main className="app-bg min-h-screen px-4 py-8 text-white">
      <section className="premium-card mx-auto max-w-2xl rounded-[2rem] p-6">
        <Link href="/" className="soft-button inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
          Back to CaterBidsUK
        </Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">Terms</p>
        <h1 className="mt-2 text-3xl font-black">Beta terms</h1>
        <p className="mt-4 leading-relaxed text-white/70">
          CaterBidsUK is provided as a public beta marketplace. Users are responsible for checking
          listing accuracy, equipment condition, legal compliance, payment arrangements and collection
          or delivery details before completing any transaction.
        </p>
      </section>
    </main>
  )
}
