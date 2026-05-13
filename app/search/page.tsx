"use client"

import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth'
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import {
  ArrowLeft,
  Bookmark,
  Search,
  MapPin,
  Tag,
  ExternalLink,
  Loader2,
  SlidersHorizontal,
  AlertCircle,
  TreePine,
  Users,
  Heart,
  Home,
  Plus,
  UserCircle,
} from "lucide-react"

import type { Database } from '@/types/supabase'
import { buildMarketplaceSearchQuery, type SearchAnalysis } from '@/lib/search-intelligence'
import { trustBadgesForListing } from '@/lib/listing-trust'
import { CATERING_CATEGORIES, MARKETPLACE_CATEGORIES, categoryBySlug, categoryFromParam } from "@/lib/categories"

type Listing = Database['public']['Tables']['listings']['Row']
type EbayItem = {
  itemId: string
  title: string
  image?: { imageUrl?: string }
  price?: { value: string; currency: string }
  itemWebUrl?: string
  condition?: string
  city?: string
  location?: string
  itemLocation?: {
    city?: string
    country?: string
    postalCode?: string
  }
}
type ConditionFilter = "all" | "new" | "used"
type PlatformTab = "caterbids" | "ebay" | "facebook" | "gumtree"
type CategoryFilter = "all" | string
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
type SupplierResult = {
  id: string
  title: string
  snippet: string
  link: string
  source: string
  domain: string
  image?: string | null
  imageType?: "product" | "supplier-logo" | "fallback"
  badge?: "Used supplier" | "Supplier search shortcut"
  fallback?: boolean
}

const SUPPLIER_FALLBACK_IMAGES = {
  sink: "/supplier-placeholders/sink.jpg",
  fryer: "/supplier-placeholders/fryer.jpg",
  oven: "/supplier-placeholders/oven.jpg",
  fridge: "/supplier-placeholders/fridge.jpg",
  glasswasher: "/supplier-placeholders/glasswasher.jpg",
  kebab: "/supplier-placeholders/kebab-machine.jpg",
  prepTable: "/supplier-placeholders/prep-table.jpg",
  default: "/supplier-placeholders/catering-equipment.jpg",
}

const FAVOURITES_KEY = "caterbids_favourites"
const SAVED_SEARCHES_KEY = "caterbids_saved_searches"
const LOCAL_LISTINGS_KEY = "caterbids_listings"
const LOCAL_CURRENT_LISTING_KEY = "caterbids_current_listing"
const LOCAL_PUBLIC_LISTINGS_KEY = "caterbids_public_listings"
const GENERIC_MARKETPLACE_TERMS = new Set([
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

function noEbayResultsText(conditionFilter: ConditionFilter, activeFilter: CategoryFilter) {
  if (activeFilter !== "all") {
    return "No strong catering equipment results found. Try a related item name, brand or subcategory."
  }

  return noConditionResultsText(conditionFilter)
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

function supplierFallbackImage(title = "", snippet = "") {
  const value = `${title} ${snippet}`.toLowerCase()

  if (/(sink|bowl|wash basin|washbasin)/.test(value)) return SUPPLIER_FALLBACK_IMAGES.sink
  if (/(fryer|chip fryer)/.test(value)) return SUPPLIER_FALLBACK_IMAGES.fryer
  if (/(oven|combi|rational)/.test(value)) return SUPPLIER_FALLBACK_IMAGES.oven
  if (/(fridge|freezer|refrigeration|chiller|chilled)/.test(value)) return SUPPLIER_FALLBACK_IMAGES.fridge
  if (/(glasswasher|dishwasher|warewasher|warewashing)/.test(value)) return SUPPLIER_FALLBACK_IMAGES.glasswasher
  if (/(kebab|doner|gyro|gyros)/.test(value)) return SUPPLIER_FALLBACK_IMAGES.kebab
  if (/(stainless|table|prep|preparation)/.test(value)) return SUPPLIER_FALLBACK_IMAGES.prepTable

  return SUPPLIER_FALLBACK_IMAGES.default
}

function ebayPrice(item: EbayItem) {
  const currency = item.price?.currency === "GBP" ? "£" : item.price?.currency || "£"
  return item.price?.value ? `${currency}${item.price.value}` : ""
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
  const [ebayResults, setEbayResults] = useState<EbayItem[]>([])
  const [supplierResults, setSupplierResults] = useState<SupplierResult[]>([])
  const [loadingEbay, setLoadingEbay] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [ebayError, setEbayError] = useState<string | null>(null)
  const [supplierError, setSupplierError] = useState<string | null>(null)
  const [supplierWarning, setSupplierWarning] = useState<string | null>(null)
  const [searchAnalysis, setSearchAnalysis] = useState<SearchAnalysis | null>(null)
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

  useEffect(() => {
    if (!userId) {
      setSavedFavouriteIds(new Set())
      return
    }

    setSavedFavouriteIds(
      new Set(
        readSavedFavourites()
          .filter((item) => String(item.user_id ?? "") === userId)
          .map((item) => item.id)
      )
    )
  }, [userId])

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const user = await getCurrentUser(supabase)

      setUserId(user?.id || null)
    }

    loadUser()
  }, [])

  useEffect(() => {
    setCity(initialCity)
  }, [initialCity])

  useEffect(() => {
    setConditionFilter(["all", "new", "used"].includes(initialCondition) ? initialCondition : "all")
  }, [initialCondition])

  function loginRedirect(message: string) {
    const currentPage = `/search${params.toString() ? `?${params.toString()}` : ""}`
    router.push(`/login?next=${encodeURIComponent(currentPage)}&message=${encodeURIComponent(message)}`)
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
    const searchParams = new URLSearchParams()
    searchParams.set("q", query || "all")
    const activeCategory = categoryBySlug(activeFilter)
    searchParams.set("category", activeCategory?.title || "All Categories")
    searchParams.set("location", locationParam)
    if (conditionFilter !== "all") {
      searchParams.set("condition", conditionFilter)
    }
    if (nextCity.trim()) {
      searchParams.set("city", nextCity.trim())
    }
    router.push(`/search?${searchParams.toString()}`)
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

    document.getElementById(tab === "caterbids" ? "caterbids-results" : "ebay-results")?.scrollIntoView({
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

  useEffect(() => {
    async function fetchEbayResults() {
      setLoadingEbay(true)
      setEbayError(null)
      try {
        const ebayParams = new URLSearchParams({
          q: query || "commercial catering equipment",
          category: activeFilter,
        })
        if (conditionFilter !== "all") {
          ebayParams.set("condition", conditionFilter)
        }
        if (initialCity) {
          ebayParams.set("city", initialCity)
        }
        const res = await fetch(`/api/ebay-search?${ebayParams.toString()}`)
        const data = await res.json()
        setSearchAnalysis(data.analysis || null)
        if (!res.ok) {
          setEbayError(data.error || 'API Error')
          setEbayResults([])
          setLoadingEbay(false)
          return
        }
        if (data.items && Array.isArray(data.items)) {
          setEbayResults(data.items.slice(0, 50).map((item: EbayItem) => ({
            ...item,
            condition: normaliseCondition(item.condition),
          })))
        } else if (data.itemSummaries && Array.isArray(data.itemSummaries)) {
          setEbayResults(data.itemSummaries.slice(0, 50).map((item: EbayItem) => ({
            ...item,
            condition: normaliseCondition(item.condition),
          })))
        } else {
          setEbayResults([])
        }
      } catch (error) {
        console.warn("EBAY ERROR:", error)
        setEbayError('Network Error')
        setEbayResults([])
      }
      setLoadingEbay(false)
    }
    fetchEbayResults()
  }, [query, conditionFilter, activeFilter, initialCity])

  useEffect(() => {
    async function fetchSupplierResults() {
      setLoadingSuppliers(true)
      setSupplierError(null)
      setSupplierWarning(null)

      try {
        const supplierParams = new URLSearchParams({
          q: query || "commercial catering equipment",
        })
        const response = await fetch(`/api/supplier-search?${supplierParams.toString()}`)
        const data = await response.json()

        if (!response.ok) {
          setSupplierError(data.error || "Supplier search unavailable")
          setSupplierResults([])
          return
        }

        setSupplierResults(Array.isArray(data.items) ? data.items : [])
        setSupplierWarning(data.warning || null)
      } catch (error) {
        console.warn("SUPPLIER SEARCH ERROR:", error)
        setSupplierError("Supplier search unavailable")
        setSupplierResults([])
        setSupplierWarning(null)
      } finally {
        setLoadingSuppliers(false)
      }
    }

    fetchSupplierResults()
  }, [query])

  const filterChips: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: "All Results" },
    ...MARKETPLACE_CATEGORIES.map((category) => ({ key: category.slug, label: category.title })),
    ...CATERING_CATEGORIES.map((category) => ({ key: category.slug, label: category.title })),
  ]
  const platformSearchQuery = searchAnalysis
    ? buildMarketplaceSearchQuery(searchAnalysis)
    : query || "commercial catering equipment"
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
  const filteredEbayResults = filterByCondition(ebayResults)

  return (
    <main className="app-bg min-h-screen pb-28 text-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 py-5">
          <button
            onClick={() => router.back()}
            className="soft-button rounded-2xl p-2.5"
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

        <div className="premium-card mb-5 rounded-3xl border-[#FF6B00]/25 p-4">
          <p className="text-sm font-semibold leading-relaxed text-white/85">
            <span className="text-[#FF6B00]">Free public beta:</span>{" "}
            CaterBidsUK is in free public beta — list commercial catering equipment for free.
          </p>
        </div>

        {/* Search Summary */}
        <div className="premium-card mb-5 rounded-3xl p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Search className="h-4 w-4" />
                Showing results for
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{query || "All listings"}</h2>
                {categoryParam !== "All Categories" && (
                  <span className="premium-badge inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    <Tag className="h-3 w-3" /> {categoryParam}
                  </span>
                )}
                {locationParam !== "All UK" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-0.5 text-xs font-medium text-white/70">
                    <MapPin className="h-3 w-3" /> {locationParam}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={saveThisSearch}
              disabled={savingSearch}
              className="soft-button inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold disabled:opacity-60"
            >
              {savingSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
              Save this search
            </button>
          </div>

          <form
            className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            onSubmit={(event) => {
              event.preventDefault()
              applyCityFilter()
            }}
          >
            <MapPin className="h-4 w-4 shrink-0 text-white/50" />
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Postcode or city: Birmingham, B12, M1"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
            />
            <button
              type="submit"
              className="premium-button shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
            >
              Apply
            </button>
          </form>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">
                Search other platforms
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                Facebook Marketplace and Gumtree open in a new tab so you can compare prices.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handlePlatformTab("ebay")}
                className="soft-button min-h-11 rounded-2xl px-4 py-2 text-sm font-bold"
              >
                View live eBay results
                <span className="mt-0.5 block text-[11px] font-semibold text-white/50">
                  Live results shown inside CaterBids.
                </span>
              </button>
              <a
                href={externalPlatformUrl("facebook")}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Opens Facebook Marketplace search in a new tab"
                className="soft-button flex min-h-11 items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold"
              >
                Search Facebook ↗
              </a>
              <a
                href={externalPlatformUrl("gumtree")}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Opens Gumtree search in a new tab"
                className="soft-button flex min-h-11 items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold"
              >
                Search Gumtree ↗
              </a>
            </div>
          </div>
        </div>

        {notice && (
          <div className="premium-card mb-5 rounded-2xl border-[#FF6B00]/25 px-4 py-3 text-sm font-semibold text-orange-100">
            {notice}
          </div>
        )}

        {searchAnalysis && (
          <CaterBotCard analysis={searchAnalysis} />
        )}

        {/* Filter Chips */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-white/40" />
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setActiveFilter(chip.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
                activeFilter === chip.key
                  ? "premium-button text-white"
                  : "soft-button text-white/70"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Condition Filter */}
        <div className="-mt-3 mb-6 flex items-center gap-2 overflow-x-auto pb-1">
          {conditionFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setConditionFilter(filter.key)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
                conditionFilter === filter.key
                  ? "border-[#FF6B00] bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/25"
                  : "border-white/10 bg-[#102641]/80 text-white/70 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <PlatformTabs activeTab={activePlatformTab} onTabClick={handlePlatformTab} />

        {/* CaterBids Results */}
        <div id="caterbids-results" className="scroll-mt-24">
          <SectionHeader title="CaterBids Results" count={filteredCaterBidsResults.length} />
        </div>

        {filteredCaterBidsResults.length === 0 && (
          <div className="premium-card mb-8 flex flex-col items-center rounded-3xl p-8 text-center">
            <AlertCircle className="h-10 w-10 text-white/30" />
            <h3 className="mt-4 text-xl font-black">No CaterBids listings found in this area yet</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/65">
              {conditionFilter === "all"
                ? "Be the first to list your catering equipment on CaterBidsUK for free during beta."
                : noConditionResultsText(conditionFilter)}
            </p>
            <div className="mt-5 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button
                onClick={() => router.push("/post-listing")}
                className="premium-button min-h-11 rounded-2xl px-5 py-3 text-sm font-bold text-white"
              >
                List for Free
              </button>
              <button
                onClick={saveThisSearch}
                className="soft-button min-h-11 rounded-2xl px-5 py-3 text-sm font-bold"
              >
                Save This Search
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredCaterBidsResults.map((item, index) => {
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

        <section className="premium-card mt-8 rounded-3xl border-[#FF6B00]/25 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black">Got catering equipment to sell?</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/65">
                List it free on CaterBidsUK before paying marketplace fees elsewhere.
              </p>
            </div>
            <Link
              href="/post-listing"
              className="premium-button inline-flex min-h-12 items-center justify-center rounded-2xl px-5 py-3 text-sm font-black"
            >
              Create Free Listing
            </Link>
          </div>
        </section>

        {/* Live eBay Results */}
        <div id="ebay-results" className="mt-10 scroll-mt-24">
          <SectionHeader title="Live eBay Results" count={filteredEbayResults.length} loading={loadingEbay} />
          {ebayError && (
            <div className="premium-card mb-6 rounded-3xl border-orange-400/40 p-4">
              <AlertCircle className="h-5 w-5 text-orange-400 inline" />
              <span className="ml-2 text-sm font-medium text-orange-200">eBay Error: {ebayError}</span>
            </div>
          )}
        </div>

        {loadingEbay && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loadingEbay && !ebayError && filteredEbayResults.length === 0 && (
          <div className="premium-card mb-4 flex flex-col items-center rounded-3xl p-8 text-center">
            <AlertCircle className="h-10 w-10 text-white/30" />
            <p className="mt-3 text-sm text-white/60">{noEbayResultsText(conditionFilter, activeFilter)}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredEbayResults.map((item, index) => (
            <div key={item.itemId} className="contents">
              {index === 4 && (
                <ComparePricesCard
                  facebookUrl={externalPlatformUrl("facebook")}
                  gumtreeUrl={externalPlatformUrl("gumtree")}
                />
              )}
              <EbayCard
                item={item}
                isSaved={savedFavouriteIds.has(`ebay:${item.itemId}`)}
                onToggleFavourite={() =>
                  toggleFavourite({
                    id: `ebay:${item.itemId}`,
                    source: "ebay",
                    title: item.title,
                    price: ebayPrice(item),
                    location: item.city || item.location || item.itemLocation?.city || item.itemLocation?.postalCode || item.itemLocation?.country || "UK",
                    category: "eBay",
                    condition: item.condition || "",
                    imageUrl: item.image?.imageUrl || "",
                    url: item.itemWebUrl || "",
                    savedAt: new Date().toISOString(),
                  })
                }
              />
            </div>
          ))}
        </div>

        <section id="supplier-results" className="mt-10 scroll-mt-24">
          <SectionHeader title="Trusted Used Supplier Results" count={supplierResults.length} loading={loadingSuppliers} />
          <p className="-mt-1 mb-4 text-sm text-white/60">
            Second-hand, refurbished and reconditioned catering equipment from trusted UK suppliers.
          </p>

          {supplierError && (
            <div className="premium-card mb-6 rounded-3xl border-orange-400/40 p-4">
              <AlertCircle className="inline h-5 w-5 text-orange-400" />
              <span className="ml-2 text-sm font-medium text-orange-200">{supplierError}</span>
            </div>
          )}

          {!supplierError && supplierWarning && (
            <div className="premium-card mb-6 rounded-3xl border-[#FF6B00]/30 p-4">
              <AlertCircle className="inline h-5 w-5 text-[#FF6B00]" />
              <span className="ml-2 text-sm font-medium text-orange-100">{supplierWarning}</span>
            </div>
          )}

          {loadingSuppliers && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {!loadingSuppliers && !supplierError && supplierResults.length === 0 && (
            <div className="premium-card mb-4 flex flex-col items-center rounded-3xl p-8 text-center">
              <AlertCircle className="h-10 w-10 text-white/30" />
              <p className="mt-3 text-sm text-white/60">
                No trusted used supplier pages found for this search yet.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {supplierResults.map((item) => (
              <SupplierResultCard key={item.id || item.link || item.title} item={item} />
            ))}
          </div>
        </section>

        {/* Other Platforms */}
        <h3 className="mb-1 mt-10 text-base font-bold">Search other platforms</h3>
        <p className="mb-3 text-sm text-white/60">
          Facebook Marketplace and Gumtree open in a new tab so you can compare prices.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PlatformButton
            icon={<Users className="h-5 w-5 text-blue-400" />}
            label="Search Facebook ↗"
            color="from-blue-500/10 to-transparent"
            href={externalPlatformUrl("facebook")}
            ariaLabel="Opens Facebook Marketplace search in a new tab"
          />
          <PlatformButton
            icon={<TreePine className="h-5 w-5 text-green-400" />}
            label="Search Gumtree ↗"
            color="from-green-500/10 to-transparent"
            href={externalPlatformUrl("gumtree")}
            ariaLabel="Opens Gumtree search in a new tab"
          />
        </div>

        <SearchFooter />
      </div>

      <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50 sm:hidden">
        <div className="mx-auto flex max-w-3xl items-end justify-around px-3 pb-4 pt-3">
          <MobileNavLink href="/" icon={<Home className="h-5 w-5" />} label="Home" />
          <MobileNavLink
            href="/search?q=all&category=All%20Categories&location=All%20UK"
            icon={<Search className="h-5 w-5" />}
            label="Search"
            active
          />
          <Link
            href="/post-listing"
            aria-label="Post listing"
            className="premium-button -mt-8 flex h-14 w-14 items-center justify-center rounded-full text-white"
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

function CaterBotCard({ analysis }: { analysis: SearchAnalysis }) {
  const chips = [
    analysis.fuelType ? analysis.fuelType[0].toUpperCase() + analysis.fuelType.slice(1) : null,
    analysis.equipmentType ? analysis.equipmentType[0].toUpperCase() + analysis.equipmentType.slice(1) : null,
    analysis.allowParts ? "Parts & spares enabled" : "Full units first",
    analysis.allowParts ? null : "Parts hidden",
  ].filter(Boolean)

  return (
    <div className="premium-card mb-6 rounded-3xl border-[#FF6B00]/25 p-4">
      <div className="flex items-start gap-3">
        <div className="orange-glow flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B00] text-sm font-black text-white">
          CB
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">CaterBot search</p>
          <p className="mt-1 text-sm text-white/70">
            {analysis.allowParts
              ? "Parts & spares search enabled."
              : "CaterBot filtered spare parts and ranked full catering equipment first."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-bold text-white/80"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlatformTabs({
  activeTab,
  onTabClick,
}: {
  activeTab: PlatformTab
  onTabClick: (tab: PlatformTab) => void
}) {
  const tabs: { key: PlatformTab; label: string }[] = [
    { key: "caterbids", label: "CaterBids" },
    { key: "ebay", label: "View live eBay results" },
    { key: "facebook", label: "Search Facebook ↗" },
    { key: "gumtree", label: "Search Gumtree ↗" },
  ]

  return (
    <div className="premium-card mb-6 rounded-3xl p-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabClick(tab.key)}
            aria-label={
              tab.key === "facebook"
                ? "Opens Facebook Marketplace search in a new tab"
                : tab.key === "gumtree"
                  ? "Opens Gumtree search in a new tab"
                  : undefined
            }
            className={`min-h-11 rounded-2xl px-3 py-2 text-sm font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
              activeTab === tab.key
                ? "bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/25"
                : "border border-white/10 bg-[#102641]/80 text-white/75 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            {tab.label}
            {tab.key === "ebay" && (
              <span className="mt-0.5 block text-[11px] font-semibold text-white/60">
                Live results shown inside CaterBids.
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function ComparePricesCard({
  facebookUrl,
  gumtreeUrl,
}: {
  facebookUrl: string
  gumtreeUrl: string
}) {
  return (
    <article className="premium-card rounded-3xl border-[#FF6B00]/25 p-5 sm:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF6B00]">Cross-platform check</p>
          <h3 className="mt-2 text-xl font-black">Compare prices across the web</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/65">
            Check this search on Facebook Marketplace and Gumtree before you buy.
          </p>
        </div>
        <div className="grid gap-2 sm:min-w-56">
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Opens Facebook Marketplace search in a new tab"
            className="soft-button flex min-h-11 items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold"
          >
            Search Facebook ↗
          </a>
          <a
            href={gumtreeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Opens Gumtree search in a new tab"
            className="soft-button flex min-h-11 items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold"
          >
            Search Gumtree ↗
          </a>
        </div>
      </div>
    </article>
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
  const cardImages =
    Array.isArray(item.images) && item.images.length > 0
      ? item.images.filter((url): url is string => typeof url === "string" && Boolean(url))
      : item.image_url
        ? [item.image_url]
        : []
  const cardImage = cardImages[0]

  return (
    <article className="premium-card premium-card-hover group overflow-hidden rounded-3xl text-left">
      <button onClick={onClick} className="block w-full text-left focus-visible:outline-none">
        <div className="relative border-b border-white/10 bg-[#061B35]">
          <div className="relative aspect-[4/3] p-3">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#001B35] shadow-inner shadow-black/30">
              {cardImage ? (
                <img
                  src={cardImage}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs font-bold text-white/35">
                  <Tag className="h-10 w-10" />
                  No image
                </div>
              )}
            </div>
          </div>

          <div className="absolute left-4 top-4 flex h-8 w-24 items-center justify-center rounded-xl border border-white/80 bg-white px-2 shadow-lg shadow-black/25">
            <img
              src="/caterbids-card-logo.png"
              alt="CaterBids"
              loading="lazy"
              className="h-full w-full object-contain"
            />
          </div>

          {cardImages.length > 1 && (
            <div className="absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
              1 / {cardImages.length}
            </div>
          )}
        </div>

        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <h4 className="line-clamp-2 text-sm font-bold leading-snug">{item.title}</h4>
            <span className="premium-badge shrink-0 rounded-xl px-2 py-1 text-xs font-bold">
              {item.price}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/50">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {item.city || item.location || "UK"}
            </span>
            <span>•</span>
            <span>{item.category}</span>
          </div>

          {item.condition && (
            <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${conditionBadgeClass(item.condition)}`}>
              {conditionLabel(item.condition)}
            </span>
          )}

          {trustBadgesForListing(item).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {trustBadgesForListing(item).slice(0, 3).map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-2 py-0.5 text-[10px] font-bold text-orange-100"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/50">
            {item.description || ''}
          </p>

          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[#FF6B00]">
            {item.created_at && (
              <span className="text-white/60 text-[10px]">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            )}
            <span className="transition-colors group-hover:text-orange-400">
              View Listing →
            </span>
          </div>
        </div>
      </button>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onToggleFavourite}
          className={`soft-button flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold ${
            isSaved ? "text-[#FF6B00]" : "text-white/75"
          }`}
        >
          <Heart className={`h-4 w-4 ${isSaved ? "fill-[#FF6B00]" : ""}`} />
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  )
}

function EbayCard({
  item,
  isSaved,
  onToggleFavourite,
}: {
  item: EbayItem
  isSaved: boolean
  onToggleFavourite: () => void
}) {
  return (
    <article className="premium-card premium-card-hover group overflow-hidden rounded-3xl text-left">
      <a
        href={item.itemWebUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block focus-visible:outline-none"
      >
        {item.image?.imageUrl && (
          <div className="relative aspect-[4/3] overflow-hidden bg-white">
            <img
              src={item.image.imageUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}

        <div className="p-4 pb-3">
          <h4 className="line-clamp-2 text-sm font-bold leading-snug">{item.title}</h4>

          <div className="mt-2 flex items-center gap-2">
            <span className="premium-badge rounded-xl px-2 py-1 text-xs font-bold">
              {ebayPrice(item)}
            </span>
            {item.condition && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${conditionBadgeClass(item.condition)}`}>
                {conditionLabel(item.condition)}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1 text-xs text-white/50">
            <MapPin className="h-3 w-3" />
            {item.city || item.location || item.itemLocation?.city || item.itemLocation?.postalCode || item.itemLocation?.country || "UK"}
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[#FF6B00] transition-colors group-hover:text-orange-400">
            View on eBay <ExternalLink className="h-3 w-3" />
          </div>
        </div>
      </a>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onToggleFavourite}
          className={`soft-button flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold ${
            isSaved ? "text-[#FF6B00]" : "text-white/75"
          }`}
        >
          <Heart className={`h-4 w-4 ${isSaved ? "fill-[#FF6B00]" : ""}`} />
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  )
}

function SupplierResultCard({ item }: { item: SupplierResult }) {
  const fallbackImage = supplierFallbackImage(item.title, item.snippet)
  const image = item.image || fallbackImage
  const [resolvedImageType, setResolvedImageType] = useState(item.imageType || "fallback")
  const isSupplierLogo = resolvedImageType === "supplier-logo"

  return (
    <article className="premium-card premium-card-hover overflow-hidden rounded-3xl">
      {image ? (
        <div
          className={`relative aspect-[4/3] overflow-hidden ${
            isSupplierLogo ? "bg-[#071b32]" : "bg-white"
          }`}
        >
          {isSupplierLogo && (
            <span className="absolute left-3 top-3 z-10 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/75">
              Supplier
            </span>
          )}
          <img
            src={image}
            alt={item.title}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null
              event.currentTarget.src = fallbackImage
              setResolvedImageType("fallback")
            }}
            className={`h-full w-full transition-transform duration-500 hover:scale-105 ${
              isSupplierLogo ? "object-contain p-8" : "object-cover"
            }`}
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-white/5">
          <Tag className="h-10 w-10 text-white/25" />
        </div>
      )}

      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="premium-badge rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
            {item.badge || "Used supplier"}
          </span>
          {item.domain && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/55">
              {item.domain}
            </span>
          )}
        </div>

        <h4 className="line-clamp-2 text-sm font-black leading-snug text-white">
          {item.title}
        </h4>
        {item.snippet && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/55">
            {item.snippet}
          </p>
        )}

        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="premium-button mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-black"
        >
          View supplier page <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="premium-card overflow-hidden rounded-3xl">
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

function SearchFooter() {
  const links = [
    ["About", "/about"],
    ["How It Works", "/how-it-works"],
    ["Safety", "/safety"],
    ["Contact", "/contact"],
    ["Terms", "/legal/terms"],
    ["Privacy", "/legal/privacy"],
    ["Cookies", "/legal/cookies"],
    ["Prohibited Items", "/legal/prohibited-items"],
    ["Report Listing", "/report-listing"],
  ]

  return (
    <footer className="mt-10 border-t border-white/10 py-8">
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm text-white/55">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="hover:text-[#FF6B00]">
            {label}
          </Link>
        ))}
      </div>
      <p className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6B00]">
        CaterBidsUK • Buy • Sell • Save
      </p>
    </footer>
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
