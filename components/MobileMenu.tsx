"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

function MobileMenuLink({
  href,
  children,
  onClose,
}: {
  href: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black text-white transition hover:bg-white/8 hover:text-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/45"
    >
      {children}
      <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
    </Link>
  )
}

export default function MobileMenu({
  accountHref,
  accountLabel,
  sellHref,
  searchAllHref,
}: {
  accountHref: string
  accountLabel: string
  sellHref: string
  searchAllHref: string
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-16 w-16 items-center justify-center rounded-full border border-white/22 bg-white/8 text-white shadow-xl backdrop-blur-md"
      >
        {open ? (
          <X className="h-8 w-8" strokeWidth={2.2} />
        ) : (
          <Menu className="h-8 w-8" strokeWidth={2.2} />
        )}
      </button>

      {open && (
        <>
          {/* Tap-outside backdrop */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={close}
          />
          {/* Menu panel — z-50 escapes all stacking contexts */}
          <div className="absolute right-0 top-20 z-50 w-72 rounded-3xl border border-white/14 bg-[#001a34]/96 p-3 shadow-2xl backdrop-blur-xl">
            <MobileMenuLink href="/" onClose={close}>Home</MobileMenuLink>
            <MobileMenuLink href={searchAllHref} onClose={close}>Marketplace</MobileMenuLink>
            <MobileMenuLink href="/blog" onClose={close}>Blog</MobileMenuLink>
            <MobileMenuLink href={sellHref} onClose={close}>Sell an Item</MobileMenuLink>
            <MobileMenuLink href="/pricing" onClose={close}>Pricing</MobileMenuLink>
            <MobileMenuLink href={accountHref} onClose={close}>{accountLabel}</MobileMenuLink>
            <MobileMenuLink href="/about" onClose={close}>About</MobileMenuLink>
            <MobileMenuLink href="/contact" onClose={close}>Contact</MobileMenuLink>
          </div>
        </>
      )}
    </div>
  )
}
