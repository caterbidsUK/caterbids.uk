import type { Metadata } from "next"
import Link from "next/link"

const siteUrl = "https://caterbids.uk"

export const metadata: Metadata = {
  title: "Terms of Service | CaterBids.UK",
  description:
    "CaterBids.UK marketplace terms covering buyer checks, seller responsibility, Stripe payments, third-party delivery, disputes and account rules.",
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
}

const terms = [
  {
    title: "Marketplace Role",
    body:
      "CaterBids.UK is a marketplace platform for catering equipment, catering vans, trailers and related business listings. CaterBids is not the seller, buyer, manufacturer, installer, engineer, courier or payment card provider for user listings.",
  },
  {
    title: "Buyer Responsibility",
    body:
      "Buyers are responsible for checking equipment condition, dimensions, power type, gas type, phase, installation requirements, safety, suitability, warranty status and delivery access before completing a purchase.",
  },
  {
    title: "Seller Responsibility",
    body:
      "Sellers are responsible for accurate listing descriptions, images, prices, VAT status, ownership, safety information, collection details and any warranty or service-history claims.",
  },
  {
    title: "Condition And Liability",
    body:
      "CaterBids does not guarantee the condition, legality, safety, performance, installation suitability or profitability of any listed equipment, vehicle, trailer or business. Users should inspect items and use qualified engineers where appropriate.",
  },
  {
    title: "Stripe Payments",
    body:
      "Marketplace payments may be processed by Stripe. Stripe may perform fraud checks, identity checks, payment authorisation, settlement, refunds and chargeback handling. Additional Stripe terms may apply.",
  },
  {
    title: "Delivery And Third Parties",
    body:
      "Delivery quotes, bookings, tracking and freight services may be provided by third-party couriers, pallet networks or logistics partners. Delivery times, damage claims and restrictions are subject to the relevant provider rules.",
  },
  {
    title: "Disputes",
    body:
      "If a buyer and seller disagree, they should first attempt to resolve the issue directly. CaterBids support may review evidence, listing details, messages, payment records and delivery records, but does not replace legal advice or court processes.",
  },
  {
    title: "Fraud, Spam And Account Bans",
    body:
      "CaterBids may suspend, restrict or remove accounts, listings or messages linked to fraud, spam, unsafe behaviour, prohibited items, misleading listings, abusive conduct, payment misuse or platform circumvention.",
  },
]

export default function TermsPage() {
  return (
    <main className="app-bg min-h-screen px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="soft-button inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
          Back to CaterBidsUK
        </Link>

        <section className="premium-shell mt-6 rounded-[2rem] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">Terms</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">CaterBids marketplace terms</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            These terms set out the rules for using CaterBids.UK as a buyer, seller or visitor.
            By using CaterBids, you agree to use the marketplace lawfully and responsibly.
          </p>
          <p className="mt-4 text-xs font-semibold text-white/45">Last updated: 8 May 2026</p>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {terms.map((term) => (
            <section key={term.title} className="premium-card rounded-3xl p-5">
              <h2 className="text-lg font-black text-white">{term.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/68">{term.body}</p>
            </section>
          ))}
        </div>

        <section className="premium-card mt-6 rounded-3xl border-[#FF6B00]/25 p-5 sm:p-6">
          <h2 className="text-xl font-black">Professional Buyer Note</h2>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Catering equipment can require specialist gas, electrical, extraction, refrigeration or hygiene
            checks. Buyers should confirm compliance before installing or operating equipment.
          </p>
        </section>
      </div>
    </main>
  )
}
