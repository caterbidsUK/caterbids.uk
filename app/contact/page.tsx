import Link from "next/link"
import type { Metadata } from "next"

const siteUrl = "https://caterbids.uk"

export const metadata: Metadata = {
  title: "Contact Support | CaterBids.UK",
  description:
    "Contact CaterBids.UK support for marketplace account, listing, delivery, payment, safety and business enquiries.",
  alternates: {
    canonical: `${siteUrl}/contact`,
  },
}

export default function ContactPage() {
  return (
    <main className="app-bg min-h-screen px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="soft-button inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
          Back to CaterBidsUK
        </Link>

        <section className="premium-shell mt-6 rounded-[2rem] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">Contact</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">How can we help?</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            Contact CaterBids support for account access, listings, buyer and seller disputes,
            delivery bookings, safety reports, payment questions and business enquiries.
          </p>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="premium-card rounded-3xl p-5 sm:p-6">
            <h2 className="text-xl font-black">Support Email</h2>
            <p className="mt-3 text-sm leading-6 text-white/68">
              Email us from your registered account email and include listing links, screenshots,
              payment references or delivery references where relevant.
            </p>
            <a
              href="mailto:support@caterbids.uk"
              className="premium-button mt-5 inline-flex rounded-2xl px-5 py-3 text-sm font-black text-white"
            >
              support@caterbids.uk
            </a>
          </section>

          <section className="premium-card rounded-3xl p-5 sm:p-6">
            <h2 className="text-xl font-black">Business Contact Form</h2>
            <form className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Name</span>
                <input className="premium-input rounded-2xl px-4 py-3 text-sm" placeholder="Your name" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Email</span>
                <input className="premium-input rounded-2xl px-4 py-3 text-sm" placeholder="you@example.com" type="email" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Topic</span>
                <select className="premium-input rounded-2xl px-4 py-3 text-sm" defaultValue="Support">
                  <option>Support</option>
                  <option>Payment or Stripe question</option>
                  <option>Delivery booking</option>
                  <option>Buyer or seller dispute</option>
                  <option>Safety report</option>
                  <option>Business partnership</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">Message</span>
                <textarea className="premium-input min-h-32 rounded-2xl px-4 py-3 text-sm" placeholder="Tell us what happened..." />
              </label>
              <button type="button" className="premium-button rounded-2xl px-5 py-3 text-sm font-black text-white">
                Send Message
              </button>
              <p className="text-xs leading-5 text-white/45">
                This beta form is prepared for support routing. If it does not submit in your environment,
                email support@caterbids.uk directly.
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
