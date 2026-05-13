"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ExternalLink, Loader2, Plus, Tag } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { CATERING_CATEGORIES, categoryBySlug, type CaterBidsCategory } from "@/lib/categories"
import type { Database } from "@/types/supabase"

type Listing = Database["public"]["Tables"]["listings"]["Row"]
type CategoryPageProps = {
  params: Promise<{ slug: string }>
}
type EbayItem = {
  itemId: string
  title: string
  image?: { imageUrl?: string }
  price?: { value: string; currency: string }
  itemWebUrl?: string
  condition?: string
  itemLocation?: { city?: string; country?: string }
}
type SupplierResult = {
  id: string
  title: string
  snippet: string
  link: string
  domain: string
  image?: string | null
  imageType?: "product" | "supplier-logo" | "fallback"
  badge?: string
}

const LOCAL_LISTINGS_KEY = "caterbids_listings"
const LOCAL_CURRENT_LISTING_KEY = "caterbids_current_listing"
const LOCAL_PUBLIC_LISTINGS_KEY = "caterbids_public_listings"

function safeId(value: unknown) {
  return String(value ?? "")
}

function formatPrice(price: unknown) {
  const value = String(price ?? "").trim()
  if (!value) return "£0"
  return value.startsWith("£") ? value : `£${value}`
}

function listingImages(item: Partial<Listing>) {
  const images = Array.isArray(item.images)
    ? item.images.filter((url): url is string => typeof url === "string" && Boolean(url))
    : []
  return images.length > 0 ? images : item.image_url ? [item.image_url] : []
}

function readLocalListings() {
  if (typeof window === "undefined") return [] as Listing[]

  function readList(key: string) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]") as Listing[]
      return Array.isArray(saved) ? saved : []
    } catch {
      localStorage.removeItem(key)
      return []
    }
  }

  function readSingle(key: string) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null") as Listing | null
      return saved && typeof saved === "object" ? [saved] : []
    } catch {
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
    const id = safeId(item?.id)
    if (id) byId.set(id, item)
  }

  return Array.from(byId.values())
}

function categoryMatchesListing(item: Listing, category: CaterBidsCategory) {
  const haystack = `${item.category || ""} ${item.subcategory || ""} ${item.title || ""}`.toLowerCase()
  if (category.slug === "catering-equipment") {
    return (
      haystack.includes("equipment") ||
      CATERING_CATEGORIES.some((itemCategory) =>
        haystack.includes(itemCategory.title.toLowerCase()) ||
        itemCategory.subcategories.some((subcategory) => haystack.includes(subcategory.toLowerCase()))
      )
    )
  }

  return (
    haystack.includes(category.title.toLowerCase()) ||
    category.subcategories.some((subcategory) => haystack.includes(subcategory.toLowerCase()))
  )
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = use(params)
  const category = categoryBySlug(slug)
  const [listings, setListings] = useState<Listing[]>([])
  const [ebayResults, setEbayResults] = useState<EbayItem[]>([])
  const [supplierResults, setSupplierResults] = useState<SupplierResult[]>([])
  const [loadingListings, setLoadingListings] = useState(true)
  const [loadingEbay, setLoadingEbay] = useState(true)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)

  const categoryQuery = useMemo(() => {
    return category?.searchQuery || "commercial catering equipment"
  }, [category])
  const browseLinks = useMemo(() => {
    if (!category) return []

    if (category.slug === "catering-equipment") {
      return CATERING_CATEGORIES.map((item) => ({
        label: item.title,
        description: item.description,
        href: `/category/${item.slug}`,
      }))
    }

    return category.subcategories.map((subcategory) => ({
      label: subcategory,
      description: "",
      href: `/search?q=${encodeURIComponent(subcategory)}&category=${encodeURIComponent(category.title)}`,
    }))
  }, [category])

  useEffect(() => {
    if (!category) return
    const selectedCategory = category

    async function loadListings() {
      setLoadingListings(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .or("status.is.null,status.eq.live,status.eq.payment_pending")
        .order("created_at", { ascending: false })

      if (error) {
        console.warn("Category listings unavailable:", error.message || error)
      }

      const remote = (data || []) as Listing[]
      const remoteIds = new Set(remote.map((item) => safeId(item.id)))
      const local = readLocalListings().filter((item) => {
        const isLive = !item.status || item.status === "live" || item.status === "payment_pending"
        return isLive && !remoteIds.has(safeId(item.id))
      })

      setListings(
        [...local, ...remote].filter((item) =>
          categoryMatchesListing(item, selectedCategory)
        )
      )
      setLoadingListings(false)
    }

    loadListings()
  }, [category])

  useEffect(() => {
    if (!category) return
    const selectedCategory = category

    async function loadEbay() {
      setLoadingEbay(true)
      try {
        const params = new URLSearchParams({
          q: categoryQuery,
          category: selectedCategory.title,
        })
        const response = await fetch(`/api/ebay-search?${params.toString()}`)
        const data = await response.json()
        const items = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.itemSummaries)
            ? data.itemSummaries
            : []
        setEbayResults(items.slice(0, 6))
      } catch (error) {
        console.warn("Category eBay results unavailable:", error)
        setEbayResults([])
      } finally {
        setLoadingEbay(false)
      }
    }

    async function loadSuppliers() {
      setLoadingSuppliers(true)
      try {
        const params = new URLSearchParams({ q: categoryQuery })
        const response = await fetch(`/api/supplier-search?${params.toString()}`)
        const data = await response.json()
        setSupplierResults(Array.isArray(data.items) ? data.items.slice(0, 6) : [])
      } catch (error) {
        console.warn("Category supplier results unavailable:", error)
        setSupplierResults([])
      } finally {
        setLoadingSuppliers(false)
      }
    }

    loadEbay()
    loadSuppliers()
  }, [category, categoryQuery])

  if (!category) {
    return (
      <main className="app-bg min-h-screen px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="soft-button inline-flex items-center gap-2 rounded-2xl px-4 py-2">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <div className="premium-card mt-8 rounded-3xl p-6">
            <h1 className="text-3xl font-black">Category not found</h1>
            <p className="mt-2 text-white/65">Choose one of the main catering equipment categories from the homepage.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="app-bg min-h-screen pb-24 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href="/" className="soft-button inline-flex items-center gap-2 rounded-2xl px-4 py-2">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <Link href="/post-listing" className="premium-button rounded-2xl px-4 py-2 text-sm font-black">
            List yours for free
          </Link>
        </div>

        <section className="premium-card rounded-[2rem] p-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FF6B00]">CaterBids Category</p>
          <h1 className="mt-2 text-4xl font-black">{category.title}</h1>
          <p className="mt-2 max-w-2xl text-white/70">{category.description}</p>

          {browseLinks.length > 0 && (
            <div className="mt-5">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/55">
                {category.slug === "catering-equipment" ? "Equipment categories" : "Subcategories"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {browseLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3 text-sm font-bold text-white/80 hover:border-[#FF6B00]/50 hover:bg-white/[0.1] hover:text-white"
                  >
                    <span className="block">{item.label}</span>
                    {item.description && (
                      <span className="mt-1 line-clamp-2 block text-xs font-medium leading-relaxed text-white/45">
                        {item.description}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {category.slug !== "catering-equipment" && category.subcategories.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {category.subcategories.map((subcategory) => (
              <Link
                key={subcategory}
                href={`/search?q=${encodeURIComponent(subcategory)}&category=${encodeURIComponent(category.title)}`}
                className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-bold text-white/75 hover:border-[#FF6B00]/50 hover:text-white"
              >
                {subcategory}
              </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8" id="caterbids-results">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">CaterBids Listings</h2>
            <span className="text-sm text-white/55">{listings.length} found</span>
          </div>

          {loadingListings ? (
            <div className="premium-card flex items-center justify-center rounded-3xl p-8 text-white/65">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading listings
            </div>
          ) : listings.length === 0 ? (
            <div className="premium-card rounded-3xl p-8 text-center">
              <Tag className="mx-auto h-10 w-10 text-white/35" />
              <h3 className="mt-4 text-2xl font-black">No CaterBids listings here yet</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">
                Be the first to list used or refurbished {category.title.toLowerCase()} during the free beta.
              </p>
              <Link href="/post-listing" className="premium-button mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-black">
                <Plus className="h-4 w-4" />
                List yours for free
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((item) => {
                const image = listingImages(item)[0]
                return (
                  <Link
                    key={safeId(item.id)}
                    href={`/listing?id=${encodeURIComponent(safeId(item.id))}`}
                    className="premium-card group overflow-hidden rounded-3xl"
                  >
                    <div className="flex h-56 items-center justify-center bg-[#001B35]">
                      {image ? (
                        <img src={image} alt={item.title} className="h-full w-full object-contain transition group-hover:scale-[1.02]" />
                      ) : (
                        <Tag className="h-10 w-10 text-white/35" />
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-2 flex flex-wrap gap-2">
                        {item.subcategory && (
                          <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-1 text-[11px] font-bold text-white/65">
                            {item.subcategory}
                          </span>
                        )}
                        {item.condition && (
                          <span className="rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-2 py-1 text-[11px] font-bold text-orange-100">
                            {item.condition}
                          </span>
                        )}
                      </div>
                      <h3 className="line-clamp-2 font-black">{item.title}</h3>
                      <p className="mt-2 text-xl font-black text-[#FF6B00]">{formatPrice(item.price)}</p>
                      <p className="mt-1 text-sm text-white/55">{item.city || item.location || "UK"}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-10" id="ebay-results">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Live eBay Results</h2>
            <span className="text-sm text-white/55">{ebayResults.length} shown</span>
          </div>
          {loadingEbay ? (
            <div className="premium-card rounded-3xl p-6 text-white/60">Loading eBay results...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ebayResults.map((item) => (
                <a key={item.itemId} href={item.itemWebUrl} target="_blank" rel="noopener noreferrer" className="premium-card overflow-hidden rounded-3xl">
                  <div className="h-48 bg-white">
                    {item.image?.imageUrl ? (
                      <img src={item.image.imageUrl} alt={item.title} className="h-full w-full object-contain" />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 font-black">{item.title}</h3>
                    <p className="mt-2 text-lg font-black text-[#FF6B00]">
                      {item.price?.value ? `£${item.price.value}` : "View price"}
                    </p>
                    <p className="mt-1 text-sm text-white/55">{item.itemLocation?.city || "UK"}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10" id="supplier-results">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Trusted Used Supplier Results</h2>
            <span className="text-sm text-white/55">{supplierResults.length} shown</span>
          </div>
          {loadingSuppliers ? (
            <div className="premium-card rounded-3xl p-6 text-white/60">Loading supplier results...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {supplierResults.map((item) => (
                <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer" className="premium-card overflow-hidden rounded-3xl">
                  <div className={item.imageType === "supplier-logo" ? "flex h-48 items-center justify-center bg-white p-8" : "h-48 bg-[#001B35]"}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className={item.imageType === "supplier-logo" ? "max-h-full max-w-full object-contain" : "h-full w-full object-cover"}
                      />
                    ) : (
                      <Tag className="mx-auto h-full w-10 text-white/30" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-2 py-1 text-[11px] font-black uppercase text-orange-100">
                        {item.badge || "Used supplier"}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-1 text-[11px] font-bold text-white/65">
                        {item.domain}
                      </span>
                    </div>
                    <h3 className="line-clamp-2 font-black">{item.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-white/60">{item.snippet}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-[#FF6B00]">
                      View supplier page <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
