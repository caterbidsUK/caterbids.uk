import type { Metadata } from "next"
import Link from "next/link"

const siteUrl = "https://caterbids.uk"

export const metadata: Metadata = {
  title: "Refunds And Disputes | CaterBids.UK",
  description:
    "CaterBids.UK refund policy covering marketplace fees, delivery rules, buyer and seller disputes, Stripe refunds and chargebacks.",
  alternates: {
    canonical: `${siteUrl}/refunds`,
  },
}

const refundRules = [
  {
    title: "Marketplace Fees",
    body:
      "Marketplace fees, listing upgrades, promotion fees or service charges may be non-refundable once a service has been provided, unless required by law or explicitly stated otherwise.",
  },
  {
    title: "Item Refunds",
    body:
      "CaterBids is a marketplace. Item refunds are primarily handled between the buyer and seller, subject to the listing terms, evidence, payment status and applicable consumer or business law.",
  },
  {
    title: "Delivery Refunds",
    body:
      "Delivery refunds, failed collection charges, delays, damage claims and surcharges are subject to the rules of the courier, pallet network or delivery provider used for the booking.",
  },
  {
    title: "Dispute Support",
    body:
      "CaterBids support may review listing information, messages, payment records, delivery records and evidence supplied by both sides to help resolve marketplace disputes.",
  },
  {
    title: "Stripe Refunds And Chargebacks",
    body:
      "Where Stripe is used, refunds and chargebacks may be processed through Stripe. Card networks and Stripe may require evidence and may make final decisions on chargeback outcomes.",
  },
  {
    title: "Fraud Or Misuse",
    body:
      "Refunds may be refused, accounts may be restricted, and evidence may be retained where fraud, spam, false claims, prohibited items or payment abuse is suspected.",
  },
]

export default function RefundsPage() {
  return (
    <main className="app-bg min-h-screen px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="soft-button inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
          Back to CaterBidsUK
        </Link>

        <section className="premium-shell mt-6 rounded-[2rem] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">Refunds</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Refunds, delivery issues and disputes</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            This policy explains how CaterBids handles marketplace fees, item disputes, delivery issues,
            Stripe refunds and card chargebacks.
          </p>
          <p className="mt-4 text-xs font-semibold text-white/45">Last updated: 8 May 2026</p>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {refundRules.map((rule) => (
            <section key={rule.title} className="premium-card rounded-3xl p-5">
              <h2 className="text-lg font-black text-white">{rule.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/68">{rule.body}</p>
            </section>
          ))}
        </div>

        <section className="premium-card mt-6 rounded-3xl border-[#FF6B00]/25 p-5 sm:p-6">
          <h2 className="text-xl font-black">Need Help With A Dispute?</h2>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Email{" "}
            <a href="mailto:support@caterbids.uk" className="font-bold text-[#FF6B00]">
              support@caterbids.uk
            </a>{" "}
            with your account email, listing link, payment reference if available, delivery reference
            and clear photos or screenshots.
          </p>
        </section>
      </div>
    </main>
  )
}
