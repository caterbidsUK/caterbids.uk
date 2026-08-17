import Link from "next/link"
import SiteLogo from "@/components/SiteLogo"
import { ChevronRight, Menu, Search } from "lucide-react"
import SiteFooter from "@/components/SiteFooter"
import type { ReactNode } from "react"

const marketplaceHref = "/search"
const sellerEarlyAccessHref = "/#launch-list"

const navLinks = [
  ["Home", "/"],
  ["Marketplace", marketplaceHref],
  ["Blog", "/blog"],
  ["Sell Equipment", sellerEarlyAccessHref],
] as const

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#001A35]/95 shadow-[0_18px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" aria-label="CaterBidsUK home">
          <SiteLogo size="sm" priority />
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
  return <SiteFooter />
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

