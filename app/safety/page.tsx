import Link from "next/link"

export default function SafetyPage() {
  return (
    <main className="app-bg min-h-screen px-4 py-8 text-white">
      <section className="premium-card mx-auto max-w-2xl rounded-[2rem] p-6">
        <Link href="/" className="soft-button inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
          Back to CaterBidsUK
        </Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">Safety</p>
        <h1 className="mt-2 text-3xl font-black">Buy and sell carefully</h1>
        <ul className="mt-5 space-y-3 text-white/70">
          <li>Meet in a safe public or business location whenever possible.</li>
          <li>Inspect equipment, serial plates, gas/electrical condition and paperwork before paying.</li>
          <li>Use secure payment methods and avoid sending deposits to unverified sellers.</li>
          <li>Report suspicious listings so CaterBidsUK can review them.</li>
        </ul>
      </section>
    </main>
  )
}
