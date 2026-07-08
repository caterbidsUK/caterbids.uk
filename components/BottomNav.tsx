"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Bell, User } from "lucide-react"


function useIsActive(pathname: string) {
  return (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }
}

export default function BottomNav() {
  const pathname = usePathname()
  const isActive = useIsActive(pathname)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* mx-5 + mb-4: pill floats clearly inset from all screen edges */}
      <div className="mx-5 mb-4">
        {/*
          Floating pill: h-20 (80px) for breathing room, rounded-[2rem] pill shape,
          50% orange border + glow so the rim is clearly visible.
          overflow-visible allows the raised Sell circle to protrude above.
        */}
        <div
          className="relative flex h-20 items-center overflow-visible rounded-[2rem] border border-[#FF6B00]/50 bg-[#001a3a]"
          style={{ boxShadow: "0 0 28px rgba(255,107,0,0.22), 0 12px 40px rgba(0,0,0,0.75)" }}
        >

          {/* ── Home ── */}
          {(() => {
            const active = isActive("/")
            return (
              <Link
                href="/"
                aria-current={active ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-3"
              >
                <Home size={24} strokeWidth={active ? 2.5 : 1.75} className={active ? "text-[#FF6B00]" : "text-white/45"} />
                <span className={`text-[11px] tracking-wide ${active ? "font-bold text-[#FF6B00]" : "font-medium text-white/45"}`}>
                  Home
                </span>
                <span className={`h-0.5 w-4 rounded-full transition-opacity ${active ? "bg-[#FF6B00]" : "bg-transparent"}`} />
              </Link>
            )
          })()}

          {/* ── Search ── */}
          {(() => {
            const active = isActive("/search")
            return (
              <Link
                href="/search"
                aria-current={active ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-3"
              >
                <Search size={24} strokeWidth={active ? 2.5 : 1.75} className={active ? "text-[#FF6B00]" : "text-white/45"} />
                <span className={`text-[11px] tracking-wide ${active ? "font-bold text-[#FF6B00]" : "font-medium text-white/45"}`}>
                  Search
                </span>
                <span className={`h-0.5 w-4 rounded-full transition-opacity ${active ? "bg-[#FF6B00]" : "bg-transparent"}`} />
              </Link>
            )
          })()}

          {/* ── Sell (centre hero) ──
              Circle is absolute (doesn't affect label flow). Ghost spacer (h-6)
              stands in for the icon slot so "Sell" label aligns with the other tabs.
          */}
          <Link
            href="/post-listing"
            aria-label="Sell — post a listing"
            className="relative flex flex-1 flex-col items-center justify-center gap-1 py-3"
          >
            {/* Raised glowing orange circle — absolutely positioned, doesn't affect label flow */}
            <span
              className="absolute top-0 -translate-y-8 flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#FF6B00]"
              style={{ boxShadow: "0 0 22px rgba(255,107,0,0.70), 0 0 55px rgba(255,107,0,0.35), 0 6px 16px rgba(0,0,0,0.50)" }}
            >
              <Bell size={26} strokeWidth={2.5} className="text-white" />
            </span>
            {/* Ghost spacer: same height as icon slot (h-6 = 24px) so "Sell" label sits on the same baseline as other tabs */}
            <span className="h-6 w-px shrink-0" aria-hidden="true" />
            <span className="text-[10px] font-bold tracking-wide text-[#FF6B00]">Sell</span>
            <span className="h-0.5 w-4 shrink-0" aria-hidden="true" />
          </Link>

          {/* ── Account ── */}
          {(() => {
            const active = isActive("/account")
            return (
              <Link
                href="/account"
                aria-current={active ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-3"
              >
                <User size={24} strokeWidth={active ? 2.5 : 1.75} className={active ? "text-[#FF6B00]" : "text-white/45"} />
                <span className={`text-[11px] tracking-wide ${active ? "font-bold text-[#FF6B00]" : "font-medium text-white/45"}`}>
                  Account
                </span>
                <span className={`h-0.5 w-4 rounded-full transition-opacity ${active ? "bg-[#FF6B00]" : "bg-transparent"}`} />
              </Link>
            )
          })()}

        </div>
      </div>
    </nav>
  )
}
