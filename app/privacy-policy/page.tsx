import type { Metadata } from "next"
import Link from "next/link"

const siteUrl = "https://caterbids.uk"

export const metadata: Metadata = {
  title: "Privacy Policy | CaterBids.UK",
  description:
    "CaterBids.UK privacy policy covering user accounts, marketplace listings, Stripe payments, delivery bookings, cookies, analytics and UK GDPR rights.",
  alternates: {
    canonical: `${siteUrl}/privacy-policy`,
  },
}

const sections = [
  {
    title: "Information We Collect",
    items: [
      "Account details such as name, email address, business name, phone number and profile information.",
      "Buyer and seller activity including listings, messages, saved searches, favourites, delivery quote requests and support requests.",
      "Listing information including equipment descriptions, images, prices, condition, collection location and delivery details.",
      "Technical information such as device type, IP address, browser data, cookies and security logs.",
    ],
  },
  {
    title: "Payments And Stripe",
    items: [
      "CaterBids may use Stripe to process marketplace payments, checkout sessions, refunds, chargebacks and fraud checks.",
      "Card details are handled by Stripe and are not stored directly by CaterBids.",
      "Stripe may collect identity, payment, device and transaction information under its own privacy terms.",
    ],
  },
  {
    title: "Delivery Bookings",
    items: [
      "Delivery quote and booking information may include collection postcode, delivery postcode, item dimensions, weight and freight requirements.",
      "Delivery may be provided by third-party couriers, pallet networks or shipping technology providers.",
      "We share only the details needed to provide quotes, booking, labels, tracking and support.",
    ],
  },
  {
    title: "How We Use Information",
    items: [
      "To operate accounts, listings, searches, favourites, messages, payments, delivery quotes and customer support.",
      "To prevent fraud, spam, unsafe listings, prohibited items and marketplace misuse.",
      "To improve CaterBids features, measure performance and understand marketplace activity.",
      "To comply with legal, tax, payment, dispute and regulatory obligations.",
    ],
  },
  {
    title: "Cookies, Analytics And Local Storage",
    items: [
      "We use essential cookies and browser storage for login sessions, security and beta marketplace features.",
      "Analytics may be used to understand site usage, search behaviour and performance.",
      "You can control cookies through your browser settings, but some marketplace features may stop working.",
    ],
  },
  {
    title: "UK GDPR Rights",
    items: [
      "You may request access, correction, deletion, restriction or portability of your personal data.",
      "You may object to some processing or withdraw consent where consent is the lawful basis.",
      "We may retain records where required for fraud prevention, disputes, payment compliance, accounting or legal claims.",
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="app-bg min-h-screen px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="soft-button inline-flex rounded-2xl px-4 py-2 text-sm font-bold">
          Back to CaterBidsUK
        </Link>

        <section className="premium-shell mt-6 rounded-[2rem] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#FF6B00]">Privacy Policy</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">How CaterBids protects your data</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            This policy explains how CaterBids.UK handles personal data for marketplace accounts,
            listings, payments, delivery bookings, support, security and analytics.
          </p>
          <p className="mt-4 text-xs font-semibold text-white/45">Last updated: 8 May 2026</p>
        </section>

        <div className="mt-6 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="premium-card rounded-3xl p-5 sm:p-6">
              <h2 className="text-xl font-black text-white">{section.title}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/68">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6B00]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="premium-card mt-6 rounded-3xl border-[#FF6B00]/25 p-5 sm:p-6">
          <h2 className="text-xl font-black">Contact About Privacy</h2>
          <p className="mt-3 text-sm leading-6 text-white/68">
            For privacy questions or data requests, contact support at{" "}
            <a href="mailto:support@caterbids.uk" className="font-bold text-[#FF6B00]">
              support@caterbids.uk
            </a>
            . We may need to verify your identity before acting on an account request.
          </p>
        </section>
      </div>
    </main>
  )
}
