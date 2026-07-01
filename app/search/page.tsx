"use client"

import SiteFooter from "@/components/SiteFooter"
import SiteLogo from "@/components/SiteLogo"
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth'
import Image from "next/image"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import {
  ArrowLeft,
  Bookmark,
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
    if (id) {
      byId.set(id, item)
    }
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
    item.title,
    item.price,
    item.location,
    item.city,
    item.category,
    item.subcategory,
    item.condition,
    item.power_type,
    item.description,
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
    if (mode === "newest") {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    }
    if (mode === "price_low") return priceNumber(a.price) - priceNumber(b.price)
    if (mode === "price_high") return priceNumber(b.price) - priceNumber(a.price)
    return 0
  })
}

function SearchContent() {
  const params = useSearchParams()
  const router = useRouter()

  const query = params.get("q") || ""
  const categoryParam = params.get("category") || "All Categories"
  const locationParam = params.get("location") || "All UK"
  const initialCity = params.get("city") || (locationParam !== "All UK" ? locationParam : "")
  const initialCondition = (params.get("condition") || "all") as ConditionFilter

  const [listings, setListings] = useState<Listing[]>([])
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>(
    initialCategoryFilter(categoryParam)
  )
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

    if (nextCondition !== "all") {
      searchParams.set("condition", nextCondition)
    }
    if (cleanCity) {
      searchParams.set("city", cleanCity)
    }

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
      (savedItem) =>
        String(savedItem.id ?? "") === itemId &&
        String(savedItem.user_id ?? "") === userId
    )
    const next = isSaved
      ? existing.filter(
          (savedItem) =>
            !(
              String(savedItem.id ?? "") === itemId &&
              String(savedItem.user_id ?? "") === userId
            )
        )
      : [{ ...item, user_id: userId, savedAt: new Date().toISOString() }, ...existing]

    writeSavedFavourites(next)
    setSavedFavouriteIds(
      new Set(
        next
          .filter((savedItem) => String(savedItem.user_id ?? "") === userId)
          .map((savedItem) => savedItem.id)
      )
    )
    setNotice(isSaved ? "Removed from saved listings." : "Saved to your favourites.")

    const supabase = createClient()
    const externalId = itemId.replace(/^(caterbids|ebay):/, "")

    if (isSaved) {
      const { error } = await supabase
        .from("favourites")
        .delete()
        .eq("user_id", userId)
        .eq("source", item.source)
        .eq("external_id", externalId)

      if (error) console.warn("Favourite delete unavailable:", error.message || error)
      return
    }

    const { error } = await supabase.from("favourites").upsert(
      {
        user_id: userId,
        source: item.source,
        external_id: externalId,
        title: item.title,
        price: item.price || null,
        location: item.location || null,
        category: item.category || null,
        condition: item.condition || null,
        image_url: item.imageUrl || null,
        url: item.url || null,
      },
      { onConflict: "user_id,source,external_id" }
    )

    if (error) console.warn("Favourite save unavailable:", error.message || error)
  }

  function applyCityFilter(nextCity = city) {
    router.push(searchUrl({ nextCity }))
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

    document.getElementById("caterbids-results")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
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
      user_id: userId,
      query: savedSearch.query,
      location: savedSearch.location,
      category: savedSearch.category,
      condition: savedSearch.condition,
      search_url: currentPage,
      search_query: query || "",
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

      function localListings(soldIds: Set<string>) {
        const saved = readLocalListings()

        return saved.filter((item) => {
          const itemId = listingId(item.id)
          const cityText = `${item.city || ""} ${item.location || ""}`.toLowerCase()
          const matchesWords = listingMatchesSearch(item, query)
          const matchesCity = !initialCity || cityText.includes(initialCity.toLowerCase())
          const isLive = !item.status || item.status === "live" || item.status === "payment_pending"
          const isSold = item.status === "sold" || soldIds.has(itemId)
          return matchesWords && matchesCity && isLive && !isSold
        })
      }

      const soldIds = await soldListingIds()
      const supabase = createClient()
      let queryBuilder = supabase
        .from('listings')
        .select('*')
        .or('status.is.null,status.eq.live,status.eq.payment_pending')
        .order('created_at', { ascending: false })

      if (query && !isBroadMarketplaceQuery(query)) {
        const words = meaningfulSearchWords(query)
        const orConditions = words.map(word => 
          `title.ilike.%${word}%,price.ilike.%${word}%,location.ilike.%${word}%,description.ilike.%${word}%`
        ).join(',')
        if (orConditions) {
          queryBuilder = queryBuilder.or(orConditions)
        }
      }

      if (initialCity) {
        queryBuilder = queryBuilder.or(`city.ilike.%${initialCity}%,location.ilike.%${initialCity}%`)
      }

      const { data, error } = await queryBuilder
      if (error) {
        console.warn('Listings unavailable:', error.message || error)
        setListings(localListings(soldIds))
        return
      }

      const local = localListings(soldIds)
      const remote = (data || []) as Listing[]
      const remoteIds = new Set(remote.map((item) => listingId(item.id)))
      let filtered = [...local.filter((item) => !remoteIds.has(listingId(item.id))), ...remote]

      if (activeFilter !== "all") {
        const activeCategory = categoryBySlug(activeFilter)
        if (activeCategory) {
          filtered = filtered.filter((item: Listing) => {
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
      }

      setListings(filtered)
    }

    fetchListings()
  }, [query, activeFilter, initialCity])

  const filterChips: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: "All Results" },
    ...MARKETPLACE_CATEGORIES.map((category) => ({ key: category.slug, label: category.title })),
    ...CATERING_CATEGORIES.map((category) => ({ key: category.slug, label: category.title })),
  ]
  const platformSearchQuery = query || "commercial catering equipment"
  const filterByCondition = <T extends { condition?: string | null }>(items: T[]) => {
    if (conditionFilter === "all") return items

    return items.filter((item) => {
      const condition = normaliseCondition(item.condition)
      return condition === conditionFilter
    })
  }
  const filteredCaterBidsResults = filterByCondition(
    listings.map((listing) => ({
      ...listing,
      condition: normaliseCondition(listing.condition),
    }))
  )
  const sortedCaterBidsResults = applyFeaturedFirst(sortListings(filteredCaterBidsResults, sortMode) as Record<string, unknown>[]) as typeof filteredCaterBidsResults
  const totalVisibleResults = sortedCaterBidsResults.length
  const activeCategory = categoryBySlug(activeFilter)
  const heading =
    query && query !== "all"
      ? `Search results for "${query}"`
      : activeCategory
        ? `${activeCategory.title} results`
        : "Catering equipment results"
  const activeFilterCount = [
    activeFilter !== "all",
    conditionFilter !== "all",
    Boolean(city.trim() || initialCity),
  ].filter(Boolean).length
  const sourceFilters = [
    { key: "caterbids" as PlatformTab, label: "CaterBids", count: sortedCaterBidsResults.length },
    { key: "facebook" as PlatformTab, label: "Facebook", count: null },
    { key: "gumtree" as PlatformTab, label: "Gumtree", count: null },
  ]
  const quickFilterChips = [
    {
      label: "All Results",
      active: activeFilter === "all" && conditionFilter === "all",
      count: totalVisibleResults,
      onClick: () => {
        setActiveFilter("all")
        setConditionFilter("all")
      },
    },
    {
      label: "Catering Equipment",
      active: activeFilter === "catering-equipment",
      count: null,
      onClick: () => setActiveFilter("catering-equipment"),
    },
    {
      label: "Vans & Trailers",
      active: activeFilter === "catering-vans-trailers",
      count: null,
      onClick: () => setActiveFilter("catering-vans-trailers"),
    },
    {
      label: "Businesses",
      active: activeFilter === "catering-businesses",
      count: null,
      onClick: () => setActiveFilter("catering-businesses"),
    },
    {
      label: "New",
      active: conditionFilter === "new",
      count: null,
      onClick: () => setConditionFilter(conditionFilter === "new" ? "all" : "new"),
    },
    {
      label: "Used",
      active: conditionFilter === "used",
      count: null,
      onClick: () => setConditionFilter(conditionFilter === "used" ? "all" : "used"),
    },
  ]

  return (
    <main className="min-h-screen bg-[#001A35] bg-[radial-gradient(circle_at_top_left,rgba(255,107,0,0.14),transparent_28rem),linear-gradient(180deg,#001A35_0%,#002E5D_46%,#001A35_100%)] pb-28 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#001A35]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]">
            <SiteLogo size="sm" priority />
          </Link>

          <form
            onSubmit={submitSearchForm}
            className="hidden min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-2.5 shadow-inner shadow-black/20 lg:flex"
          >
            <Search className="h-5 w-5 shrink-0 text-white/55" />
            <input
              name="q"
              defaultValue={query === "all" ? "" : query}
              placeholder="Search catering equipment, spare parts..."
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/45"
            />
            <input type="hidden" name="city" value={city} readOnly />
          </form>

          <nav className="ml-auto hidden items-center gap-2 text-sm font-bold text-white/85 lg:flex">
            <Link href="/post-listing" className="rounded-xl px-3 py-2 hover:text-[#FF6B00]">Sell</Link>
            <Link href="/favourites" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 hover:text-[#FF6B00]">
              <Heart className="h-4 w-4" /> Saved
            </Link>
            <Link href="/account" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 hover:text-[#FF6B00]">
              <UserCircle className="h-4 w-4" /> Account
            </Link>
            <Link
              href="/post-listing"
              className="ml-2 rounded-2xl bg-[#FF6B00] px-5 py-3 font-black text-white shadow-lg shadow-[#FF6B00]/25 hover:bg-orange-500"
            >
              Sell for free
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="ml-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true">
          <div className="ml-auto flex h-full w-[82vw] max-w-sm flex-col border-l border-white/10 bg-[#062747] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SiteLogo size="sm" />
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8 grid gap-3 text-base font-bold">
              {[
                ["Home", "/"],
                ["Browse Equipment", "/search?q=all&category=All%20Categories&location=All%20UK"],
                ["Sell an Item", "/post-listing"],
                ["Saved Items", "/favourites"],
                ["Account", "/account"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white hover:border-[#FF6B00]/40 hover:text-[#FF6B00]"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#062747] p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FF6B00]">Filters</p>
                <h2 className="text-2xl font-black">Refine results</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <FilterGroup title="Category">
                <div className="grid gap-2">
                  {filterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setActiveFilter(chip.key)}
                      className={`rounded-2xl border px-3 py-2 text-left text-sm font-bold ${
                        activeFilter === chip.key
                          ? "border-[#FF6B00] bg-[#FF6B00] text-white"
                          : "border-white/10 bg-white/5 text-white/75"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </FilterGroup>

              <FilterGroup title="Condition">
                <div className="grid grid-cols-3 gap-2">
                  {conditionFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setConditionFilter(filter.key)}
                      className={`rounded-2xl border px-3 py-2 text-sm font-bold ${
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

              <FilterGroup title="Sources">
                <div className="grid grid-cols-2 gap-2">
                  {sourceFilters.map((source) => (
                    <button
                      key={source.key}
                      type="button"
                      onClick={() => handlePlatformTab(source.key)}
                      className={`rounded-2xl border px-3 py-2 text-left text-sm font-bold ${
                        activePlatformTab === source.key
                          ? "border-[#FF6B00] bg-[#FF6B00] text-white"
                          : "border-white/10 bg-white/5 text-white/75"
                      }`}
                    >
                      {source.label}
                      {source.count !== null && <span className="block text-xs opacity-70">{source.count} shown</span>}
                    </button>
                  ))}
                </div>
              </FilterGroup>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={clearAllFilters} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-black text-white">
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

      <section className="border-b border-white/10 bg-[#002E5D]/20">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-6">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FF6B00]">Marketplace search</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{heading}</h1>
              <p className="mt-3 max-w-2xl text-base font-semibold text-[#A7B5C9]">
                Find quality used and new catering equipment from UK sellers.
              </p>
            </div>

            <form onSubmit={submitSearchForm} className="grid gap-3 lg:grid-cols-[1.25fr_1fr_auto_auto]">
              <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/15 bg-[#082D50]/90 px-4 shadow-inner shadow-black/25">
                <Search className="h-5 w-5 shrink-0 text-[#FF6B00]" />
                <span className="sr-only">Search keyword</span>
                <input
                  name="q"
                  defaultValue={query === "all" ? "" : query}
                  placeholder="Catering equipment"
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/45"
                />
              </label>
              <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/15 bg-[#082D50]/90 px-4 shadow-inner shadow-black/25">
                <MapPin className="h-5 w-5 shrink-0 text-[#FF6B00]" />
                <span className="sr-only">Location</span>
                <input
                  name="city"
                  defaultValue={city}
                  placeholder="Postcode or city"
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/45"
                />
              </label>
              <button
                type="submit"
                className="min-h-14 rounded-2xl bg-[#FF6B00] px-8 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/25 hover:bg-orange-500"
              >
                Search
              </button>
              <button
                type="button"
                onClick={saveThisSearch}
                disabled={savingSearch}
                className="min-h-14 rounded-2xl border border-white/15 bg-[#082D50]/90 px-5 text-sm font-black text-white hover:border-[#FF6B00]/50 disabled:opacity-60"
              >
                {savingSearch ? "Saving..." : "Save search"}
              </button>
            </form>

            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {quickFilterChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={chip.onClick}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
                    chip.active
                      ? "bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/25"
                      : "border border-white/10 bg-[#082D50] text-white/75 hover:border-[#FF6B00]/40"
                  }`}
                >
                  {chip.label}
                  {chip.count !== null && chip.count > 0 && <span className="ml-1 opacity-75">({chip.count})</span>}
                </button>
              ))}
            </div>

            {notice && (
              <div className="rounded-2xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-4 py-3 text-sm font-bold text-orange-100">
                {notice}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4 rounded-3xl border border-white/12 bg-[#062747]/92 p-5 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Filters</h2>
              <button type="button" onClick={clearAllFilters} className="text-xs font-black text-[#FF6B00] hover:text-orange-300">
                Clear all
              </button>
            </div>

            <FilterGroup title="Category">
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {filterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setActiveFilter(chip.key)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm font-bold ${
                      activeFilter === chip.key
                        ? "border-[#FF6B00] bg-[#FF6B00]/15 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20"
                    }`}
                  >
                    {chip.label}
                    {activeFilter === chip.key && <span className="h-2 w-2 rounded-full bg-[#FF6B00]" />}
                  </button>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup title="Condition">
              <div className="grid gap-2">
                {conditionFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setConditionFilter(filter.key)}
                    className={`rounded-2xl border px-3 py-2 text-left text-sm font-bold ${
                      conditionFilter === filter.key
                        ? "border-[#FF6B00] bg-[#FF6B00]/15 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20"
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
                  className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/40 focus:border-[#FF6B00]"
                />
                <button type="submit" className="rounded-2xl bg-[#FF6B00] px-4 py-2.5 text-sm font-black text-white">
                  Apply
                </button>
              </form>
            </FilterGroup>

            <FilterGroup title="Sources">
              <div className="grid gap-2">
                {sourceFilters.map((source) => (
                  <button
                    key={source.key}
                    type="button"
                    onClick={() => handlePlatformTab(source.key)}
                    className={`rounded-2xl border px-3 py-2 text-left text-sm font-bold ${
                      activePlatformTab === source.key
                        ? "border-[#FF6B00] bg-[#FF6B00]/15 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20"
                    }`}
                  >
                    {source.label}
                    {source.count !== null && <span className="block text-xs text-white/45">{source.count} shown</span>}
                  </button>
                ))}
              </div>
            </FilterGroup>
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[#082D50] text-sm font-black text-white"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters {activeFilterCount > 0 && <span className="rounded-full bg-[#FF6B00] px-2 py-0.5 text-xs">{activeFilterCount}</span>}
            </button>
            <label className="flex min-h-12 flex-1 items-center gap-2 rounded-2xl border border-white/15 bg-[#082D50] px-3 text-sm font-black text-white">
              Sort
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none"
              >
                <option className="bg-[#062747]" value="best">Best match</option>
                <option className="bg-[#062747]" value="newest">Newest</option>
                <option className="bg-[#062747]" value="price_low">Price low</option>
                <option className="bg-[#062747]" value="price_high">Price high</option>
              </select>
            </label>
          </div>

          <div className="rounded-3xl border border-white/12 bg-[#062747]/90 p-4 shadow-2xl shadow-black/20">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">{totalVisibleResults} results found</p>
                <p className="mt-1 text-xs font-semibold text-[#A7B5C9]">
                  Browse CaterBids marketplace listings from UK sellers.
                </p>
              </div>
              <label className="hidden items-center gap-2 text-sm font-bold text-white/75 sm:flex">
                Sort by
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="rounded-2xl border border-white/15 bg-[#082D50] px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-[#FF6B00]"
                >
                  <option className="bg-[#062747]" value="best">Best match</option>
                  <option className="bg-[#062747]" value="newest">Newest listed</option>
                  <option className="bg-[#062747]" value="price_low">Price: low to high</option>
                  <option className="bg-[#062747]" value="price_high">Price: high to low</option>
                </select>
              </label>
            </div>

            <div id="caterbids-results" className="scroll-mt-28">
              <ResultGroupHeader title="CaterBids listings" count={sortedCaterBidsResults.length} />
              {sortedCaterBidsResults.length === 0 ? (
                <EmptyResults
                  title="No matching CaterBids listings found"
                  text={conditionFilter === "all" ? "Try adjusting your filters or search another equipment type." : noConditionResultsText(conditionFilter)}
                  onClear={clearAllFilters}
                />
              ) : (
                <div className="grid gap-3">
                  {sortedCaterBidsResults.map((item, index) => {
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
                  })}
                </div>
              )}
            </div>

            <section className="mt-5 rounded-3xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-black">Sell catering equipment</h3>
                  <p className="mt-1 text-sm font-semibold text-orange-100/80">Create a CaterBids listing in minutes.</p>
                </div>
                <Link href="/post-listing" className="rounded-2xl bg-[#FF6B00] px-5 py-3 text-center text-sm font-black text-white">
                  Start listing
                </Link>
              </div>
            </section>

          </div>

          <details className="rounded-3xl border border-white/12 bg-[#062747]/80 p-4">
            <summary className="cursor-pointer text-base font-black text-white">More marketplaces</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <PlatformButton
                icon={<Users className="h-5 w-5 text-blue-400" />}
                label="Facebook Marketplace ↗"
                color="from-blue-500/10 to-transparent"
                href={externalPlatformUrl("facebook")}
                ariaLabel="Opens Facebook Marketplace search in a new tab"
              />
              <PlatformButton
                icon={<TreePine className="h-5 w-5 text-green-400" />}
                label="Gumtree ↗"
                color="from-green-500/10 to-transparent"
                href={externalPlatformUrl("gumtree")}
                ariaLabel="Opens Gumtree search in a new tab"
              />
            </div>
          </details>

        </section>
      </div>

      <SiteFooter />

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#001A35]/95 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-3xl items-end justify-around px-3 pb-4 pt-3">
          <MobileNavLink href="/" icon={<Home className="h-5 w-5" />} label="Home" />
          <MobileNavLink href="/search?q=all&category=All%20Categories&location=All%20UK" icon={<Search className="h-5 w-5" />} label="Search" active />
          <Link href="/post-listing" aria-label="Post listing" className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30">
            <Plus className="h-7 w-7" />
          </Link>
          <MobileNavLink href="/favourites" icon={<Heart className="h-5 w-5" />} label="Saved" />
          <MobileNavLink href="/account" icon={<UserCircle className="h-5 w-5" />} label="Account" />
        </div>
      </nav>
    </main>
  )
}

/* ------------------ SUB-COMPONENTS ------------------ */

function FilterGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/70">{title}</h3>
      {children}
    </section>
  )
}

function ResultGroupHeader({
  title,
  count,
  loading,
}: {
  title: string
  count: number
  loading?: boolean
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-base font-black text-white">{title}</h3>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-white/60">
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {loading ? "Loading" : `${count} shown`}
      </span>
    </div>
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
    <div className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
      <AlertCircle className="mx-auto h-9 w-9 text-white/30" />
      <h3 className="mt-3 text-lg font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-[#A7B5C9]">{text}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-2xl border border-[#FF6B00]/40 bg-[#FF6B00]/10 px-4 py-2 text-sm font-black text-orange-100"
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
  const cardImages =
    Array.isArray(item.images) && item.images.length > 0
      ? item.images.filter((url): url is string => typeof url === "string" && Boolean(url))
      : item.image_url
        ? [item.image_url]
        : []
  const cardImage = cardImages[0]
  const badges = trustBadgesForListing(item)

  return (
    <article className="group relative rounded-3xl border border-white/12 bg-[#082D50]/86 p-3 shadow-lg shadow-black/15 transition hover:border-[#FF6B00]/35">
      <div className="grid grid-cols-[104px_1fr] gap-3 sm:grid-cols-[180px_1fr_auto] sm:gap-5">
        <button
          type="button"
          onClick={onClick}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001A35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
          aria-label={`View ${title}`}
        >
          <div className="aspect-square sm:aspect-[4/3]">
            {cardImage ? (
              <img
                src={cardImage}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs font-bold text-white/35">
                <Tag className="h-8 w-8" />
                No image
              </div>
            )}
          </div>
          <span className="absolute left-2 top-2 rounded-full bg-[#FF6B00] px-2 py-1 text-[10px] font-black uppercase text-white">
            CaterBids
          </span>
          {isFeaturedAndActive(item as Record<string, unknown>) && (
            <span className="absolute left-2 top-9 inline-flex items-center gap-1 rounded-full border-2 border-[#FF6B00] bg-[#0a2a4a] px-2 py-1 shadow-[0_0_10px_rgba(255,107,0,0.35)]">
              <Bell className="h-3 w-3 fill-[#FF6B00] text-[#FF6B00]" />
              <span className="text-[9px] font-black uppercase leading-none tracking-wide text-white">Featured</span>
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onClick}
          className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <h4 className="line-clamp-2 text-sm font-black leading-snug text-white sm:text-lg">
              {title}
            </h4>
            {item.description && (
              <p className="hidden line-clamp-1 text-sm font-semibold text-[#A7B5C9] sm:block">
                {item.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#A7B5C9] sm:text-xs">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-white/45" />
                {item.city || item.location || "UK"}
              </span>
              {item.category && <span className="hidden sm:inline">• {item.category}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {item.condition && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${conditionBadgeClass(item.condition)}`}>
                  {conditionLabel(item.condition)}
                </span>
              )}
              {badges.slice(0, 3).map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-2 py-0.5 text-[10px] font-black text-orange-100"
                >
                  {badge}
                </span>
              ))}
            </div>
            {item.created_at && (
              <span className="text-[11px] font-semibold text-white/40">
                Listed {new Date(item.created_at).toLocaleDateString("en-GB")}
              </span>
            )}
          </div>
        </button>

        <div className="col-span-2 flex items-center justify-between gap-3 border-t border-white/10 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start sm:border-t-0 sm:pt-0">
          <div className="text-left sm:text-right">
            <p className="text-xl font-black text-[#FF6B00]">{displayPrice(item.price)}</p>
            <p className="text-xs font-bold text-white/55">CaterBids listing</p>
          </div>
          <button
            type="button"
            onClick={onToggleFavourite}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] ${
              isSaved ? "text-[#FF6B00]" : "text-white/75"
            }`}
            aria-label={isSaved ? "Remove from saved listings" : "Save listing"}
          >
            <Heart className={`h-5 w-5 ${isSaved ? "fill-[#FF6B00]" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onClick}
            className="hidden rounded-2xl bg-[#FF6B00] px-5 py-2.5 text-sm font-black text-white sm:inline-flex"
          >
            View details
          </button>
        </div>
      </div>
    </article>
  )
}


function PlatformButton({
  icon,
  label,
  color,
  href,
  ariaLabel,
}: {
  icon: React.ReactNode
  label: string
  color: string
  href: string
  ariaLabel: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`premium-card premium-card-hover flex items-center gap-3 rounded-3xl bg-gradient-to-r ${color} p-4 text-left focus-visible:outline-none`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-white/50">Search now →</div>
      </div>
    </a>
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
      className={`flex min-w-14 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-bold ${
        active ? "bg-[#FF6B00]/15 text-[#FF6B00]" : "text-white/75"
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
        <div className="app-bg flex min-h-screen items-center justify-center text-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
