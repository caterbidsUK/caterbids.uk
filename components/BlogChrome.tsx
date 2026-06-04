import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Mail, Menu, Search, ShieldCheck, Sparkles } from "lucide-react"
import type { ReactNode } from "react"

const marketplaceHref = "/marketplace"
const sellerEarlyAccessHref = "/#launch-list"

const navLinks = [
  ["Home", "/"],
  ["Marketplace", marketplaceHref],
  ["Blog", "/blog"],
  ["Sell Equipment", sellerEarlyAccessHref],
  ["Logbook", "/blog"],
  ["Delivery", "/pallet-delivery-guide"],
  ["Safety Centre", "/safety"],
] as const

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#001A35]/95 shadow-[0_18px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="CaterBidsUK home">
          <Image
            src="/brand/caterbids-logo.png"
            alt="CaterBidsUK bell logo"
            width={58}
            height={58}
            className="h-12 w-12 rounded-2xl object-contain sm:h-14 sm:w-14"
            priority
          />
          <span className="min-w-0">
            <span className="block text-xl font-black leading-none tracking-[-0.04em] text-white sm:text-2xl">
              Cater<span className="text-[#FF6B00]">Bids</span>UK
            </span>
            <span className="mt-1 block text-[0.58rem] font-black uppercase tracking-[0.26em] text-[#FF6B00] sm:text-[0.65rem]">
              BUY • SELL • SAVE
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-5 text-sm font-black text-white/78 xl:flex" aria-label="Blog navigation">
          {navLinks.map(([label, href]) => (
            <BlogNavLink key={label} href={href} active={label === "Blog"}>
              {label}
            </BlogNavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex xl:ml-2">
          <Link
            href="/blog"
            aria-label="Search the blog"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white transition hover:border-[#FF6B00]/60 hover:text-[#FFB37A] focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/14 bg-white/8 px-4 text-sm font-black text-white transition hover:border-[#FF6B00]/60 hover:text-[#FFB37A] focus:outline-none focus:ring-4 focus:ring-white/15"
          >
            Login
          </Link>
          <Link
            href={sellerEarlyAccessHref}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#FF6B00] px-5 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,107,0,0.28)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25"
          >
            Start Free Listing
          </Link>
        </div>

        <details className="relative ml-auto lg:hidden">
          <summary className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-2xl border border-white/16 bg-white/8 text-white shadow-xl [&::-webkit-details-marker]:hidden">
            <Menu className="h-6 w-6" aria-hidden="true" />
            <span className="sr-only">Open menu</span>
          </summary>
          <div className="absolute right-0 top-14 z-50 w-[min(21rem,calc(100vw-2rem))] rounded-3xl border border-white/14 bg-[#001A35]/98 p-3 shadow-2xl">
            {navLinks.map(([label, href]) => (
              <MobileBlogNavLink key={label} href={href} active={label === "Blog"}>
                {label}
              </MobileBlogNavLink>
            ))}
            <div className="mt-2 grid gap-2 border-t border-white/10 pt-3">
              <MobileBlogNavLink href="/login">Login</MobileBlogNavLink>
              <Link
                href={sellerEarlyAccessHref}
                className="flex min-h-12 items-center justify-center rounded-2xl bg-[#FF6B00] px-4 text-sm font-black text-white transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25"
              >
                Start Free Listing
              </Link>
            </div>
          </div>
        </details>
      </div>
    </header>
  )
}

export function BlogFooter() {
  return (
    <footer className="border-t border-white/10 bg-[linear-gradient(180deg,#001A35,#001426)] px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr_1fr]">
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
            <p className="mt-5 max-w-sm text-sm font-semibold leading-relaxed text-white/62">
              The UK&apos;s dedicated marketplace for buying and selling commercial catering equipment, food vans,
              trailers and hospitality assets.
            </p>
            <div className="mt-6 flex flex-wrap gap-2" aria-label="Social links">
              {["Facebook", "Instagram", "TikTok", "LinkedIn", "YouTube"].map((label) => (
                <Link
                  key={label}
                  href="/contact"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/8 text-xs font-black text-white/72 transition hover:border-[#FF6B00]/60 hover:text-[#FFB37A]"
                >
                  {label === "Instagram" ? "IG" : label === "LinkedIn" ? "IN" : label[0]}
                </Link>
              ))}
            </div>
          </section>

          <FooterColumn
            title="Marketplace"
            links={[
              ["Browse Equipment", marketplaceHref],
              ["Catering Equipment", marketplaceHref],
              ["Food Vans & Trailers", marketplaceHref],
              ["Sell Your Equipment", sellerEarlyAccessHref],
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              ["About Us", "/about"],
              ["How It Works", "/how-it-works"],
              ["Blog", "/blog"],
              ["Contact Us", "/contact"],
            ]}
          />
          <FooterColumn
            title="Support"
            links={[
              ["Delivery Guide", "/pallet-delivery-guide"],
              ["Safety Centre", "/safety"],
              ["Terms & Conditions", "/terms"],
              ["Privacy Policy", "/privacy"],
            ]}
          />

          <section className="rounded-3xl border border-white/12 bg-white/8 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B00]/16 text-[#FFB37A]">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-white">Need Help?</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-white/62">
              Email <a className="text-[#FFB37A] hover:text-white" href="mailto:support@caterbids.uk">support@caterbids.uk</a>
            </p>
            <p className="mt-2 text-sm font-semibold text-white/54">Mon - Fri: 9:00am - 6:00pm</p>
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#001A35]/65 px-3 py-3 text-xs font-bold text-white/58">
              <ShieldCheck className="h-4 w-4 text-[#FF6B00]" aria-hidden="true" />
              Built for UK catering operators.
            </div>
          </section>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs font-semibold text-white/44 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 CaterBidsUK. All rights reserved.</p>
          <p className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#FF6B00]" aria-hidden="true" />
            Premium UK commercial catering marketplace.
          </p>
        </div>
      </div>
    </footer>
  )
}

function BlogNavLink({ href, active, children }: { href: string; active?: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative py-2 transition focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/45 ${
        active ? "text-[#FF6B00]" : "hover:text-[#FF6B00]"
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-1 -bottom-1 h-0.5 rounded-full bg-[#FF6B00]" aria-hidden="true" />}
    </Link>
  )
}

function MobileBlogNavLink({ href, active, children }: { href: string; active?: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/45 ${
        active ? "bg-[#FF6B00] text-white" : "text-white hover:bg-white/8 hover:text-[#FF6B00]"
      }`}
    >
      {children}
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <section>
      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">{title}</h2>
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
