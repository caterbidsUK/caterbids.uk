"use client"

import SiteFooter from "@/components/SiteFooter"
import SiteLogo from "@/components/SiteLogo"
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth'
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import {
  Search,
  MapPin,
  Tag,
  Loader2,
  SlidersHorizontal,
  AlertCircle,
  TreePine,
  Users,
  Heart,
  Home,
  Menu,
  Plus,
  X,
  UserCircle,
  Bell,
  Shield,
  CheckCircle,
  Star,
} from "lucide-react"

import type { Database } from '@/types/supabase'
import { trustBadgesForListing } from '@/lib/listing-trust'
import { CATERING_CATEGORIES, MARKETPLACE_CATEGORIES, categoryBySlug, categoryFromParam } from "@/lib/categories"
import { applyFeaturedFirst, isFeaturedAndActive } from "@/lib/featured"

type Listing = Database['public']['Tables']['listings']['Row']
type ConditionFilter = "all" | "new" | "used"
type PlatformTab = "caterbids" | "facebook" | "gumtree"
type CategoryFilter = "all" | string
type SortMode = "best" | "newest" | "price_low" | "price_high"
type SavedFavourite = {
  id: string
  user_id?: string
  source: "caterbids" | "ebay"
  title: string
  price: string
  location: string
  category?: string
  condition?: string
  imageUrl?: string
  url?: string
  savedAt: string
}
type SavedSearch = {
  query: string
  location: string
  category: string
  condition: string
  savedAt: string
}

const FAVOURITES_KEY = "caterbids_favourites"
const SAVED_SEARCHES_KEY = "caterbids_saved_searches"
const LOCAL_LISTINGS_KEY = "caterbids_listings"
const LOCAL_CURRENT_LISTING_KEY = "caterbids_current_listing"
const LOCAL_PUBLIC_LISTINGS_KEY = "caterbids_public_listings"
const GENERIC_MARKETPLACE_TERMS = new Set([
  "all",
  "commercial",
  "catering",
  "equipment",
  "uk",
  "used",
  "second",
  "hand",
  "refurbished",
  "sale",
  "for",
])

const maskStyle = (slug: string): React.CSSProperties => ({
  backgroundColor: "currentColor",
  WebkitMaskImage: `url('/icons/categories/${slug}.svg')`,
  maskImage: `url('/icons/categories/${slug}.svg')`,
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
})

const conditionFilters: { key: ConditionFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "used", label: "Used" },
]

const normaliseCondition = (condition?: string | null) => {
  const value = condition?.toLowerCase() || ""
  if (value.includes("new")) return "new"
  if (
    value.includes("used") ||
    value.includes("pre-owned") ||
    value.includes("pre owned") ||
    value.includes("second hand") ||
    value.includes("seller refurbished") ||
    value.includes("manufacturer refurbished") ||
    value.includes("refurbished")
  ) {
    return value.includes("refurbished") ? "refurbished" : "used"
  }
  return "unknown"
}

function conditionLabel(condition?: string | null) {
  const normalised = normaliseCondition(condition)
  if (normalised === "new") return "New"
  if (normalised === "used") return "Used"
  if (normalised === "refurbished") return "Refurbished"
  return condition || ""
}

function conditionBadgeClass(condition?: string | null) {
  const normalised = normaliseCondition(condition)
  if (normalised === "new") return "border-green-400/25 bg-green-500/10 text-green-200"
  if (normalised === "refurbished") return "border-[#FF6B00]/30 bg-[#FF6B00]/10 text-orange-200"
  return "border-white/10 bg-white/5 text-white/60"
}

function noConditionResultsText(conditionFilter: ConditionFilter) {
  if (conditionFilter === "new") return "No new results found."
  if (conditionFilter === "used") return "No used results found."
  return "No results found."
}

function initialCategoryFilter(categoryParam: string): CategoryFilter {
  return categoryFromParam(categoryParam)?.slug || "all"
}

function readSavedFavourites() {
  if (typeof window === "undefined") return [] as SavedFavourite[]
  try {
    const saved = JSON.parse(localStorage.getItem(FAVOURITES_KEY) || "[]") as SavedFavourite[]
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function writeSavedFavourites(items: SavedFavourite[]) {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(items))
}

function readLocalListings() {
  if (typeof window === "undefined") return [] as Listing[]

  function readList(key: string) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]") as Listing[]
      return Array.isArray(saved) ? saved : []
    } catch (error) {
      console.warn(`Could not read ${key}:`, error)
      localStorage.removeItem(key)
      return []
    }
  }

  function readSingle(key: string) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null") as Listing | null
      return saved && typeof saved === "object" ? [saved] : []
    } catch (error) {
      console.warn(`Could not read ${key}:`, error)
      localStorage.removeItem(key)
      return []
    }
  }

  const byId = new Map<string, Listing>()
  for (const item of [
    ...readList(LOCAL_LISTINGS_KEY),
    ...readList(LOCAL_PUBLIC_LISTINGS_KEY),
    ...readSingle(LOCAL_CURRENT_LISTING_KEY),
  ]) {
    const id = listingId(item?.id)
    if (id) byId.set(id, item)
  }

  const listings = Array.from(byId.values())
  if (listings.length > 0) {
    localStorage.setItem(LOCAL_LISTINGS_KEY, JSON.stringify(listings))
    localStorage.setItem(LOCAL_PUBLIC_LISTINGS_KEY, JSON.stringify(listings))
  }

  return listings
}

function listingId(value: unknown) {
  return String(value ?? "")
}

function meaningfulSearchWords(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ""))
    .filter((word) => word.length > 2 && !GENERIC_MARKETPLACE_TERMS.has(word))
}

function isBroadMarketplaceQuery(value: string) {
  const words = value.toLowerCase().split(/\s+/).filter(Boolean)
  return words.length > 0 && words.every((word) => GENERIC_MARKETPLACE_TERMS.has(word.replace(/[^a-z0-9]/g, "")))
}

function listingMatchesSearch(item: Listing, searchQuery: string) {
  if (!searchQuery.trim() || isBroadMarketplaceQuery(searchQuery)) return true
  const words = meaningfulSearchWords(searchQuery)
  if (words.length === 0) return true
  const allText = [
    item.title, item.price, item.location, item.city,
    item.category, item.subcategory, item.condition,
    item.power_type, item.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return words.some((word) => allText.includes(word))
}

function priceNumber(value?: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const cleaned = String(value || "").replace(/[^0-9.]/g, "")
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function displayPrice(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "Price on request"
  if (typeof value === "number") return `£${value.toLocaleString("en-GB")}`
  const text = String(value)
  return text.includes("£") ? text : `£${text}`
}

function sortListings<T extends { created_at?: string | null; price?: string | number | null }>(
  items: T[],
  mode: SortMode
) {
  if (mode === "best") return items
  return [...items].sort((a, b) => {
    if (mode === "newest") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    if (mode === "price_low") return priceNumber(a.price) - priceNumber(b.price)
    if (mode === "price_high") return priceNumber(b.price) - priceNumber(a.price)
    return 0
  })
}

/* ─────────────────────────────────────────────────────────────────────────── */

function SearchContent() {
  const params = useSearchParams()
  const router = useRouter()

  const query = params.get("q") || ""
  const categoryParam = params.get("category") || "All Categories"
  const locationParam = params.get("location") || "All UK"
  const initialCity = params.get("city") || (locationParam !== "All UK" ? locationParam : "")
  const initialCondition = (params.get("condition") || "all") as ConditionFilter

  const [listings, setListings] = useState<Listing[]>([])
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>(initialCategoryFilter(categoryParam))
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>(
    ["all", "new", "used"].includes(initialCondition) ? initialCondition : "all"
  )
  const [city, setCity] = useState(initialCity)
  const [savedFavouriteIds, setSavedFavouriteIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [savingSearch, setSavingSearch] = useState(false)
  const [activePlatformTab, setActivePlatformTab] = useState<PlatformTab>("caterbids")
  const [sortMode, setSortMode] = useState<SortMode>("best")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const user = await getCurrentUser(supabase)
      const nextUserId = user?.id || null
      setUserId(nextUserId)
      setSavedFavouriteIds(
        nextUserId
          ? new Set(
              readSavedFavourites()
                .filter((item) => String(item.user_id ?? "") === nextUserId)
                .map((item) => item.id)
            )
          : new Set()
      )
    }
    loadUser()
  }, [])

  function loginRedirect(message: string) {
    const currentPage = `/search${params.toString() ? `?${params.toString()}` : ""}`
    router.push(`/login?next=${encodeURIComponent(currentPage)}&message=${encodeURIComponent(message)}`)
  }

  function searchUrl({
    nextQuery = query,
    nextCity = city,
    nextCategory = activeFilter,
    nextCondition = conditionFilter,
  }: {
    nextQuery?: string
    nextCity?: string
    nextCategory?: CategoryFilter
    nextCondition?: ConditionFilter
  } = {}) {
    const searchParams = new URLSearchParams()
    const activeCategory = categoryBySlug(nextCategory)
    const cleanQuery = nextQuery.trim()
    const cleanCity = nextCity.trim()
    searchParams.set("q", cleanQuery || "all")
    searchParams.set("category", activeCategory?.title || "All Categories")
    searchParams.set("location", cleanCity || locationParam || "All UK")
    if (nextCondition !== "all") searchParams.set("condition", nextCondition)
    if (cleanCity) searchParams.set("city", cleanCity)
    return `/search?${searchParams.toString()}`
  }

  function submitSearchForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextQuery = String(formData.get("q") || "").trim()
    const nextCity = String(formData.get("city") || "").trim()
    setCity(nextCity)
    router.push(searchUrl({ nextQuery, nextCity }))
  }

  function clearAllFilters() {
    setActiveFilter("all")
    setConditionFilter("all")
    setCity("")
    router.push("/search?q=all&category=All%20Categories&location=All%20UK")
  }

  async function toggleFavourite(item: SavedFavourite) {
    if (!userId) {
      loginRedirect("Create a free account to save listings.")
      return
    }
    const existing = readSavedFavourites()
    const itemId = String(item.id ?? "")
    const isSaved = existing.some(
      (savedItem) => String(savedItem.id ?? "") === itemId && String(savedItem.user_id ?? "") === userId
    )
    const next = isSaved
      ? existing.filter(
          (savedItem) => !(String(savedItem.id ?? "") === itemId && String(savedItem.user_id ?? "") === userId)
        )
      : [{ ...item, user_id: userId, savedAt: new Date().toISOString() }, ...existing]
    writeSavedFavourites(next)
    setSavedFavouriteIds(
      new Set(
        next.filter((savedItem) => String(savedItem.user_id ?? "") === userId).map((savedItem) => savedItem.id)
      )
    )
    setNotice(isSaved ? "Removed from saved listings." : "Saved to your favourites.")

    const supabase = createClient()
    const externalId = itemId.replace(/^(caterbids|ebay):/, "")
    if (isSaved) {
      const { error } = await supabase
        .from("favourites").delete().eq("user_id", userId).eq("source", item.source).eq("external_id", externalId)
      if (error) console.warn("Favourite delete unavailable:", error.message || error)
      return
    }
    const { error } = await supabase.from("favourites").upsert(
      {
        user_id: userId, source: item.source, external_id: externalId,
        title: item.title, price: item.price || null, location: item.location || null,
        category: item.category || null, condition: item.condition || null,
        image_url: item.imageUrl || null, url: item.url || null,
      },
      { onConflict: "user_id,source,external_id" }
    )
    if (error) console.warn("Favourite save unavailable:", error.message || error)
  }

  function externalSearchQuery() {
    return [platformSearchQuery, city.trim() || initialCity || ""].filter(Boolean).join(" ")
  }

  function externalPlatformUrl(platform: "facebook" | "gumtree") {
    const externalQuery = externalSearchQuery()
    if (platform === "facebook") {
      return `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(externalQuery)}`
    }
    return `https://www.gumtree.com/search?search_category=all&q=${encodeURIComponent(externalQuery)}`
  }

  function openExternalPlatform(platform: "facebook" | "gumtree") {
    window.open(externalPlatformUrl(platform), "_blank", "noopener,noreferrer")
  }

  function handlePlatformTab(tab: PlatformTab) {
    setActivePlatformTab(tab)
    if (tab === "facebook" || tab === "gumtree") {
      openExternalPlatform(tab)
      return
    }
    document.getElementById("caterbids-results")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function saveThisSearch() {
    if (!userId) {
      loginRedirect("Create a free account to save searches.")
      return
    }
    setSavingSearch(true)
    const savedSearch = {
      query: query || "all",
      location: city.trim() || initialCity || locationParam || "All UK",
      category: activeFilter,
      condition: conditionFilter,
      savedAt: new Date().toISOString(),
    }
    let existing = [] as SavedSearch[]
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || "[]") as SavedSearch[]
      existing = Array.isArray(saved) ? saved : []
    } catch {
      existing = []
    }
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify([savedSearch, ...existing]))

    const supabase = createClient()
    const currentPage = `/search${params.toString() ? `?${params.toString()}` : ""}`
    const { error } = await supabase.from("saved_searches").insert({
      user_id: userId, query: savedSearch.query, location: savedSearch.location,
      category: savedSearch.category, condition: savedSearch.condition,
      search_url: currentPage, search_query: query || "",
      city: city.trim() || initialCity || null,
    })
    setSavingSearch(false)
    if (error) {
      console.warn("Saved search unavailable:", error.message || error)
      setNotice("Saved locally. Apply the saved searches migration before public launch.")
      return
    }
    setNotice("Search saved to your account.")
  }

  useEffect(() => {
    async function fetchListings() {
      async function soldListingIds() {
        try {
          const res = await fetch("/api/sold-listings", { cache: "no-store" })
          if (!res.ok) return new Set<string>()
          const data = (await res.json()) as { listingIds?: string[] }
          return new Set((data.listingIds || []).map((item) => listingId(item)))
        } catch (error) {
          console.warn("Sold listing filter unavailable:", error)
          return new Set<string>()
        }
      }

      // cityFilter defaults to initialCity; pass "" for the location-agnostic fallback pass
      function localListings(soldIds: Set<string>, cityFilter = initialCity) {
        const saved = readLocalListings()
        return saved.filter((item) => {
          const itemId = listingId(item.id)
          const cityText = `${item.city || ""} ${item.location || ""}`.toLowerCase()
          const matchesWords = listingMatchesSearch(item, query)
          const matchesCity = !cityFilter || cityText.includes(cityFilter.toLowerCase())
          const isLive = !item.status || item.status === "live" || item.status === "payment_pending"
          const isSold = item.status === "sold" || soldIds.has(itemId)
          return matchesWords && matchesCity && isLive && !isSold
        })
      }

      function applyCategory(items: Listing[]) {
        if (activeFilter === "all") return items
        const activeCategory = categoryBySlug(activeFilter)
        if (!activeCategory) return items
        return items.filter((item) => {
          const haystack = `${item.category || ""} ${item.subcategory || ""} ${item.title || ""}`.toLowerCase()
          if (activeCategory.slug === "catering-equipment") {
            return (
              haystack.includes("equipment") ||
              CATERING_CATEGORIES.some((category) =>
                haystack.includes(category.title.toLowerCase()) ||
                category.subcategories.some((subcategory) => haystack.includes(subcategory.toLowerCase()))
              )
            )
          }
          return (
            haystack.includes(activeCategory.title.toLowerCase()) ||
            activeCategory.subcategories.some((subcategory) => haystack.includes(subcategory.toLowerCase()))
          )
        })
      }

      function mergeRemote(local: Listing[], remote: Listing[]) {
        const remoteIds = new Set(remote.map((item) => listingId(item.id)))
        return [...local.filter((item) => !remoteIds.has(listingId(item.id))), ...remote]
      }

      const soldIds = await soldListingIds()
      const supabase = createClient()

      // Build the keyword portion of the query (no city filter yet)
      function buildBaseQuery() {
        let q = supabase
          .from('listings')
          .select('*')
          .or('status.is.null,status.eq.live,status.eq.payment_pending')
          .order('created_at', { ascending: false })
        if (query && !isBroadMarketplaceQuery(query)) {
          const words = meaningfulSearchWords(query)
          const orConditions = words.map(word =>
            `title.ilike.%${word}%,price.ilike.%${word}%,location.ilike.%${word}%,description.ilike.%${word}%,subcategory.ilike.%${word}%`
          ).join(',')
          if (orConditions) q = q.or(orConditions)
        }
        return q
      }

      // Quote the ilike pattern per PostgREST's quoting rules so no user-supplied character
      // is ever in a structural position in the filter string. A value wrapped in "..." is
      // parsed as a single token regardless of commas, dots, parens, or percent signs it
      // contains. Embedded double-quotes are escaped to "" per PostgREST convention.
      // PostgreSQL still interprets the % wildcards we add because ilike always treats %
      // as a wildcard in the pattern, before or after PostgREST strips the outer quotes.
      const escapedCity = initialCity.replace(/"/g, '""')
      const primaryQuery = initialCity
        ? buildBaseQuery().or(`city.ilike."%${escapedCity}%",location.ilike."%${escapedCity}%"`)
        : buildBaseQuery()

      const { data, error } = await primaryQuery
      if (error) {
        console.warn('Listings unavailable:', error.message || error)
        setListings(localListings(soldIds))
        return
      }

      const filtered = applyCategory(mergeRemote(localListings(soldIds), (data || []) as Listing[]))

      // Outcome-based location fallback: if the city filter produced nothing, retry without it.
      // Only show "No matching listings found" when the unfiltered search also returns nothing.
      if (filtered.length === 0 && initialCity) {
        const { data: fallbackData, error: fallbackError } = await buildBaseQuery()
        if (!fallbackError) {
          const fallbackFiltered = applyCategory(
            mergeRemote(localListings(soldIds, ""), (fallbackData || []) as Listing[])
          )
          if (fallbackFiltered.length > 0) {
            setListings(fallbackFiltered)
            setNotice("No listings matched that location, so we're showing all UK listings.")
            return
          }
        }
      }

      setListings(filtered)
    }

    fetchListings()
  }, [query, activeFilter, initialCity])

  const platformSearchQuery = query || "commercial catering equipment"

  const filterByCondition = <T extends { condition?: string | null }>(items: T[]) => {
    if (conditionFilter === "all") return items
    return items.filter((item) => {
      const condition = normaliseCondition(item.condition)
      return condition === conditionFilter
    })
  }

  const filteredCaterBidsResults = filterByCondition(
    listings.map((listing) => ({ ...listing, condition: normaliseCondition(listing.condition) }))
  )
  const sortedCaterBidsResults = applyFeaturedFirst(
    sortListings(filteredCaterBidsResults, sortMode) as Record<string, unknown>[]
  ) as typeof filteredCaterBidsResults
  const totalVisibleResults = sortedCaterBidsResults.length
  const activeCategory = categoryBySlug(activeFilter)
  const heading =
    query && query !== "all"
      ? `Results for "${query}"`
      : activeCategory
        ? `${activeCategory.title}`
        : "All catering equipment"

  const isEquipmentTab = (slug: string) =>
    slug === "all" ||
    slug === "catering-equipment" ||
    CATERING_CATEGORIES.some((c) => c.slug === slug)

  /* ── JSX ─────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-[#001A35] pb-28 text-white">

      {/* ── SECTION 1 · Header ──────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#001A35]/96 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex shrink-0 items-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
          >
            <SiteLogo size="sm" priority />
          </Link>

          <nav className="ml-auto hidden items-center gap-1 text-sm font-bold text-white/80 lg:flex">
            <Link href="/post-listing/start" className="rounded-xl px-3 py-2 transition hover:text-[#FF6B00]">Sell</Link>
            <Link href="/favourites" className="rounded-xl px-3 py-2 transition hover:text-[#FF6B00]">Saved</Link>
            <Link href="/account" className="rounded-xl px-3 py-2 transition hover:text-[#FF6B00]">Account</Link>
            <Link
              href="/post-listing/start"
              className="ml-3 rounded-2xl bg-[#FF6B00] px-5 py-2.5 font-black text-white shadow-[0_8px_24px_rgba(255,107,0,0.28)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/30"
            >
              List free
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true">
          <div className="ml-auto flex h-full w-[82vw] max-w-sm flex-col border-l border-white/10 bg-[#062747] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <SiteLogo size="sm" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8 grid gap-2 text-base font-bold">
              {[
                ["Home", "/"],
                ["Browse Equipment", "/search?q=all&category=All%20Categories&location=All%20UK"],
                ["Sell an Item", "/post-listing/start"],
                ["Saved Items", "/favourites"],
                ["Account", "/account"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:border-[#FF6B00]/40 hover:text-[#FF6B00]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[2rem] border-t border-white/10 bg-[#062747] p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6">
              <FilterGroup title="Condition">
                <div className="grid grid-cols-3 gap-2">
                  {conditionFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setConditionFilter(filter.key)}
                      className={`rounded-2xl border px-3 py-2 text-sm font-bold transition ${
                        conditionFilter === filter.key
                          ? "border-[#FF6B00] bg-[#FF6B00] text-white"
                          : "border-white/10 bg-white/5 text-white/75"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup title="Location">
                <form onSubmit={submitSearchForm} className="grid gap-3">
                  <input type="hidden" name="q" value={query} readOnly />
                  <input
                    name="city"
                    defaultValue={city}
                    placeholder="Postcode or city"
                    className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-sm font-semibold text-white outline-none placeholder:text-white/45 focus:border-[#FF6B00]"
                  />
                  <button type="submit" className="rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white">
                    Apply location
                  </button>
                </form>
              </FilterGroup>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-black text-white"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white"
                >
                  Show results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 1 · Hero search ──────────────────── */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_70%_-10%,rgba(255,107,0,0.18),transparent_45%),linear-gradient(175deg,#001A35_0%,#002E5D_100%)] px-4 pb-10 pt-12 sm:pb-14 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#FF6B00]">
            UK Catering Marketplace
          </p>
          <h1 className="mt-3 text-4xl font-black leading-[0.94] tracking-[-0.03em] text-white sm:text-6xl">
            Find quality<br />
            <span className="text-[#FF6B00]">catering equipment</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base font-semibold text-[#A7B5C9]">
            Buy and sell commercial kitchen gear from UK sellers.
          </p>

          <form
            onSubmit={submitSearchForm}
            className="mt-8 rounded-[1.75rem] border border-white/12 bg-[#062747]/90 p-2.5 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex flex-1 items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3.5 transition-colors focus-within:bg-white/[0.11]">
                <Search className="h-5 w-5 shrink-0 text-[#FF6B00]" />
                <input
                  name="q"
                  defaultValue={query === "all" ? "" : query}
                  placeholder="What are you looking for?"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/40"
                />
              </label>
              <label className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3.5 transition-colors focus-within:bg-white/[0.11] sm:w-48">
                <MapPin className="h-5 w-5 shrink-0 text-white/50" />
                <input
                  name="city"
                  defaultValue={city}
                  placeholder="City or postcode"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/40"
                />
              </label>
              <button
                type="submit"
                aria-label="Search"
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-7 font-black text-white shadow-[0_12px_32px_rgba(255,107,0,0.34)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/30"
              >
                <Bell className="h-5 w-5" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </form>

          {notice && (
            <p className="mt-3 rounded-2xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-4 py-3 text-sm font-bold text-orange-100">
              {notice}
            </p>
          )}
        </div>
      </section>

      {/* ── SECTION 2 · 3 Marketplace type tabs ─────── */}
      <div className="border-b border-white/10 bg-[#001A35]/95">
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
          {MARKETPLACE_CATEGORIES.map((cat) => {
            const isActive =
              activeFilter === cat.slug ||
              (cat.slug === "catering-equipment" && isEquipmentTab(activeFilter))
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setActiveFilter(cat.slug)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-6 py-4 text-sm font-black transition focus-visible:outline-none ${
                  isActive
                    ? "border-[#FF6B00] text-[#FF6B00]"
                    : "border-transparent text-white/55 hover:text-white"
                }`}
              >
                {cat.title}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── SECTION 3 · Equipment category grid ──────── */}
      {isEquipmentTab(activeFilter) && (
        <section className="border-b border-white/10 bg-[#001A35] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-5 text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
              Browse by category
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {CATERING_CATEGORIES.map((cat) => {
                const isCatActive = activeFilter === cat.slug
                return (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className={`group flex flex-col items-center gap-2 rounded-3xl border p-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] sm:gap-4 sm:p-6 ${
                      isCatActive
                        ? "border-[#FF6B00] bg-[#FF6B00]/10"
                        : "border-white/10 bg-[#062747]/70 hover:border-[#FF6B00]/45 hover:bg-[#062747]"
                    }`}
                  >
                    <span
                      className={`block h-10 w-10 shrink-0 sm:h-14 sm:w-14 ${isCatActive ? "text-white" : "text-[#FF6B00]"}`}
                      style={maskStyle(cat.slug)}
                    />
                    <span className="text-[10px] font-black leading-tight text-white/85 group-hover:text-white sm:text-xs sm:leading-snug">
                      {cat.title}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 4 · Results layout ───────────────── */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">

        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5 rounded-3xl border border-white/12 bg-[#062747]/90 p-5 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Filters</h2>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-black text-[#FF6B00] hover:text-orange-300 transition"
              >
                Clear all
              </button>
            </div>

            <FilterGroup title="Condition">
              <div className="grid gap-1.5">
                {conditionFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setConditionFilter(filter.key)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm font-bold transition ${
                      conditionFilter === filter.key
                        ? "border-[#FF6B00]/60 bg-[#FF6B00]/12 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/18 hover:text-white"
                    }`}
                  >
                    {filter.label}
                    {conditionFilter === filter.key && (
                      <span className="h-2 w-2 rounded-full bg-[#FF6B00]" />
                    )}
                  </button>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup title="Location">
              <form onSubmit={submitSearchForm} className="grid gap-2">
                <input type="hidden" name="q" value={query} readOnly />
                <input
                  name="city"
                  defaultValue={city}
                  placeholder="City or postcode"
                  className="min-h-10 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/40 focus:border-[#FF6B00]"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-[#FF6B00] px-4 py-2 text-sm font-black text-white transition hover:brightness-110"
                >
                  Apply
                </button>
              </form>
            </FilterGroup>

            <FilterGroup title="Sort">
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="w-full rounded-2xl border border-white/10 bg-[#082D50] px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-[#FF6B00]"
              >
                <option className="bg-[#062747]" value="best">Best match</option>
                <option className="bg-[#062747]" value="newest">Newest first</option>
                <option className="bg-[#062747]" value="price_low">Price: low to high</option>
                <option className="bg-[#062747]" value="price_high">Price: high to low</option>
              </select>
            </FilterGroup>

            <FilterGroup title="More results">
              <div className="grid gap-2">
                <a
                  href={externalPlatformUrl("facebook")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white/70 transition hover:border-white/18 hover:text-white"
                >
                  <Users className="h-4 w-4 shrink-0 text-blue-400" />
                  Facebook Marketplace ↗
                </a>
                <a
                  href={externalPlatformUrl("gumtree")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white/70 transition hover:border-white/18 hover:text-white"
                >
                  <TreePine className="h-4 w-4 shrink-0 text-green-400" />
                  Gumtree ↗
                </a>
              </div>
            </FilterGroup>
          </div>
        </aside>

        {/* Results column */}
        <section className="min-w-0 space-y-4">

          {/* Mobile filter/sort bar */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[#082D50] py-3 text-sm font-black text-white"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {(conditionFilter !== "all" || Boolean(city.trim() || initialCity)) && (
                <span className="rounded-full bg-[#FF6B00] px-2 py-0.5 text-xs">!</span>
              )}
            </button>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="flex-1 rounded-2xl border border-white/15 bg-[#082D50] px-3 py-3 text-sm font-bold text-white outline-none"
            >
              <option className="bg-[#062747]" value="best">Best match</option>
              <option className="bg-[#062747]" value="newest">Newest</option>
              <option className="bg-[#062747]" value="price_low">Price ↑</option>
              <option className="bg-[#062747]" value="price_high">Price ↓</option>
            </select>
          </div>

          {/* Results meta */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">
                {totalVisibleResults} {totalVisibleResults === 1 ? "result" : "results"}
              </p>
              <p className="text-xs font-semibold text-[#A7B5C9]">{heading}</p>
            </div>
            <button
              type="button"
              onClick={saveThisSearch}
              disabled={savingSearch}
              className="shrink-0 rounded-2xl border border-white/15 bg-[#082D50]/90 px-4 py-2 text-xs font-black text-white transition hover:border-[#FF6B00]/50 disabled:opacity-60"
            >
              {savingSearch ? "Saving..." : "Save search"}
            </button>
          </div>

          {/* Listing cards */}
          <div id="caterbids-results" className="scroll-mt-28 space-y-3">
            {sortedCaterBidsResults.length === 0 ? (
              <EmptyResults
                title="No matching listings found"
                text={
                  conditionFilter !== "all"
                    ? noConditionResultsText(conditionFilter)
                    : "Try adjusting your filters or search for a different equipment type."
                }
                onClear={clearAllFilters}
              />
            ) : (
              sortedCaterBidsResults.map((item, index) => {
                const itemId = listingId(item.id)
                const itemImage =
                  Array.isArray(item.images) && item.images.length > 0
                    ? item.images.find((url) => typeof url === "string" && Boolean(url))
                    : item.image_url
                return (
                  <ListingCard
                    key={itemId || `caterbids-${index}`}
                    item={item}
                    isSaved={savedFavouriteIds.has(`caterbids:${itemId}`)}
                    onClick={() => router.push(`/listing?id=${encodeURIComponent(itemId)}`)}
                    onToggleFavourite={() =>
                      toggleFavourite({
                        id: `caterbids:${itemId}`,
                        source: "caterbids",
                        title: item.title,
                        price: item.price,
                        location: item.city || item.location || "UK",
                        category: item.category,
                        condition: item.condition || "",
                        imageUrl: itemImage || "",
                        url: `/listing?id=${itemId}`,
                        savedAt: new Date().toISOString(),
                      })
                    }
                  />
                )
              })
            )}
          </div>

          {/* Sell CTA */}
          <div className="rounded-3xl border border-[#FF6B00]/22 bg-[#FF6B00]/8 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-black">Sell your catering equipment</h3>
                <p className="mt-0.5 text-sm font-semibold text-white/60">
                  Free to list on CaterBids. Takes minutes.
                </p>
              </div>
              <Link
                href="/post-listing/start"
                className="shrink-0 rounded-2xl bg-[#FF6B00] px-5 py-3 text-center text-sm font-black text-white transition hover:brightness-110"
              >
                Start listing
              </Link>
            </div>
          </div>

        </section>
      </div>

      {/* ── SECTION 5 · Trust banner ─────────────────── */}
      <section className="border-t border-white/10 bg-[#062747]/50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 text-center text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
            Why CaterBids
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                icon: <Shield className="h-5 w-5" />,
                title: "Secure checkout",
                body: "Payments via Stripe — your card is never shared with sellers.",
              },
              {
                icon: <CheckCircle className="h-5 w-5" />,
                title: "Verified sellers",
                body: "Phone and ID checks before sellers go live.",
              },
              {
                icon: <Star className="h-5 w-5" />,
                title: "Free to list",
                body: "Post your first listing at no cost. Upgrade when ready.",
              },
              {
                icon: <Bell className="h-5 w-5" />,
                title: "UK market only",
                body: "Every listing is from a UK-based seller or business.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00]">
                  {item.icon}
                </div>
                <p className="text-sm font-black">{item.title}</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-white/50">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* ── SECTION 5 · Mobile bottom nav ────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#001A35]/95 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-3xl items-end justify-around px-3 pb-4 pt-3">
          <MobileNavLink href="/" icon={<Home className="h-5 w-5" />} label="Home" />
          <MobileNavLink
            href="/search?q=all&category=All%20Categories&location=All%20UK"
            icon={<Search className="h-5 w-5" />}
            label="Search"
            active
          />
          <Link
            href="/post-listing/start"
            aria-label="Post listing"
            className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30"
          >
            <Plus className="h-7 w-7" />
          </Link>
          <MobileNavLink href="/favourites" icon={<Heart className="h-5 w-5" />} label="Saved" />
          <MobileNavLink href="/account" icon={<UserCircle className="h-5 w-5" />} label="Account" />
        </div>
      </nav>
    </main>
  )
}

/* ── Sub-components ───────────────────────────────── */

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/55">{title}</h3>
      {children}
    </section>
  )
}

function EmptyResults({
  title,
  text,
  onClear,
}: {
  title: string
  text: string
  onClear?: () => void
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <AlertCircle className="mx-auto h-9 w-9 text-white/25" />
      <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-relaxed text-[#A7B5C9]">{text}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-2xl border border-[#FF6B00]/40 bg-[#FF6B00]/10 px-5 py-2.5 text-sm font-black text-orange-100 transition hover:bg-[#FF6B00]/18"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

function ListingCard({
  item,
  isSaved,
  onClick,
  onToggleFavourite,
}: {
  item: Listing
  isSaved: boolean
  onClick: () => void
  onToggleFavourite: () => void
}) {
  const title = item.title || "Untitled listing"
  const images =
    Array.isArray(item.images) && item.images.length > 0
      ? item.images.filter((url): url is string => typeof url === "string" && Boolean(url))
      : item.image_url
        ? [item.image_url]
        : []
  const image = images[0]

  return (
    <article className="group rounded-3xl border border-white/12 bg-[#062747]/80 p-3 shadow-md transition hover:border-[#FF6B00]/30 sm:p-4">
      <div className="flex gap-3 sm:gap-4">

        {/* Thumbnail */}
        <button
          type="button"
          onClick={onClick}
          aria-label={`View ${title}`}
          className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#001A35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] sm:h-28 sm:w-28"
        >
          {image ? (
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Tag className="h-7 w-7 text-white/25" />
            </div>
          )}
          {isFeaturedAndActive(item as Record<string, unknown>) && (
            <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full border border-[#FF6B00] bg-[#0a2a4a] px-1.5 py-0.5">
              <Bell className="h-2.5 w-2.5 fill-[#FF6B00] text-[#FF6B00]" />
              <span className="text-[8px] font-black uppercase text-white">Featured</span>
            </span>
          )}
        </button>

        {/* Title + meta */}
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 flex-col justify-between py-0.5 text-left focus-visible:outline-none"
        >
          <div>
            <h4 className="line-clamp-2 text-sm font-black leading-snug text-white sm:text-base">{title}</h4>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[#A7B5C9]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-white/35" />
                {item.city || item.location || "UK"}
              </span>
              {item.condition && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${conditionBadgeClass(item.condition)}`}
                >
                  {conditionLabel(item.condition)}
                </span>
              )}
            </div>
          </div>
          {item.created_at && (
            <span className="mt-2 text-[10px] font-semibold text-white/30">
              Listed {new Date(item.created_at).toLocaleDateString("en-GB")}
            </span>
          )}
        </button>

        {/* Price + actions */}
        <div className="flex shrink-0 flex-col items-end justify-between gap-2 py-0.5">
          <p className="text-lg font-black text-[#FF6B00] sm:text-xl">{displayPrice(item.price)}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleFavourite}
              aria-label={isSaved ? "Remove from saved" : "Save listing"}
              className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition ${
                isSaved
                  ? "border-[#FF6B00]/45 bg-[#FF6B00]/15 text-[#FF6B00]"
                  : "border-white/10 bg-white/[0.05] text-white/55 hover:text-white"
              }`}
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-[#FF6B00]" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClick}
              className="hidden rounded-2xl bg-[#FF6B00] px-4 py-2 text-xs font-black text-white transition hover:brightness-110 sm:block"
            >
              View
            </button>
          </div>
        </div>

      </div>
    </article>
  )
}

function MobileNavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-14 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-bold transition ${
        active ? "bg-[#FF6B00]/15 text-[#FF6B00]" : "text-white/70 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#001A35] text-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
