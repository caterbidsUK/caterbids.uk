import Link from "next/link"
import SiteFooter from "@/components/SiteFooter"
import {
  ArrowLeft,
  Truck,
  Package,
  Wrench,
  MapPin,
  ClipboardList,
  CheckCircle2,
  TriangleAlert,
  ShieldCheck,
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

const palletTiers = [
  { name: "Mini Quarter", weight: "up to 150 kg", height: "up to 0.6 m" },
  { name: "Quarter",      weight: "up to 300 kg", height: "up to 0.8 m" },
  { name: "Half",         weight: "up to 500 kg", height: "up to 1.1 m" },
  { name: "Light",        weight: "up to 750 kg", height: "up to 2.2 m" },
  { name: "Full",         weight: "up to 1000 kg", height: "up to 2.2 m" },
]

const sellerChecklist: [string, string][] = [
  ["Clean the equipment", "Remove food debris, grease, and any hazardous residues before packing."],
  ["Disconnect safely", "Isolate gas and electrical connections. Remove gas cylinders and LPG."],
  ["Measure and weigh", "Record height, width, depth, and weight to select the correct pallet tier."],
  ["Secure loose parts", "Box shelves, trays, cables, and removable components separately."],
  ["Wrap and strap", "Use shrink-wrap and strapping to fix the equipment firmly to the pallet."],
  ["No overhang", "Ensure nothing extends beyond the 1.2 m × 1.0 m pallet base."],
  ["Clear access", "Make sure the collection point has level vehicle access and no obstructions."],
  ["Confirm details", "Double-check the collection address, contact number, and booking reference."],
]

const buyerChecklist: [string, string][] = [
  ["Prepare the site", "Ensure level, solid, accessible ground for the delivery vehicle."],
  ["Plan for weight", "For heavy pallets, have a pallet truck or forklift available."],
  ["Be available", "Arrange for someone to be present to receive and sign for the delivery."],
  ["Inspect before signing", "Check the pallet for damage before you sign the delivery note."],
  ["Note any damage", "Record any damage on the delivery note before the driver leaves."],
  ["Photograph issues", "Take clear photos of any damage to the pallet and packaging."],
  ["Report promptly", "Contact CaterBids and Interparcel as soon as possible if there are problems."],
  ["Keep packaging", "Do not dispose of wrapping or the pallet until any claim is resolved."],
]

export default function DeliveryPolicyPage() {
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
            <Truck className="h-7 w-7" />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-[#FF6B00]">Delivery Policy</p>
          <h1 className="mt-1 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Pallet delivery</h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            CaterBids arranges pallet collection and delivery through Interparcel. We do not move goods
            ourselves — we book the freight on your behalf through Interparcel&apos;s network. Sellers
            prepare and pack the equipment; buyers arrange a suitable site and inspect on arrival.
            This page explains how the process works and what each party is responsible for.
          </p>
        </section>

        {/* Pallet sizes */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<Package className="h-5 w-5" />}
            label="Interparcel tiers"
            title="Pallet sizes"
          />
          <Prose>
            <p className="rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/[0.07] px-4 py-3 font-black text-orange-100">
              All pallet sizes share the same 1.2 m × 1.0 m base. The tiers differ by height and
              maximum weight only — not floor size. A &ldquo;Quarter&rdquo; pallet does not have a
              smaller footprint than a &ldquo;Full&rdquo; pallet.
            </p>
          </Prose>

          {/* Tier table */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.15em] text-[#FF6B00]">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.15em] text-[#FF6B00]">Max weight</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.15em] text-[#FF6B00]">Max height</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-black uppercase tracking-[0.15em] text-[#FF6B00] sm:table-cell">Base</th>
                </tr>
              </thead>
              <tbody>
                {palletTiers.map((tier, i) => (
                  <tr
                    key={tier.name}
                    className={`border-b border-white/10 last:border-0 ${i % 2 === 0 ? "bg-white/[0.03]" : ""}`}
                  >
                    <td className="px-4 py-3 font-black text-white">{tier.name}</td>
                    <td className="px-4 py-3 text-white/75">{tier.weight}</td>
                    <td className="px-4 py-3 text-white/75">{tier.height}</td>
                    <td className="hidden px-4 py-3 text-white/45 sm:table-cell">1.2 m × 1.0 m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Prose>
            <p className="text-white/55">
              Final limits and pricing are confirmed at booking via Interparcel. Weights include the
              pallet itself and all packaging.
            </p>
          </Prose>
        </section>

        {/* Seller preparation */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<Wrench className="h-5 w-5" />}
            label="Seller responsibilities"
            title="Preparing your equipment for collection"
          />
          <Prose>
            <p>
              The seller is responsible for ensuring equipment is safe, clean, and correctly secured
              before the Interparcel driver arrives. A poorly prepared pallet can be refused at
              collection or damaged in transit.
            </p>
            <ul className="space-y-2 pl-1">
              {[
                "Clean the equipment thoroughly — remove all food debris, cooking grease, and residues.",
                "Disconnect gas and electrical supplies safely. Remove all LPG cylinders, gas bottles, and any other hazardous materials — these cannot travel by pallet.",
                "Measure the height, width, depth, and total weight of the packed pallet (including the pallet board itself) to confirm the correct tier.",
                "Secure loose items separately — shelves, trays, cables, and removable components should be boxed and strapped to the pallet, not left loose inside the equipment.",
                "Wrap the entire assembly in shrink-wrap and use strapping or banding to fix everything firmly to the pallet board.",
                "Ensure nothing overhangs the 1.2 m × 1.0 m base in any direction.",
                "Have the equipment ready at the agreed collection point with clear, level vehicle access — no steps, low bridges, or narrow entries that would prevent a tail-lift vehicle.",
                "Confirm your collection address, contact number, and booking reference before the scheduled date.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Prose>
        </section>

        {/* Tail-lift and access */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<MapPin className="h-5 w-5" />}
            label="Receiving a delivery"
            title="Tail-lift delivery and site access"
          />
          <Prose>
            <div>
              <SubHeading>Kerbside delivery</SubHeading>
              <p>
                Pallet deliveries are kerbside by default. The driver will lower the pallet to the
                pavement or loading area using a tail-lift, but they are not required to carry items
                inside premises, up steps, or into buildings. Please ensure someone is present and
                ready to move the goods from kerbside to their final location.
              </p>
            </div>
            <div>
              <SubHeading>Ground conditions</SubHeading>
              <p>
                The delivery vehicle needs level, solid ground to operate the tail-lift safely. Gravel,
                steep inclines, or soft ground may prevent delivery. If your site has access restrictions
                — low bridges, narrow lanes, weight limits, or time-of-day restrictions — tell us at
                the time of booking so we can advise Interparcel accordingly.
              </p>
            </div>
            <div>
              <SubHeading>Heavy pallets</SubHeading>
              <p>
                For particularly heavy pallets you may need a pallet truck or forklift on site to move
                the goods once lowered from the tail-lift. If you are unsure whether your site is
                suitable, contact us before booking so we can discuss your options.
              </p>
            </div>
          </Prose>
        </section>

        {/* Inspect before signing */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<ClipboardList className="h-5 w-5" />}
            label="Buyer responsibilities"
            title="On arrival: inspect before signing"
          />
          <Prose>
            <p>
              Once the pallet arrives, inspect it carefully before you sign the delivery note. Signing
              without noting damage makes it significantly harder to raise a claim later.
            </p>
            <ul className="space-y-2 pl-1">
              {[
                "Walk around the pallet before the driver leaves and check for visible damage to the wrapping, strapping, or the equipment itself.",
                "If you see any damage, write it clearly on the delivery note before signing — describe what you can see, even if you are unsure of the extent.",
                "Photograph the pallet and packaging from multiple angles as soon as it is delivered, and again once unwrapped.",
                "If damage is severe or the pallet clearly should not have been delivered in that condition, you may refuse delivery — note the reason on the driver's paperwork.",
                "Keep all packaging, strapping, and the pallet board until any claim is fully resolved.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Prose>
        </section>

        {/* Damage and claims */}
        <section className="mt-4 rounded-[2rem] border border-[#FF6B00]/20 bg-[#FF6B00]/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<TriangleAlert className="h-5 w-5" />}
            label="Problems in transit"
            title="Damage, loss &amp; claims"
          />
          <Prose>
            <p>
              If your goods are damaged, lost, or fail to arrive, act quickly and follow the steps below.
              Delays in reporting reduce your options.
            </p>
            <div>
              <SubHeading>Damage</SubHeading>
              <p>
                Note any visible damage on the delivery note before signing. Photograph the pallet,
                packaging, and the damaged item before moving or unpacking further. Report the damage
                to CaterBids and to Interparcel as soon as possible — do not wait.
              </p>
            </div>
            <div>
              <SubHeading>Loss or non-delivery</SubHeading>
              <p>
                If a pallet does not arrive within the expected delivery window, contact CaterBids and
                Interparcel promptly. Report non-delivery within the timeframe stated in Interparcel&apos;s
                current terms.
              </p>
            </div>
            <div>
              <SubHeading>Evidence to keep</SubHeading>
              <p>
                Preserve all photos (taken before and after unpacking), the signed delivery note, and
                all original packaging until the matter is resolved. These are essential for any claim.
              </p>
            </div>
            <p className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-white/65">
              Claim deadlines and carrier liability limits are set by Interparcel&apos;s current terms —
              check these at the time of booking.
            </p>
          </Prose>
        </section>

        {/* Insurance */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Cover"
            title="Insurance"
          />
          <Prose>
            <p>
              Standard carrier liability is limited and may not cover the full value of commercial
              catering equipment. For high-value items, we strongly recommend arranging additional
              cover for the full replacement value of the goods.
            </p>
            <p>
              Insurance options, limits, and pricing are available through Interparcel at the time of
              booking. Review these carefully before confirming your shipment.
            </p>
          </Prose>
        </section>

        {/* Checklists */}
        <section className="mt-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
          <SectionHeading
            icon={<ClipboardList className="h-5 w-5" />}
            label="Quick reference"
            title="Checklists"
          />

          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">Seller checklist</p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {sellerChecklist.map(([title, detail]) => (
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

          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">Buyer checklist</p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {buyerChecklist.map(([title, detail]) => (
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
            This page is general guidance, not a contract. Delivery is arranged through Interparcel
            and is subject to their current terms, limits and pricing, confirmed at booking. For full
            carrier terms, liability and claim deadlines, refer to Interparcel at the time of booking.
          </p>
        </section>

      </div>
    </main>
    <SiteFooter />
    </>
  )
}
