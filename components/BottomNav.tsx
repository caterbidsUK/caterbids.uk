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

  // Hide nav (and its spacer) on the listing-creation flow
  if (pathname === "/post-listing" || pathname.startsWith("/post-listing/")) return null

  return (
    <>
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
                <Home size={24} strokeWidth={active ? 2.5 : 1.75} className={active ? "text-white" : "text-white/45"} />
                <span className={`text-[11px] tracking-wide ${active ? "font-bold text-white" : "font-medium text-white/45"}`}>
                  Home
                </span>
                <span className={`h-0.5 w-4 rounded-full transition-opacity ${active ? "bg-white" : "bg-transparent"}`} />
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
                <Search size={24} strokeWidth={active ? 2.5 : 1.75} className={active ? "text-white" : "text-white/45"} />
                <span className={`text-[11px] tracking-wide ${active ? "font-bold text-white" : "font-medium text-white/45"}`}>
                  Search
                </span>
                <span className={`h-0.5 w-4 rounded-full transition-opacity ${active ? "bg-white" : "bg-transparent"}`} />
              </Link>
            )
          })()}

          {/* ── Sell ── */}
          {(() => {
            const active = isActive("/post-listing")
            return (
              <Link
                href="/post-listing/start"
                aria-label="Post a listing"
                className="flex flex-1 flex-col items-center justify-center gap-1 py-3"
              >
                <Bell size={24} strokeWidth={2.5} fill="#FF6B00" className="text-[#FF6B00]" />
                <span className="text-[11px] tracking-wide font-black text-[#FF6B00]">Sell</span>
                <span className={`h-0.5 w-4 rounded-full transition-opacity ${active ? "bg-[#FF6B00]" : "bg-transparent"}`} />
              </Link>
            )
          })()}

          {/* ── Account ── */}
          {(() => {
            const active = isActive("/account")
            return (
              <Link
                href="/account"
                aria-current={active ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-3"
              >
                <User size={24} strokeWidth={active ? 2.5 : 1.75} className={active ? "text-white" : "text-white/45"} />
                <span className={`text-[11px] tracking-wide ${active ? "font-bold text-white" : "font-medium text-white/45"}`}>
                  Account
                </span>
                <span className={`h-0.5 w-4 rounded-full transition-opacity ${active ? "bg-white" : "bg-transparent"}`} />
              </Link>
            )
          })()}

        </div>
      </div>
    </nav>
    </>
  )
}
