import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Menu } from "lucide-react"
import type { ReactNode } from "react"

const marketplaceHref = "/marketplace"
const sellerEarlyAccessHref = "/#launch-list"

export function BlogHeader() {
  return (
    <header className="border-b border-white/10 bg-[#001A35]/94 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="CaterBidsUK home">
          <Image
            src="/brand/caterbids-logo.png"
            alt="CaterBidsUK bell logo"
            width={64}
            height={64}
            className="h-14 w-14 rounded-2xl object-contain"
            priority
          />
          <span>
            <span className="block text-2xl font-black leading-none tracking-[-0.04em] text-white sm:text-3xl">
              Cater<span className="text-[#FF6B00]">Bids</span>UK
            </span>
            <span className="mt-1 block text-[0.64rem] font-black uppercase tracking-[0.32em] text-[#FF6B00] sm:text-xs">
              BUY • SELL • SAVE
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-black text-white/82 lg:flex" aria-label="Blog navigation">
          <BlogNavLink href="/">Home</BlogNavLink>
          <BlogNavLink href={marketplaceHref}>Marketplace</BlogNavLink>
          <BlogNavLink href="/blog">Blog</BlogNavLink>
          <BlogNavLink href={sellerEarlyAccessHref}>Seller Early Access</BlogNavLink>
          <BlogNavLink href="/contact">Contact</BlogNavLink>
        </nav>

        <details className="relative lg:hidden">
          <summary className="flex h-14 w-14 cursor-pointer list-none items-center justify-center rounded-2xl border border-white/16 bg-white/8 text-white shadow-xl [&::-webkit-details-marker]:hidden">
            <Menu className="h-7 w-7" aria-hidden="true" />
            <span className="sr-only">Open menu</span>
          </summary>
          <div className="absolute right-0 top-16 z-30 w-72 rounded-3xl border border-white/14 bg-[#001A35]/98 p-3 shadow-2xl">
            <MobileBlogNavLink href="/">Home</MobileBlogNavLink>
            <MobileBlogNavLink href={marketplaceHref}>Marketplace</MobileBlogNavLink>
            <MobileBlogNavLink href="/blog">Blog</MobileBlogNavLink>
            <MobileBlogNavLink href={sellerEarlyAccessHref}>Seller Early Access</MobileBlogNavLink>
            <MobileBlogNavLink href="/contact">Contact</MobileBlogNavLink>
          </div>
        </details>
      </div>
    </header>
  )
}

export function BlogFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#00172e] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <section>
          <Link href="/" className="flex items-center gap-3" aria-label="CaterBidsUK home">
            <Image
              src="/brand/caterbids-logo.png"
              alt="CaterBidsUK bell logo"
              width={58}
              height={58}
              className="h-14 w-14 rounded-2xl object-contain"
            />
            <span>
              <span className="block text-2xl font-black leading-none tracking-[-0.04em]">
                Cater<span className="text-[#FF6B00]">Bids</span>UK
              </span>
              <span className="mt-1 block text-[0.65rem] font-black uppercase tracking-[0.28em] text-[#FF6B00]">
                BUY • SELL • SAVE
              </span>
            </span>
          </Link>
          <p className="mt-5 max-w-sm text-sm font-semibold leading-relaxed text-white/58">
            The UK marketplace and guide hub for commercial catering equipment, vans and hospitality assets.
          </p>
          <p className="mt-6 text-xs font-semibold text-white/45">© 2026 CaterBidsUK. All rights reserved.</p>
        </section>

        <FooterColumn
          title="Marketplace"
          links={[
            ["Browse Marketplace", marketplaceHref],
            ["Catering Equipment", marketplaceHref],
            ["Vans & Trailers", marketplaceHref],
            ["Sell Your Equipment", sellerEarlyAccessHref],
          ]}
        />
        <FooterColumn
          title="Company"
          links={[
            ["Blog", "/blog"],
            ["About Us", "/about"],
            ["Contact", "/contact"],
          ]}
        />
        <FooterColumn
          title="Support"
          links={[
            ["Privacy Policy", "/privacy"],
            ["Terms & Conditions", "/terms"],
          ]}
        />
      </div>
    </footer>
  )
}

function BlogNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="transition hover:text-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/45">
      {children}
    </Link>
  )
}

function MobileBlogNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black text-white transition hover:bg-white/8 hover:text-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/45"
    >
      {children}
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <section>
      <h2 className="text-sm font-black">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm font-semibold text-white/62">
        {links.map(([label, href]) => (
          <li key={`${label}-${href}`}>
            <Link href={href} className="transition hover:text-[#FF6B00]">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
