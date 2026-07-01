import Image from "next/image"
import Link from "next/link"

const columns: { title: string; links: [string, string][] }[] = [
  {
    title: "Marketplace",
    links: [
      ["Browse Equipment", "/search"],
      ["Catering Equipment", "/category/catering-equipment"],
      ["Vans & Trailers", "/search?q=all&category=Catering%20Vans%20%26%20Trailers"],
      ["All Categories", "/search"],
    ],
  },
  {
    title: "Sell & Company",
    links: [
      ["Sell an Item", "/post-listing"],
      ["Pricing", "/pricing"],
      ["About Us", "/about"],
      ["How It Works", "/how-it-works"],
      ["Blog", "/blog"],
      ["Contact Us", "/contact"],
    ],
  },
  {
    title: "Support",
    links: [
      ["Safety Centre", "/safety"],
      ["Buyer Safety", "/buyer-safety"],
      ["Seller Safety", "/seller-safety"],
      ["Delivery Policy", "/delivery-policy"],
      ["Delivery Guide", "/pallet-delivery-guide"],
      ["Report an Issue", "/report-listing"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Terms & Conditions", "/terms"],
      ["Privacy Policy", "/privacy-policy"],
      ["Cookie Policy", "/legal/cookies"],
      ["Refund Policy", "/refund-policy"],
      ["Prohibited Items", "/legal/prohibited-items"],
    ],
  },
]

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#00172e] px-4 py-10 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">

          {/* Brand */}
          <section className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="CaterBidsUK home">
              <Image
                src="/brand/caterbids-logo.png"
                alt="CaterBidsUK bell logo"
                width={52}
                height={52}
                className="h-12 w-12 rounded-2xl object-contain"
              />
              <span>
                <span className="flex items-center gap-2">
                  <span className="block text-2xl font-black leading-none tracking-[-0.05em]">
                    Cater<span className="text-[#FF6B00]">Bids</span>UK
                  </span>
                  <span className="rounded-full bg-[#FF6B00] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">BETA</span>
                </span>
                <span className="mt-1 block text-[0.6rem] font-black uppercase tracking-[0.28em] text-[#FF6B00]">
                  BUY • SELL • SAVE
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm font-semibold leading-relaxed text-white/55">
              The UK marketplace for catering equipment, vans and hospitality assets.
            </p>
          </section>

          {/* Link columns */}
          {columns.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h3 className="text-sm font-black text-white">{title}</h3>
              <ul className="mt-4 space-y-2.5">
                {links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm font-semibold text-white/58 transition hover:text-[#FF6B00]"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Copyright bar */}
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs font-semibold text-white/38 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 CaterBidsUK. All rights reserved.</p>
          <p className="text-white/30">CaterBids is currently in beta — we&apos;re improving the platform daily.</p>
          <p>BUY • SELL • SAVE</p>
        </div>
      </div>
    </footer>
  )
}
