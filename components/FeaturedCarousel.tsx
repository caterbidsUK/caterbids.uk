"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import FeaturedListingCard from "@/components/FeaturedListingCard"
import type { Database } from "@/types/supabase"

type Listing = Database["public"]["Tables"]["listings"]["Row"]

const INTERVAL_MS = 5000
const FADE_MS = 200

function useVisibleCount() {
  const [count, setCount] = useState(1)
  useEffect(() => {
    const update = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setCount(3)
      else if (window.matchMedia("(min-width: 768px)").matches) setCount(2)
      else setCount(1)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])
  return count
}

export default function FeaturedCarousel({ listings }: { listings: Listing[] }) {
  const n = listings.length
  const visibleCount = useVisibleCount()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const totalPages = n > 0 ? Math.ceil(n / visibleCount) : 0
  const currentPage = Math.floor(currentIndex / visibleCount)

  // Reset to page 0 when visible count changes (resize)
  useEffect(() => {
    setCurrentIndex(0)
    setOpacity(1)
  }, [visibleCount])

  const advance = useCallback((targetIndex: number) => {
    setOpacity(0)
    setTimeout(() => {
      setCurrentIndex(targetIndex)
      setOpacity(1)
    }, FADE_MS)
  }, [])

  useEffect(() => {
    if (isPaused || totalPages <= 1) return
    const timer = setInterval(() => {
      setOpacity(0)
      setTimeout(() => {
        setCurrentIndex((ci) => {
          const cp = Math.floor(ci / visibleCount)
          const np = (cp + 1) % totalPages
          return np * visibleCount
        })
        setOpacity(1)
      }, FADE_MS)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [isPaused, totalPages, visibleCount, currentIndex])

  if (n === 0) return null

  // Static grid when everything fits without paging — no arrows, dots, or timer needed
  if (totalPages <= 1) {
    return (
      <div
        className="mt-5 grid gap-4"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      >
        {listings.map((listing) => (
          <FeaturedListingCard key={String(listing.id)} listing={listing} />
        ))}
      </div>
    )
  }

  const visibleListings = Array.from({ length: Math.min(visibleCount, n) }, (_, i) =>
    listings[(currentIndex + i) % n]
  )

  const handleNext = () => advance(((currentPage + 1) % totalPages) * visibleCount)
  const handlePrev = () => advance(((currentPage - 1 + totalPages) % totalPages) * visibleCount)

  return (
    <div
      className="relative mt-5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Cards */}
      <div
        className="grid gap-4"
        style={{
          opacity,
          transition: `opacity ${FADE_MS}ms ease`,
          gridTemplateColumns: `repeat(${visibleListings.length}, 1fr)`,
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return
          const delta = e.changedTouches[0].clientX - touchStartX.current
          touchStartX.current = null
          if (delta < -50) handleNext()
          else if (delta > 50) handlePrev()
        }}
      >
        {visibleListings.map((listing, i) => (
          <FeaturedListingCard key={i} listing={listing} />
        ))}
      </div>

      {/* Prev arrow */}
      <button
        onClick={handlePrev}
        aria-label="Previous listings"
        className="absolute -left-3 top-20 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-[#001a34]/90 text-white shadow-lg backdrop-blur-sm transition hover:border-[#FF6B00]/60 hover:text-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      </button>

      {/* Next arrow */}
      <button
        onClick={handleNext}
        aria-label="Next listings"
        className="absolute -right-3 top-20 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-[#001a34]/90 text-white shadow-lg backdrop-blur-sm transition hover:border-[#FF6B00]/60 hover:text-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
      </button>

      {/* Dots — one per page */}
      <div
        className="mt-4 flex justify-center gap-2"
        role="tablist"
        aria-label="Featured listing navigation"
      >
        {Array.from({ length: totalPages }, (_, pageIdx) => (
          <button
            key={pageIdx}
            role="tab"
            aria-selected={pageIdx === currentPage}
            aria-label={`Page ${pageIdx + 1} of ${totalPages}`}
            onClick={() => advance(pageIdx * visibleCount)}
            className={[
              "h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40",
              pageIdx === currentPage ? "w-6 bg-[#FF6B00]" : "w-2 bg-white/25 hover:bg-white/45",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  )
}
