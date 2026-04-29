"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import {
  ArrowLeft,
  Search,
  MapPin,
  Tag,
  ExternalLink,
  Loader2,
  SlidersHorizontal,
  AlertCircle,
  TreePine,
  Users,
} from "lucide-react"

type Listing = {
  id: string
  title: string
  price: string
  location: string
  category: string
  condition?: string
  description: string
  image?: string
}

type EbayItem = {
  itemId: string
  title: string
  image?: { imageUrl?: string }
  price?: { value: string; currency: string }
  itemWebUrl?: string
  condition?: string
  itemLocation?: {
    country?: string
    postalCode?: string
  }
}

function SearchContent() {
  const params = useSearchParams()
  const router = useRouter()

  const query = params.get("q") || ""
  const categoryParam = params.get("category") || "All Categories"
  const locationParam = params.get("location") || "All UK"

  const [listings, setListings] = useState<Listing[]>([])
  const [ebayResults, setEbayResults] = useState<EbayItem[]>([])
  const [loadingEbay, setLoadingEbay] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "equipment" | "vans" | "businesses">("all")

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("caterbids_listings") || "[]")
    const words = query.toLowerCase().split(" ").filter(Boolean)

    let filtered = stored.filter((item: Listing) => {
      const allText = `
        ${item.title}
        ${item.price}
        ${item.location}
        ${item.category}
        ${item.condition || ""}
        ${item.description}
      `.toLowerCase()

      return words.length === 0 || words.every((word) => allText.includes(word))
    })

    if (activeFilter !== "all") {
      const map: Record<string, string[]> = {
        equipment: ["equipment", "oven", "fryer", "grill", "fridge", "freezer", "dishwasher", "coffee"],
        vans: ["van", "trailer", "truck"],
        businesses: ["business", "cafe", "takeaway", "restaurant"],
      }
      const keywords = map[activeFilter] || []
      filtered = filtered.filter((item: Listing) =>
        keywords.some((k) => item.category.toLowerCase().includes(k) || item.title.toLowerCase().includes(k))
      )
    }

    setListings(filtered)
  }, [query, activeFilter])

  useEffect(() => {
    async function fetchEbayResults() {
      setLoadingEbay(true)
      try {
        const res = await fetch(`/api/ebay-search?q=${encodeURIComponent((query || '') + ' catering equipment')}`)
        const data = await res.json()
        if (data.itemSummaries && Array.isArray(data.itemSummaries)) {
          setEbayResults(data.itemSummaries)
        } else {
          setEbayResults([])
        }
      } catch (error) {
        console.error("EBAY ERROR:", error)
        setEbayResults([])
      }
      setLoadingEbay(false)
    }
    fetchEbayResults()
  }, [query])

  const filterChips: { key: "all" | "equipment" | "vans" | "businesses"; label: string }[] = [
    { key: "all", label: "All Results" },
    { key: "equipment", label: "Equipment" },
    { key: "vans", label: "Vans" },
    { key: "businesses", label: "Businesses" },
  ]

  return (
    <main className="min-h-screen bg-[#001633] text-white pb-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 py-5">
          <button
            onClick={() => router.back()}
            className="rounded-xl p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-xl font-bold">
              Cater<span className="text-[#FF6B00]">Bids</span>.UK
            </h1>
            <p className="text-xs font-medium tracking-wider text-[#FF6B00] uppercase">
              Live Search Results
            </p>
          </div>
        </div>

        {/* Search Summary */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Search className="h-4 w-4" />
            Showing results for
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{query || "All listings"}</h2>
            {categoryParam !== "All Categories" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6B00]/10 px-2.5 py-0.5 text-xs font-medium text-[#FF6B00]">
                <Tag className="h-3 w-3" /> {categoryParam}
              </span>
            )}
            {locationParam !== "All UK" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/70">
                <MapPin className="h-3 w-3" /> {locationParam}
              </span>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-white/40" />
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setActiveFilter(chip.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
                activeFilter === chip.key
                  ? "bg-[#FF6B00] text-white shadow-lg shadow-orange-500/20"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* CaterBids Results */}
        <SectionHeader title="CaterBids Results" count={listings.length} />

        {listings.length === 0 && (
          <div className="mb-8 flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <AlertCircle className="h-10 w-10 text-white/30" />
            <p className="mt-3 text-sm text-white/60">No CaterBids listings found yet.</p>
            <button
              onClick={() => router.push("/post-listing")}
              className="mt-3 rounded-xl bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Be the first to list
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {listings.map((item) => (
            <ListingCard key={item.id} item={item} onClick={() => router.push(`/listing?id=${item.id}`)} />
          ))}
        </div>

        {/* Live eBay Results */}
        <div className="mt-10">
          <SectionHeader title="Live eBay Results" count={ebayResults.length} loading={loadingEbay} />
        </div>

        {loadingEbay && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ebayResults.map((item) => (
            <EbayCard key={item.itemId} item={item} />
          ))}
        </div>

        {/* Other Platforms */}
        <h3 className="mb-3 mt-10 text-base font-bold">Other Platforms</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PlatformButton
            icon={<Users className="h-5 w-5 text-blue-400" />}
            label="Facebook Marketplace"
            color="from-blue-500/10 to-transparent"
            onClick={() =>
              window.open(
                `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(query)}`,
                "_blank"
              )
            }
          />
          <PlatformButton
            icon={<TreePine className="h-5 w-5 text-green-400" />}
            label="Gumtree"
            color="from-green-500/10 to-transparent"
            onClick={() =>
              window.open(
                `https://www.gumtree.com/search?search_category=all&q=${encodeURIComponent(query)}`,
                "_blank"
              )
            }
          />
        </div>
      </div>
    </main>
  )
}

/* ------------------ SUB-COMPONENTS ------------------ */

function SectionHeader({ title, count, loading }: { title: string; count: number; loading?: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-base font-bold">{title}</h3>
      <span className="flex items-center gap-1.5 text-sm text-white/50">
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {loading ? "Loading..." : `${count} found`}
      </span>
    </div>
  )
}

function ListingCard({ item, onClick }: { item: Listing; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-all hover:border-white/20 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
    >
      {item.image && (
        <div className="relative h-44 overflow-hidden">
          <img
            src={item.image}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#001633]/60 to-transparent" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h4 className="line-clamp-2 text-sm font-bold leading-snug">{item.title}</h4>
          <span className="shrink-0 rounded-lg bg-[#FF6B00]/10 px-2 py-1 text-xs font-bold text-[#FF6B00]">
            {item.price}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/50">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {item.location}
          </span>
          <span>•</span>
          <span>{item.category}</span>
        </div>

        {item.condition && (
          <span className="mt-2 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/60">
            {item.condition}
          </span>
        )}

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/50">
          {item.description}
        </p>

        <div className="mt-3 text-xs font-bold text-[#FF6B00] transition-colors group-hover:text-orange-400">
          View Listing →
        </div>
      </div>
    </button>
  )
}

function EbayCard({ item }: { item: EbayItem }) {
  return (
    <a
      href={item.itemWebUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-all hover:border-white/20 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
    >
      {item.image?.imageUrl && (
        <div className="relative h-44 overflow-hidden bg-white">
          <img
            src={item.image.imageUrl}
            alt={item.title}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      <div className="p-4">
        <h4 className="line-clamp-2 text-sm font-bold leading-snug">{item.title}</h4>

        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-lg bg-[#FF6B00]/10 px-2 py-1 text-xs font-bold text-[#FF6B00]">
            {item.price?.currency === "GBP" ? "£" : item.price?.currency || "£"}
            {item.price?.value}
          </span>
          {item.condition && (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/60">
              {item.condition}
            </span>
          )}
        </div>

        {item.itemLocation?.country && (
          <div className="mt-2 flex items-center gap-1 text-xs text-white/50">
            <MapPin className="h-3 w-3" />
            {item.itemLocation.country}
          </div>
        )}

        <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[#FF6B00] transition-colors group-hover:text-orange-400">
          View on eBay <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </a>
  )
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
      <div className="h-44 animate-pulse bg-white/5" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
      </div>
    </div>
  )
}

function PlatformButton({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-r ${color} p-4 text-left transition-all hover:border-white/20 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-white/50">Search now →</div>
      </div>
    </button>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#001633] text-white flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
