import type { Metadata } from "next"
import Link from "next/link"
import SiteFooter from "@/components/SiteFooter"
import {
  ArrowLeft,
  ShieldCheck,
  ClipboardList,
  UserSearch,
  CreditCard,
  TriangleAlert,
  Package,
  Truck,
  Wrench,
  Scale,
  Building2,
  FileText,
  Eye,
  ClipboardCheck,
  CheckCircle2,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Seller Safety Guide | Sell Used Catering Equipment Safely in the UK | CaterBids.uk",
  description:
    "How to sell used commercial catering equipment safely on CaterBids.uk. Write accurate listings, vet buyers, confirm cleared funds, arrange safe collection and avoid seller scams like overpayment and chargeback fraud.",
}

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

export default function SellerSafetyPage() {
  return (
    <>
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,107,0,0.16),_transparent_34%),linear-gradient(135deg,#001A35_0%,#062747_50%,#00142B_100%)] px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/safety"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Safety Centre
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
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-[#FF6B00]">Seller Safety</p>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Seller Safety Guide</h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Selling used commercial catering equipment safely comes down to a few principles — list
            honestly, keep evidence, confirm cleared funds, and never release goods until you&apos;ve
            been paid. This guide covers how to protect yourself as a seller on CaterBids.
          </p>
        </section>

        {/* 1. Accurate listing */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<ClipboardList className="h-5 w-5" />}
            label="Your listing"
            title="Write an accurate listing"
          />
          <Prose>
            <p>
              An accurate listing is your best defence against disputes. If the item matches what you
              described, a buyer has very limited grounds to complain.
            </p>
            <div>
              <SubHeading>Photos</SubHeading>
              <p>
                Use real photos of the actual item — never stock or manufacturer images. Cover all angles
                including the interior (oven cavities, fry tanks, fridge seals) and always photograph
                the data plate showing make, model, serial number, voltage, kW draw, and gas type (NG or LPG).
              </p>
            </div>
            <div>
              <SubHeading>Faults and condition</SubHeading>
              <p>
                Declare all faults, scratches, and missing parts prominently — not buried in the text.
                State clearly if the item is untested: <span className="italic">"powers on but not
                professionally tested"</span> or <span className="italic">"untested since removal — buyer
                to inspect before use."</span>
              </p>
            </div>
            <div>
              <SubHeading>Practical details</SubHeading>
              <p>
                Include dimensions, approximate weight, what&apos;s included (accessories, manuals, stands),
                VAT status, and collection or delivery options. The more complete your listing, the fewer
                time-wasting enquiries you receive.
              </p>
            </div>
          </Prose>
        </section>

        {/* 2. Vet the buyer */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<UserSearch className="h-5 w-5" />}
            label="Due diligence"
            title="Vet the buyer"
          />
          <Prose>
            <p>
              Serious commercial buyers ask specific technical questions — single-phase or three-phase,
              external dimensions, gas type, service history. They give clear collection plans and
              straightforward contact details.
            </p>
            <p>Be wary of buyers who:</p>
            <ul className="space-y-2 pl-1">
              {[
                "Offer the full asking price without asking any questions or negotiating.",
                "Push immediately to go off-platform to WhatsApp or email.",
                "Give vague or changing answers about who they are and where they are collecting from.",
                "Propose complicated payment arrangements or ask for your bank details via message.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Prose>
        </section>

        {/* 3. Receive payment safely */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<CreditCard className="h-5 w-5" />}
            label="Getting paid"
            title="Receive payment safely"
          />
          <Prose>
            <div>
              <SubHeading>The only rule that matters</SubHeading>
              <p>
                Never release equipment until you have confirmed cleared funds in your own bank or
                payment account. Log into your own app — do not trust buyer screenshots, forwarded
                emails, or "pending" messages. Only available balance is real.
              </p>
            </div>
            <div>
              <SubHeading>Bank transfer</SubHeading>
              <p>
                Bank transfer is reliable for high-value items once funds are confirmed arrived. Agree
                the amount, verify it in your account, then release.
              </p>
            </div>
            <div>
              <SubHeading>Cash</SubHeading>
              <p>
                Count it carefully. For large amounts use a counterfeit-detection pen. Meet at a safe,
                well-lit business premises — never a quiet location for a high-value cash handover.
              </p>
            </div>
            <div>
              <SubHeading>PayPal</SubHeading>
              <p>
                Use Goods &amp; Services only — never Friends &amp; Family. Check your PayPal balance
                directly on the app; do not release goods based on a payment email from the buyer.
              </p>
            </div>
            <div>
              <SubHeading>Avoid</SubHeading>
              <p>
                Cheques and bankers&apos; drafts can be reversed or bounce long after appearing to clear.
                Do not accept them for catering equipment sales.
              </p>
            </div>
          </Prose>
        </section>

        {/* 4. Scams — orange card */}
        <section className="mt-4 rounded-[2rem] border border-[#FF6B00]/20 bg-[#FF6B00]/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<TriangleAlert className="h-5 w-5" />}
            label="Stay alert"
            title="Seller scams to watch for"
          />
          <Prose>
            <div>
              <SubHeading>Overpayment scam</SubHeading>
              <p>
                A buyer sends more than the agreed price and asks you to refund the difference or pay
                their courier. The original payment then reverses — often a fraudulent card or cheque —
                leaving you out of pocket for both the goods and the money you sent. Never accept an
                overpayment. Never pay a buyer&apos;s courier. Never refund unverified funds.
              </p>
            </div>
            <div>
              <SubHeading>Fake payment confirmation emails</SubHeading>
              <p>
                Spoofed emails appear to come from PayPal or your bank claiming funds are "pending
                release" until you send a tracking number or pay a fee. Platforms do not hold funds
                this way. Check your real account directly — never click links in buyer-sent payment emails.
              </p>
            </div>
            <div>
              <SubHeading>Fake banking apps at collection</SubHeading>
              <p>
                At handover, the buyer shows a phone screen "proving" a transfer was made. These screens
                can be faked. Log into your own banking app on your own device and confirm the money is
                in your available balance before the buyer touches the item.
              </p>
            </div>
            <div>
              <SubHeading>Chargeback and reversal fraud</SubHeading>
              <p>
                Buyer pays by card or PayPal, collects the equipment, then files a dispute claiming
                non-delivery or fraud. Signed collection receipts and on-platform message history are
                your primary defence.
              </p>
            </div>
            <div>
              <SubHeading>False "damaged in transit" claims</SubHeading>
              <p>
                After courier delivery, buyer claims damage and seeks a partial refund while keeping
                the item. Pre-dispatch photos and video of the item working, and of the packing, make
                these claims very hard to sustain.
              </p>
            </div>
          </Prose>
        </section>

        {/* 5. Handover */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<Package className="h-5 w-5" />}
            label="At collection"
            title="Safe handover and collection"
          />
          <Prose>
            <ul className="space-y-2 pl-1">
              {[
                "Confirm payment has cleared before collection — not after the van has pulled up.",
                "Meet in a safe, well-lit place and don't be there alone for high-value handovers.",
                "Confirm the collector's identity — ask for a name and check it matches what you agreed.",
                "Photograph the item before it leaves, with the buyer or driver present if possible.",
                "Have the buyer or collector sign a simple receipt confirming they inspected and accepted the item in its stated condition, including any known faults.",
                "Do not release goods or let them load until payment is confirmed. Once it is on the van, your practical options are very limited.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Prose>
        </section>

        {/* 6. Delivery */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<Truck className="h-5 w-5" />}
            label="Courier dispatch"
            title="Protecting yourself on delivery"
          />
          <Prose>
            <ul className="space-y-2 pl-1">
              {[
                "Before dispatch: photograph the item working, its full condition, the pallet, the wrapping, and the carrier label — all with timestamps.",
                "Keep the booking reference, tracking number, and declared insurance value.",
                "Use tracked, signed-for delivery — a signature on delivery closes down most false \"not received\" claims.",
                "For high-value equipment, consider insured pallet delivery and declare an accurate value.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Prose>
        </section>

        {/* 7. Catering-specific risks */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<Wrench className="h-5 w-5" />}
            label="Equipment types"
            title="Catering-specific considerations"
          />
          <Prose>
            <div>
              <SubHeading>Gas equipment</SubHeading>
              <p>
                Never imply gas equipment is safe to use without professional commissioning. State
                clearly: <span className="italic">"must be installed and tested by a qualified Gas Safe
                registered engineer before use."</span> Disclose the gas type (natural gas or LPG) and
                whether it has been tested since removal.
              </p>
            </div>
            <div>
              <SubHeading>Electrical equipment</SubHeading>
              <p>
                Disclose single-phase or three-phase, voltage, and kW draw. State whether it powers on
                and whether it has been PAT tested. Photograph the data plate and any wiring terminations.
              </p>
            </div>
            <div>
              <SubHeading>Refrigeration</SubHeading>
              <p>
                Disclose cooling performance, compressor noise, door seal condition, and any known issues.
                Advise buyers to allow the unit to stand upright for 24 hours before switching on after
                transport.
              </p>
            </div>
            <div>
              <SubHeading>Warewashing and coffee equipment</SubHeading>
              <p>
                Disclose fill, drain, and heating function; any known leaks; service history; and exactly
                what is included (baskets, portafilters, cleaning accessories). If descaling is overdue,
                say so.
              </p>
            </div>
          </Prose>
        </section>

        {/* 8. Restaurant closure stock */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<Scale className="h-5 w-5" />}
            label="Ownership"
            title="Restaurant closure stock"
          />
          <Prose>
            <p>
              If you are selling equipment from a closing or closed business, only list items you own
              outright or are authorised to sell. Before listing:
            </p>
            <ul className="space-y-2 pl-1">
              {[
                "Confirm the equipment is not subject to a lease, hire-purchase, or finance agreement — the finance company may still own it.",
                "Check nothing has been claimed by a landlord under a right of distraint or by an administrator.",
                "Keep proof of ownership (purchase receipts, asset register, or written authority from an insolvency practitioner).",
                "Make clear in your listing who handles disconnection, removal, and access to the premises.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Prose>
        </section>

        {/* 9. Selling a catering trailer */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<Building2 className="h-5 w-5" />}
            label="Trailers"
            title="Selling a catering trailer"
          />
          <Prose>
            <p>
              A catering trailer has more moving parts than a piece of static equipment. Disclose
              clearly:
            </p>
            <ul className="space-y-2 pl-1">
              {[
                "Make, year, chassis number or VIN where available, and unladen weight.",
                "Tow hitch type and condition, tyre tread, and brake condition.",
                "Gas and electrical setup — what&apos;s fitted, gas type, whether tested since last use.",
                "What&apos;s included (equipment, water tank, generator, awning) and what is not.",
                "Known faults — mechanical, structural, or cosmetic.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              State clearly that the buyer is responsible for their own roadworthiness checks, insurance,
              and any further inspection before road use. Photograph exterior, interior, chassis underside,
              hitch, tyres, gas area, and electrics.
            </p>
          </Prose>
        </section>

        {/* 10. Keep records */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<FileText className="h-5 w-5" />}
            label="Documentation"
            title="Keep records"
          />
          <Prose>
            <p>
              Retain the following for at least 12 months after any significant sale:
            </p>
            <ul className="space-y-2 pl-1">
              {[
                "A copy of the listing as it appeared at the time of sale.",
                "All buyer messages — keep these in CaterBids messaging wherever possible.",
                "Pre-handover or pre-dispatch condition photos and video.",
                "Data plate photograph.",
                "Payment confirmation showing cleared funds.",
                "Signed collection receipt or courier tracking confirmation with delivery signature.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              If a buyer files a payment dispute, your bank will ask for evidence. Having this ready
              makes the process straightforward.
            </p>
          </Prose>
        </section>

        {/* 11. Red flags */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<Eye className="h-5 w-5" />}
            label="Warning signs"
            title="Seller red flags"
          />
          <Prose>
            <p>Be cautious if a buyer:</p>
            <ul className="space-y-2 pl-1">
              {[
                "Offers above asking price without viewing or negotiating.",
                "Asks you to refund an overpayment or pay a courier fee on their behalf.",
                "Sends you a payment link or courier booking link — these are often phishing.",
                "Shows you a \"transfer sent\" screenshot instead of letting you verify it yourself.",
                "Says your payment is \"pending\" until you take a further action or pay a fee.",
                "Rushes you, creates artificial urgency, or becomes hostile when you take time to verify.",
                "Insists on moving off-platform immediately and refuses to give a verifiable name.",
                "Wants goods released before funds are confirmed in your account.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]/80" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Prose>
        </section>

        {/* 12. Checklist */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<ClipboardCheck className="h-5 w-5" />}
            label="Before you release"
            title="Seller checklist"
          />
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {[
              ["Accurate listing", "Data plate photographed, all faults declared, condition stated clearly."],
              ["Buyer vetted", "Specific questions asked, identity and collection details confirmed."],
              ["Payment cleared", "Confirmed cleared funds in my own account — not a screenshot or email."],
              ["No overpayment accepted", "Amount matches what was agreed; no courier fee or refund requested."],
              ["Item photographed", "Timestamped condition photos taken immediately before handover or dispatch."],
              ["Receipt signed", "Buyer or collector signed to confirm they received and accepted the item."],
              ["Records kept", "Listing copy, photos, payment proof, and receipt saved for 12 months."],
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

        {/* Closing rule */}
        <section className="mt-4 rounded-[2rem] border border-[#FF6B00]/20 bg-[#FF6B00]/[0.06] p-6 sm:p-8">
          <p className="text-sm font-black leading-relaxed text-white/85">
            List honestly. Keep evidence. Confirm cleared funds. Never release equipment until
            you&apos;re paid. Use signed handover or tracked delivery. Watch for overpayment,
            fake-payment and courier scams.
          </p>
        </section>

        {/* Disclaimer */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Disclaimer</p>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            This guide is general safety guidance to help you sell more safely. It is not legal or
            financial advice. Always confirm cleared funds and carry out your own checks before
            releasing goods.
          </p>
        </section>

      </div>
    </main>
    <SiteFooter />
    </>
  )
}
