import Link from "next/link"
import SiteFooter from "@/components/SiteFooter"
import {
  ArrowLeft,
  ShieldCheck,
  Scale,
  UserSearch,
  Wrench,
  CreditCard,
  TriangleAlert,
  ClipboardList,
  CheckCircle2,
} from "lucide-react"

function SectionHeading({ icon, label, title }: { icon: React.ReactNode; label: string; title: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00] ring-1 ring-[#FF6B00]/25">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FF6B00]">{label}</p>
        <h2 className="mt-0.5 text-xl font-black text-white">{title}</h2>
      </div>
    </div>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/75">{children}</div>
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="font-black text-white/90">{children}</p>
}

export default function BuyerSafetyPage() {
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

        {/* Hero */}
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00] ring-1 ring-[#FF6B00]/25">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-[#FF6B00]">Buyer Safety</p>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Buy with confidence</h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Used catering equipment can represent excellent value — but buying safely takes a little preparation.
            Verify the seller, inspect the item in person where possible, pay by a traceable method that gives you
            recourse, and keep a clear paper trail. This guide covers what to check, your rights under UK law, and
            the red flags that signal a scam.
          </p>
        </section>

        {/* Rights */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<Scale className="h-5 w-5" />}
            label="Your rights"
            title="Business vs private sellers"
          />
          <Prose>
            <div>
              <SubHeading>Buying from a business or trader</SubHeading>
              <p>
                When you buy from a business seller, the Consumer Rights Act 2015 applies. Goods must be as
                described, of satisfactory quality, and fit for purpose. If an item is faulty, you have a
                30-day right to reject it and receive a full refund. After 30 days you are entitled to a repair
                or replacement first, with a refund as a last resort.
              </p>
            </div>
            <div>
              <SubHeading>Buying online from a business</SubHeading>
              <p>
                Purchases made online or by phone from a trader are also covered by the Consumer Contracts
                Regulations 2013. This gives you a 14-day cooling-off period from the day you receive the
                goods, during which you can cancel for any reason and receive a full refund.
              </p>
            </div>
            <div>
              <SubHeading>Buying from a private individual</SubHeading>
              <p>
                Private sales operate on a "buyer beware" basis. There is no statutory right to return and no
                guarantee of satisfactory quality — the only legal requirement is that the item matches the
                seller&apos;s description. Inspect carefully before you pay.
              </p>
            </div>
            <div>
              <SubHeading>Section 75 credit card protection</SubHeading>
              <p>
                If you pay by credit card for goods costing between £100 and £30,000, Section 75 of the
                Consumer Credit Act 1974 makes your card issuer jointly liable with the seller. This applies
                to business sellers and can be a powerful safety net if things go wrong.
              </p>
            </div>
          </Prose>
        </section>

        {/* Product safety law */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Legislation"
            title="Product safety law is changing"
          />
          <Prose>
            <p>
              The UK has passed the Product Regulation and Metrology Act 2025, which gives the Government
              powers to introduce clearer product-safety duties for online marketplaces. Detailed marketplace
              obligations are expected to be set through future secondary legislation. CaterBids takes a
              precautionary, safety-first approach and monitors GOV.UK and OPSS updates.
            </p>
            <p>
              In the meantime, all sellers are responsible for ensuring their listings are accurate and that
              equipment is safe to use. If you believe a listing describes an unsafe or recalled product,
              please report it to us immediately.
            </p>
          </Prose>
        </section>

        {/* Checking the seller */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<UserSearch className="h-5 w-5" />}
            label="Due diligence"
            title="Checking the seller"
          />
          <Prose>
            <div>
              <SubHeading>Business sellers</SubHeading>
              <p>
                Ask for the full company name and registration number, then verify it for free on Companies
                House (find-and-update.company-information.service.gov.uk). You can confirm VAT registration
                through HMRC&apos;s online checker at GOV.UK. If the sale involves gas-fired equipment, check
                that the seller or any installer is registered with Gas Safe (gassaferegister.co.uk) — it is
                a legal requirement for work on gas appliances.
              </p>
            </div>
            <div>
              <SubHeading>Private sellers</SubHeading>
              <p>
                Get the seller&apos;s full name and address in writing before you agree to purchase. A
                legitimate seller will have no objection to providing these details. If you are collecting in
                person, confirm the collection address matches what you have been given. Never rely on a
                mobile number alone as your only point of contact.
              </p>
            </div>
          </Prose>
        </section>

        {/* Inspecting equipment */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<Wrench className="h-5 w-5" />}
            label="Pre-purchase checks"
            title="Inspecting used catering equipment"
          />
          <Prose>
            <p>
              Where possible, inspect equipment before payment. Arrange to see it running under power or gas.
              The following checklist covers the most important points:
            </p>
            <ul className="space-y-2 pl-1">
              {[
                "Match the make, model, and serial number against the listing and any photos provided.",
                "Test all main functions — heating elements, motors, temperature controls, timers, and safety cut-offs.",
                "Inspect seals, gaskets, door hinges, and internal linings for wear, cracks, or contamination.",
                "Check electrical leads and connections for fraying, burn marks, or signs of amateur repair.",
                "Look for rust, corrosion, or water damage on frames and interior surfaces.",
                "Look for a CE or UKCA conformity mark — most commercial catering equipment placed on the UK market requires one.",
                "Ask for evidence of recent PAT testing (for electrical items) or Gas Safe certification (for gas appliances).",
                "Search the product model on the OPSS product-recall page (gov.uk/product-safety-database) to check for any outstanding safety notices.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Prose>
        </section>

        {/* Safe payment */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<CreditCard className="h-5 w-5" />}
            label="Payment & collection"
            title="Safe payment and collection"
          />
          <Prose>
            <div>
              <SubHeading>Distance purchases</SubHeading>
              <p>
                For any purchase where you cannot inspect before paying, use a credit card or PayPal
                Goods &amp; Services. Both provide dispute resolution and chargeback rights if the item does
                not arrive or does not match its description. A credit card payment over £100 also carries
                Section 75 protection.
              </p>
            </div>
            <div>
              <SubHeading>In-person collection</SubHeading>
              <p>
                Only hand over cash — or complete payment — after you have seen and tested the item. If a
                seller insists on payment before you view the goods, treat this as a serious red flag.
              </p>
            </div>
            <div>
              <SubHeading>Payments to avoid</SubHeading>
              <p>
                Never pay by bank transfer (BACS/CHAPS), Western Union, MoneyGram, cryptocurrency, or
                PayPal Friends &amp; Family for marketplace transactions. These methods offer little or no
                buyer protection and are the preferred tools of scammers.
              </p>
            </div>
            <div>
              <SubHeading>Meeting safely</SubHeading>
              <p>
                For private sales, arrange collection at a busy, public location where possible — a business
                premises, a commercial kitchen, or a well-lit car park during daylight hours. Tell someone
                where you are going and take a companion if the transaction involves a large sum.
              </p>
            </div>
          </Prose>
        </section>

        {/* Scam red flags */}
        <section className="mt-4 rounded-[2rem] border border-[#FF6B00]/20 bg-[#FF6B00]/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<TriangleAlert className="h-5 w-5" />}
            label="Stay alert"
            title="Scam red flags"
          />
          <Prose>
            <p>Stop and reconsider if you encounter any of the following:</p>
            <ul className="space-y-2 pl-1">
              {[
                "Pricing that is dramatically below market value for comparable equipment in similar condition.",
                "A seller who asks to move the conversation off CaterBids to WhatsApp, email, or another platform.",
                "Pressure to pay quickly or requests for an upfront deposit before you have seen the item.",
                "A seller who cannot answer basic questions about the equipment — make, model, age, or previous use.",
                "Links to a third-party \"escrow\" or \"shipping\" service you have not heard of — fake escrow sites are a common fraud.",
                "A seller account with no history, no verified details, and very recent registration.",
                "Listings where photos appear to be stock images rather than photos of the actual item.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]/80" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              If something feels wrong, trust your instincts and walk away. Report suspicious listings to
              CaterBids so we can investigate and protect other buyers.
            </p>
          </Prose>
        </section>

        {/* Buyer checklist */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<ClipboardList className="h-5 w-5" />}
            label="Before you buy"
            title="Buyer checklist"
          />
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {[
              ["Verify the seller", "Companies House, Gas Safe, or full name and address for private sellers."],
              ["Inspect before paying", "See the item running if at all possible. Never pay blind."],
              ["Check certifications", "CE/UKCA mark, PAT test certificate, Gas Safe certificate where relevant."],
              ["Research the model", "Search for known faults, parts availability, and any product recalls."],
              ["Pay safely", "Card or PayPal Goods & Services for distance buys; cash only after inspection."],
              ["Collect safely", "Meet in a public place during daylight. Tell someone where you are going."],
              ["Get a receipt", "A written receipt or invoice with seller details protects both parties."],
              ["Use reputable transport", "If booking pallet or van delivery, use an established courier — not one suggested by the seller."],
            ].map(([title, detail]) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#FF6B00]" />
                <div>
                  <p className="text-sm font-black text-white">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/60">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Disclaimer</p>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            This page is general guidance, not legal advice. UK consumer law and product-safety rules can
            change. For specific situations, seek professional advice or check official sources like GOV.UK,
            Citizens Advice, and the Gas Safe Register.
          </p>
        </section>

      </div>
    </main>
    <SiteFooter />
    </>
  )
}
