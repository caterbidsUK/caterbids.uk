import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import SiteFooter from "@/components/SiteFooter"

export const metadata: Metadata = {
  title: "Privacy Policy | CaterBids.uk",
  description:
    "How CaterBids.uk collects, uses and protects your personal data. Operated by Colt Price trading as CaterBids.uk.",
}

export default function PrivacyPolicyPage() {
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
          <h1 className="mt-1 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Privacy Policy</h1>
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

        {/* Body */}
        <div className="mt-4 space-y-3">

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">1. Who we are</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              CaterBids.uk is a UK online marketplace for buying and selling commercial catering
              equipment. For data protection purposes, the controller of your personal data is Colt
              Price, a sole trader, trading as CaterBids.uk (Greyfriars House, Birmingham, B37 5HY;{" "}
              <a href="mailto:support@caterbids.uk" className="text-[#FF6B00] hover:underline">
                support@caterbids.uk
              </a>
              ). We are registered with the Information Commissioner&apos;s Office where required. We
              have not appointed a Data Protection Officer, as one is not legally required.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">2. How to contact us about privacy</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              For privacy questions, data requests, or data protection complaints, contact us at{" "}
              <a href="mailto:support@caterbids.uk" className="text-[#FF6B00] hover:underline">
                support@caterbids.uk
              </a>{" "}
              using the subject line &ldquo;Data Protection Request&rdquo; or &ldquo;Data Protection
              Complaint.&rdquo;
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">3. Data protection complaints process</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Under the Data (Use and Access) Act 2026, you have the right to lodge a complaint
              directly with us if you are unhappy with how we have handled your personal data. To
              complain: email{" "}
              <a href="mailto:support@caterbids.uk" className="text-[#FF6B00] hover:underline">
                support@caterbids.uk
              </a>{" "}
              with your full name, the email linked to your account, a description of your concern,
              and your desired resolution. We will acknowledge your complaint within 30 days,
              investigate without undue delay, keep you informed, and provide a substantive response.
              If you remain dissatisfied, you have the right to complain to the Information
              Commissioner&apos;s Office (ICO) at{" "}
              <a
                href="https://ico.org.uk"
                target="_blank"
                rel="noreferrer"
                className="text-[#FF6B00] hover:underline"
              >
                https://ico.org.uk
              </a>
              .
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">4. What personal data we collect</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/72">
              {[
                ["Account Data", "name, email, hashed password, phone number, login method, account settings."],
                ["Seller and Listing Data", "listing titles, descriptions, photos, pricing, location details."],
                ["Buyer and Enquiry Data", "communication history, offers, and contact information shared between users."],
                ["Transaction Data", "billing information and payment status (handled via Stripe; we do not store full payment card numbers)."],
                ["Delivery Data", "collection/delivery addresses and contact details for delivery services."],
                ["Technical Data", "IP address, browser type, device information, and site usage logs."],
              ].map(([label, detail]) => (
                <li key={label} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[#FF6B00]">–</span>
                  <span>
                    <span className="font-black text-white/90">{label}:</span>{" "}
                    {detail}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">5. Lawful bases for processing</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/72">
              {[
                ["Contract Performance", "to provide marketplace services, facilitate communications, and manage payments."],
                ["Legal Obligation", "to maintain tax/accounting records and handle data rights requests."],
                ["Legitimate Interests", "to prevent fraud, ensure site security, and improve our services."],
                ["Consent", "for non-essential cookies and marketing communications where applicable."],
              ].map(([label, detail]) => (
                <li key={label} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[#FF6B00]">–</span>
                  <span>
                    <span className="font-black text-white/90">{label}:</span>{" "}
                    {detail}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">6. International transfers</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              We store data primarily in the UK and Germany (via our hosting providers). Where data
              is transferred internationally, we ensure appropriate safeguards are in place, such as
              UK adequacy regulations or the UK International Data Transfer Agreement, to keep your
              data protected.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">7. Your data protection rights</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">You have the right to:</p>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-white/72">
              {[
                "Access a copy of your personal data.",
                "Rectification of inaccurate or incomplete data.",
                "Erasure of your data in certain circumstances.",
                "Restriction of or objection to certain processing.",
                "Portability of your data in a structured, machine-readable format.",
                "Withdraw Consent at any time for marketing or cookies.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[#FF6B00]">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:support@caterbids.uk" className="text-[#FF6B00] hover:underline">
                support@caterbids.uk
              </a>
              .
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">8. Cookies</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              We use cookies to ensure our website functions correctly. Essential cookies are
              necessary for site operation. Non-essential cookies, such as those for analytics, are
              subject to your consent. You can manage your preferences through our cookie banner or
              your browser settings. See our{" "}
              <a href="/legal/cookies" className="text-[#FF6B00] hover:underline">
                Cookie Policy
              </a>{" "}
              for more.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">9. Changes to this policy</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              We may update this policy periodically. Significant changes will be communicated via
              email or an account notice.
            </p>
          </section>

        </div>

      </div>
    </main>
    <SiteFooter />
    </>
  )
}
