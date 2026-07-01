import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import SiteFooter from "@/components/SiteFooter"

export const metadata: Metadata = {
  title: "Terms & Conditions | CaterBids.uk",
  description:
    "Terms and conditions governing use of CaterBids.uk — the UK marketplace for used catering equipment. Operated by Colt Price trading as CaterBids.uk.",
}

export default function TermsPage() {
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
          <h1 className="mt-1 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Terms &amp; Conditions</h1>
          <p className="mt-3 text-xs font-semibold text-white/45">Last updated: 25 June 2026</p>
          <div className="mt-4 rounded-2xl border border-[#FF6B00]/20 bg-[#FF6B00]/[0.06] px-4 py-3 text-sm font-semibold leading-relaxed text-white/70">
            This policy is provided in good faith and is being finalised. If you have any questions,
            contact{" "}
            <a href="mailto:caterbidsuk@gmail.com" className="font-black text-[#FF6B00] hover:underline">
              caterbidsuk@gmail.com
            </a>
            .
          </div>
          <div className="mt-4 space-y-1 text-sm font-semibold text-white/55">
            <p>Colt Price, sole trader trading as CaterBids.uk</p>
            <p>Greyfriars House, Birmingham, B37 5HY</p>
            <p>
              <a href="mailto:caterbidsuk@gmail.com" className="hover:text-[#FF6B00]">
                caterbidsuk@gmail.com
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
            <h2 className="text-base font-black text-white">1. About CaterBids.uk</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              CaterBids.uk is a UK online marketplace for buying and selling used commercial catering
              equipment, catering trailers, food vans, restaurant clearance equipment and related
              hospitality equipment. CaterBids.uk provides the online platform that allows buyers and
              sellers to find each other, create listings, send enquiries, communicate and arrange
              transactions. CaterBids.uk is a platform and intermediary only. Unless we clearly state
              otherwise in writing:
            </p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/72">
              {[
                "CaterBids.uk does not own the goods listed;",
                "is not the seller or buyer of the goods;",
                "is not an auctioneer or escrow provider;",
                "does not inspect, test or certify goods;",
                "does not guarantee the accuracy of listings or the condition, safety, legality, quality, value or suitability of any goods;",
                "does not deliver or carry goods;",
                "and is not a party to the contract of sale between buyer and seller.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[#FF6B00]">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              The contract for the sale of any goods is made directly between the buyer and the seller.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">2. Our details</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              The operator of CaterBids.uk is Colt Price, a sole trader, trading as CaterBids.uk, of
              Greyfriars House, Birmingham, B37 5HY. Website:{" "}
              <a href="https://caterbids.uk" className="text-[#FF6B00] hover:underline">
                https://caterbids.uk
              </a>
              . Email:{" "}
              <a href="mailto:caterbidsuk@gmail.com" className="text-[#FF6B00] hover:underline">
                caterbidsuk@gmail.com
              </a>
              .
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">3. These Terms</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              By accessing or using CaterBids.uk, you agree to these Terms. If you do not agree, you
              must not use the Platform. These Terms apply to all users, including guests, registered
              users, buyers and sellers. Additional policies also apply, including our{" "}
              <a href="/privacy-policy" className="text-[#FF6B00] hover:underline">Privacy Policy</a>,{" "}
              <a href="/legal/cookies" className="text-[#FF6B00] hover:underline">Cookie Policy</a>,{" "}
              <a href="/refund-policy" className="text-[#FF6B00] hover:underline">Refund Policy</a>,
              and our{" "}
              <a href="/buyer-safety" className="text-[#FF6B00] hover:underline">Buyer Safety</a> and{" "}
              <a href="/seller-safety" className="text-[#FF6B00] hover:underline">Seller Safety</a>{" "}
              guidance. If there is a conflict between these Terms and another policy, these Terms
              apply unless the other policy clearly states otherwise.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">4. Eligibility</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              To use CaterBids.uk you must be at least 18, legally capable of entering contracts, use
              the Platform only for lawful purposes, provide accurate information, and comply with
              these Terms and all applicable laws. CaterBids.uk is intended for users in the United
              Kingdom. If you use CaterBids.uk on behalf of a business, you confirm you have authority
              to bind that business. We may refuse, suspend or close an account where we believe a
              user is under 18, outside our intended service area, using false details, or breaching
              these Terms.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">5. User accounts</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Some features require an account. You must keep your account information accurate, keep
              your login details secure, and are responsible for all activity on your account. Tell us
              promptly if you suspect unauthorised access. You must not create fake accounts, use
              another person&apos;s account without permission, sell or share your account, use false
              identity details, or circumvent account limits, verification checks or suspensions.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">6. CaterBids.uk&apos;s role</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              CaterBids.uk provides marketplace tools only and does not create the sale contract
              between buyer and seller. The buyer and seller are solely responsible for agreeing the
              item, price, payment method, VAT treatment, collection or delivery, inspection,
              handover, insurance, risk transfer, and any warranty, refund or cancellation terms
              between them. CaterBids.uk is not responsible for enforcing the buyer-seller sale
              contract.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">7. Seller obligations</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">If you list goods, you must:</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/72">
              {[
                "have the legal right to sell them;",
                "ensure they are not stolen or subject to undisclosed finance, lease or third-party claim;",
                "describe them accurately and honestly with real, current photos;",
                "disclose known faults, damage, missing parts or safety concerns;",
                "state whether goods are used, refurbished, spares/repair, untested or sold as seen;",
                "give accurate information about brand, model, condition, dimensions, weight, power requirements and location;",
                "avoid misleading prices or false availability;",
                "keep listings up to date;",
                "comply with all applicable laws;",
                "deal with buyers fairly;",
                "and make clear whether you are a business or private seller.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[#FF6B00]">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Sellers are responsible for ensuring their goods comply with applicable product safety,
              electrical, gas, food-equipment, trailer, vehicle, tax, VAT, advertising and
              consumer-protection rules. CaterBids.uk does not check every listing and is not
              responsible for a seller&apos;s legal compliance.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">8. Prohibited items</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">You must not list:</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/72">
              {[
                "stolen, counterfeit, illegal or unsafe goods;",
                "goods you do not have the right to sell;",
                "goods subject to undisclosed finance or ownership dispute;",
                "recalled goods where resale is prohibited;",
                "items infringing intellectual property;",
                "items requiring licences you do not hold;",
                "hazardous items that cannot lawfully be sold, collected or transported;",
                "or any item CaterBids.uk considers unsuitable.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[#FF6B00]">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              We may remove any listing we believe is prohibited, unsafe, suspicious or unlawful
              without notice.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">9. Buyer responsibilities</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              As a buyer you are responsible for reading listings carefully, asking questions,
              checking the seller&apos;s identity and credibility, inspecting goods where possible,
              confirming suitability, agreeing payment and collection/delivery directly with the
              seller, arranging any qualified inspection or installation needed, and keeping records.
              Commercial catering equipment may require professional installation, gas-safe work,
              electrical work, servicing or safety testing before use. CaterBids.uk does not
              guarantee that any item is safe, working, compliant, clean, suitable for food use, or
              suitable for your business.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">10. Payments between buyers and sellers</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Unless we clearly state otherwise, payments for goods are arranged directly between
              buyer and seller. CaterBids.uk does not hold buyer funds for equipment purchases and
              does not provide escrow. We are not responsible for non-payment, non-delivery, payment
              disputes, chargebacks between users, fake payment confirmations, or payment methods
              chosen by users. Take your own precautions before sending money or releasing goods.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">11. CaterBids.uk platform fees</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              We may charge sellers for platform services such as listing fees, subscription fees,
              featured listing fees and promoted listing upgrades. CaterBids.uk does not charge a
              final-value fee or success fee on the sale price of goods unless we clearly update the
              pricing and Terms in future. All applicable fees are shown before purchase. Platform
              Fees are payable to CaterBids.uk for use of the Platform and are separate from any
              price paid by a buyer to a seller.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">12. Reviews and feedback</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Reviews must be honest, fair and based on genuine experience. You must not leave fake
              reviews, pay for reviews, threaten users with reviews, leave abusive reviews, or review
              your own account. We may remove reviews that breach these Terms or appear suspicious.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">13. User content and licence</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              You keep ownership of content you upload (listings, photos, descriptions, messages,
              reviews), but you grant CaterBids.uk a licence to use it for operating, promoting and
              improving the Platform, including displaying and promoting listings and using listing
              images in Platform marketing. You confirm you have the right to upload any content you
              submit and must not upload content that infringes third-party rights.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">14. Intellectual property</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              The CaterBids name, logo, branding, design, software and content are owned by or
              licensed to CaterBids.uk. You must not copy, reproduce, resell, scrape or reverse
              engineer any part of the Platform without written permission, except as allowed by law.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">15. Delivery and third-party carriers</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              CaterBids.uk does not deliver, transport, palletise, load, insure or store goods.
              Delivery or collection is agreed between buyer and seller. We may provide access to
              third-party delivery tools such as Interparcel; where a carrier is used, the delivery
              service is provided by that third party, not CaterBids.uk. We are not liable for
              carrier delay, failed collection or delivery, damage or loss in transit, incorrect
              packaging or measurements, access problems or insurance disputes.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">16. Disputes between users</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Buyers and sellers are expected to resolve transaction disputes directly. CaterBids.uk
              may, at its discretion, help by reviewing activity, messages or listings, requesting
              evidence, removing listings, or restricting accounts, but is not required to mediate,
              does not guarantee any outcome, and does not decide legal liability between users. Seek
              independent legal advice where needed.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">17. Acceptable use</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              You must not use CaterBids.uk to:
            </p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/72">
              {[
                "break the law;",
                "commit fraud, scam users;",
                "send spam;",
                "harass or abuse users;",
                "upload malware;",
                "scrape the Platform without permission;",
                "copy content unlawfully;",
                "interfere with security;",
                "create fake reviews, listings or accounts;",
                "misrepresent your identity;",
                "circumvent fees;",
                "or otherwise damage the Platform or other users.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-[#FF6B00]">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">18. Availability</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              We aim to keep CaterBids.uk available but do not guarantee uninterrupted access. The
              Platform may be unavailable due to maintenance, updates, hosting or security issues,
              third-party failures or events outside our control. We may change, suspend, withdraw or
              limit any part of the Platform at any time and are not liable for loss caused by
              downtime unless the law says otherwise.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">19. Suspension and termination</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              We may suspend, restrict or terminate your account if we believe you have breached
              these Terms, created risk for users, listed prohibited goods, provided false
              information, committed or attempted fraud, misused the Platform, failed verification,
              failed to pay fees, or created legal, regulatory or reputational risk, or where
              required by law. Where appropriate we may give notice; in serious cases we may act
              without notice.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">20. Disclaimers</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              To the fullest extent permitted by law, CaterBids.uk gives no warranty that listings
              are accurate, that sellers or buyers are genuine, that goods exist, are owned by the
              seller, are safe, working, clean, compliant, suitable for any purpose, deliverable, or
              worth the listed price, or that any user will complete a transaction. Buyers and sellers
              use the Platform at their own risk. Nothing in these Terms affects statutory rights that
              cannot legally be excluded.
            </p>
          </section>

          <section className="rounded-[2rem] border border-[#FF6B00]/20 bg-[#FF6B00]/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">21. Limitation of liability</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Nothing in these Terms excludes or limits liability where it would be unlawful to do
              so, including for death or personal injury caused by negligence, fraud, or fraudulent
              misrepresentation. Subject to that, CaterBids.uk is not liable for the goods listed,
              their condition, safety, legality, quality or suitability, incorrect or misleading
              listings, buyer or seller conduct, buyer-seller disputes, non-payment, non-delivery,
              delivery damage, carrier failure, lost profits, loss of business, revenue, goodwill or
              data, indirect or consequential loss, Platform downtime, or third-party service
              failures. Where we are legally liable to you, our total liability is limited to the
              Platform Fees you paid to CaterBids.uk in the 12 months before the event giving rise
              to the claim, or, if you have paid no fees, to £100.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">22. VAT and tax</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              Sellers are responsible for their own tax, VAT, accounting and reporting obligations
              and must provide VAT invoices where legally required. Buyers are responsible for
              checking whether VAT is included before purchase. CaterBids.uk may charge VAT on
              Platform Fees where required by law.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">23. Consumer rights</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              If you are legally treated as a consumer, nothing in these Terms affects your statutory
              rights. Where a consumer buys goods from a business seller, the consumer may have
              statutory rights against that seller; where a consumer buys from a private seller, they
              may have fewer rights. CaterBids.uk&apos;s role remains that of a platform/intermediary
              unless we clearly state CaterBids.uk is the seller of specific goods.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">24. Changes to these Terms</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              We may update these Terms from time to time. The latest version will be posted on
              CaterBids.uk. Where changes are significant we may notify you by email, account notice
              or website notice. Continuing to use the Platform after changes take effect means you
              accept the updated Terms.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">25. General</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              You may not transfer your rights under these Terms without our permission; we may
              transfer ours to another operator provided this does not unfairly reduce your rights.
              If any part of these Terms is found invalid, the rest continues to apply. Our failure
              to enforce a term immediately does not waive our right to enforce it later. These Terms
              are between you and CaterBids.uk and no other person has rights to enforce them unless
              the law says otherwise.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">26. Governing law</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              These Terms are governed by the laws of England and Wales, and the courts of England
              and Wales have jurisdiction, subject to any rights consumers may have to bring claims
              in another UK jurisdiction.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
            <h2 className="text-base font-black text-white">27. Contact</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              For questions about these Terms, contact CaterBids.uk at{" "}
              <a href="mailto:caterbidsuk@gmail.com" className="text-[#FF6B00] hover:underline">
                caterbidsuk@gmail.com
              </a>{" "}
              (Colt Price trading as CaterBids.uk, Greyfriars House, Birmingham, B37 5HY).
            </p>
          </section>

        </div>

      </div>
    </main>
    <SiteFooter />
    </>
  )
}
