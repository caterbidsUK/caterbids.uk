"use client"

import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth'
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  MapPin,
  Tag,
  Shield,
  Clock,
  MessageCircle,
  Share2,
  Heart,
  AlertTriangle,
  Eye,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react"

import DeliveryQuoteBox from "@/components/DeliveryQuoteBox"
import BuyCheckoutBox from "@/components/BuyCheckoutBox"
import type { DeliveryQuote } from "@/components/DeliveryQuoteBox"
import type { Database } from '@/types/supabase'
import { CATEGORY_OPTIONS, categoryByTitle, subcategoriesForCategory } from "@/lib/categories"
import { resolveFullUkPostcode } from "@/lib/delivery/postcodes"
import {
  BUYER_WARNING,
  CONDITION_OPTIONS,
  DELIVERY_OPTION_OPTIONS,
  POWER_TYPE_OPTIONS,
  SAFETY_DISCLAIMER,
  TESTED_STATUS_OPTIONS,
  WARRANTY_TYPE_OPTIONS,
  buyerChecklistForListing,
  trustBadgesForListing,
  valueOrNotProvided,
} from "@/lib/listing-trust"

type Listing = Database['public']['Tables']['listings']['Row']

const listingConditions = CONDITION_OPTIONS
const LOCAL_LISTINGS_KEY = "caterbids_listings"
const LOCAL_CURRENT_LISTING_KEY = "caterbids_current_listing"
const LOCAL_PUBLIC_LISTINGS_KEY = "caterbids_public_listings"
const LOCAL_CONVERSATIONS_KEY = "caterbids_conversations"

function formatPrice(price: unknown) {
  const value = String(price ?? "").trim()
  if (!value) return "£0"
  if (value.startsWith("£")) return value
  return `£${value}`
}

function safeListingId(idValue: unknown) {
  return String(idValue ?? "")
}

function isUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function optionalNumber(value: FormDataEntryValue | null) {
  const numberValue = Number(value || "")
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null
}

function listingPriceNumber(price: unknown) {
  const value = Number(String(price ?? "").replace(/[^0-9.]/g, ""))
  return Number.isFinite(value) ? value : 0
}

function listingImageUrls(item: Partial<Listing> | null | undefined) {
  const images = Array.isArray(item?.images)
    ? item.images.filter((url): url is string => typeof url === "string" && Boolean(url))
    : []
  return images.length > 0 ? images : item?.image_url ? [item.image_url] : []
}

function readJsonValue<T>(key: string, fallback: T, clearOnError = false): T {
  if (typeof window === "undefined") return fallback

  try {
    const savedValue = localStorage.getItem(key)
    if (!savedValue) return fallback
    return JSON.parse(savedValue) as T
  } catch (error) {
    console.warn(`Could not read ${key}:`, error)
    if (clearOnError) {
      localStorage.removeItem(key)
    }
    return fallback
  }
}

function readLocalListings() {
  if (typeof window === "undefined") return [] as Listing[]
  const savedListings = readJsonValue<Listing[]>(LOCAL_LISTINGS_KEY, [], true)
  const publicListings = readJsonValue<Listing[]>(LOCAL_PUBLIC_LISTINGS_KEY, [], true)
  const savedCurrent = readJsonValue<Listing | null>(LOCAL_CURRENT_LISTING_KEY, null, true)
  const byId = new Map<string, Listing>()

  for (const item of [
    ...(Array.isArray(savedListings) ? savedListings : []),
    ...(Array.isArray(publicListings) ? publicListings : []),
    ...(savedCurrent ? [savedCurrent] : []),
  ]) {
    const id = safeListingId(item?.id)
    if (id) {
      byId.set(id, item)
    }
  }

  return Array.from(byId.values())
}

function writeLocalListings(listings: Listing[]) {
  localStorage.setItem(LOCAL_LISTINGS_KEY, JSON.stringify(listings))
  localStorage.setItem(LOCAL_PUBLIC_LISTINGS_KEY, JSON.stringify(listings))
}

function readLocalListing(id: string | null) {
  const itemId = safeListingId(id)
  if (!itemId) return null
  const savedListings = readLocalListings()
  const savedCurrent = readJsonValue<Listing | null>(LOCAL_CURRENT_LISTING_KEY, null, true)
  return (
    savedListings.find((item) => safeListingId(item.id) === itemId) ||
    (safeListingId(savedCurrent?.id) === itemId ? savedCurrent : null)
  )
}

function readLocalConversations() {
  if (typeof window === "undefined") return []
  const conversations = readJsonValue<Array<{
    id: string
    buyer_id?: string | null
    seller_id?: string | null
    listing_id?: string | null
    platform: string
    participant_name: string
    listing_title?: string | null
    last_message?: string | null
    last_message_at?: string | null
    unread_count: number
    created_at?: string | null
    updated_at?: string | null
  }>>(LOCAL_CONVERSATIONS_KEY, [])
  return Array.isArray(conversations) ? conversations : []
}

function writeLocalConversations(conversations: ReturnType<typeof readLocalConversations>) {
  localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(conversations))
}

function logSupabaseListingMessageError(error: unknown) {
  console.warn("Supabase listing message warning:", error)
}

function ListingContent() {
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get("id")

  const [listing, setListing] = useState<Listing | null>(null)
  const [myListings, setMyListings] = useState<Listing[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [editingListing, setEditingListing] = useState<Listing | null>(null)
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([])
  const [activeImage, setActiveImage] = useState("")
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryQuote | null>(null)
  const [editingCategory, setEditingCategory] = useState("Catering Equipment")
  const [editingSubcategory, setEditingSubcategory] = useState("Cooking Equipment")
  const [editError, setEditError] = useState("")
  const [messageError, setMessageError] = useState("")
  const [openingMessage, setOpeningMessage] = useState(false)

  function userOwnsListing(item: Partial<Listing> | null | undefined) {
    const userId = safeListingId(item?.user_id)
    const sellerId = safeListingId(item?.seller_id)
    return Boolean(currentUserId && (userId === currentUserId || sellerId === currentUserId))
  }

  function startEditing(item: Listing) {
    if (!userOwnsListing(item)) {
      setEditError("You can only edit listings from your own account.")
      return
    }

    setEditingListing(item)
    const itemCategory = item.category || "Catering Equipment"
    const existingCategory = categoryByTitle(itemCategory)
    const normalisedCategory =
      existingCategory && existingCategory.marketplaceType
        ? existingCategory.title
        : existingCategory
          ? "Catering Equipment"
          : itemCategory
    setEditingCategory(normalisedCategory)
    setEditingSubcategory(item.subcategory || (existingCategory?.marketplaceType ? "" : itemCategory) || subcategoriesForCategory(normalisedCategory)[0] || "")
    setEditImagePreviews(listingImageUrls(item))
    setEditError("")
  }

  function handleEditImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const allowed = files.filter((file) =>
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)
    )
    const remainingSlots = 6 - editImagePreviews.length
    const selected = allowed.slice(0, remainingSlots)
    if (selected.length === 0) return

    Promise.all(
      selected.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          })
      )
    )
      .then((previews) => setEditImagePreviews((current) => [...current, ...previews].slice(0, 6)))
      .catch(() => setEditError("Could not prepare one of those images."))

    e.target.value = ""
  }

  function removeEditImage(index: number) {
    setEditImagePreviews((current) => current.filter((_, imageIndex) => imageIndex !== index))
  }

  function updateListingState(updatedListing: Listing) {
    const updatedListingId = safeListingId(updatedListing.id)
    setListing((current) => (safeListingId(current?.id) === updatedListingId ? updatedListing : current))
    setMyListings((items) =>
      items.map((item) => (safeListingId(item.id) === updatedListingId ? updatedListing : item))
    )
  }

  function saveLocalListingEdits(updatedListing: Listing) {
    const existing = readLocalListings()
    const updatedListingId = safeListingId(updatedListing.id)
    const nextListings = existing.map((item) =>
      safeListingId(item.id) === updatedListingId ? updatedListing : item
    )
    writeLocalListings(nextListings.some((item) => safeListingId(item.id) === updatedListingId) ? nextListings : [updatedListing, ...existing])
    localStorage.setItem(LOCAL_CURRENT_LISTING_KEY, JSON.stringify(updatedListing))
  }

  async function saveListingEdits(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingListing) return

    if (!userOwnsListing(editingListing)) {
      setEditError("You can only edit listings from your own account.")
      return
    }

    const formData = new FormData(event.currentTarget)
    const updatedListing: Listing = {
      ...editingListing,
      title: ((formData.get("title") as string) || "").trim(),
      price: formatPrice(formData.get("price") as string),
      location: ((formData.get("location") as string) || "").trim(),
      city: ((formData.get("city") as string) || "").trim() || null,
      category: (formData.get("category") as string) || "Catering Equipment",
      subcategory: (formData.get("subcategory") as string) || null,
      condition: (formData.get("condition") as string) || "Used",
      power_type: (formData.get("power_type") as string) || "Unknown",
      dimensions: ((formData.get("dimensions") as string) || "").trim() || null,
      service_history: ((formData.get("service_history") as string) || "").trim() || null,
      warranty_type: (formData.get("warranty_type") as string) || "No warranty",
      manuals_available: formData.get("manuals_available") === "on",
      tested_status: (formData.get("tested_status") as string) || "Untested",
      delivery_option: (formData.get("delivery_option") as string) || "Collection only",
      collection_postcode: ((formData.get("collection_postcode") as string) || "").trim() || null,
      vat_included: formData.get("vat_included") === "on",
      weight_kg: optionalNumber(formData.get("weight_kg")),
      length_cm: optionalNumber(formData.get("length_cm")),
      width_cm: optionalNumber(formData.get("width_cm")),
      height_cm: optionalNumber(formData.get("height_cm")),
      pallet_ready: formData.get("pallet_ready") === "on",
      tail_lift_required: formData.get("tail_lift_required") === "on",
      forklift_available: formData.get("forklift_available") === "on",
      ground_floor_collection: formData.get("ground_floor_collection") === "on",
      commercial_premises: formData.get("commercial_premises") === "on",
      delivery_available: formData.get("delivery_available") === "on",
      description: ((formData.get("description") as string) || "").trim(),
      image_url: editImagePreviews[0] || editingListing.image_url,
      images: editImagePreviews.length > 0 ? editImagePreviews : listingImageUrls(editingListing),
    }

    if (!updatedListing.title || !updatedListing.price || !updatedListing.location) {
      setEditError("Title, price and location are required.")
      return
    }

    const editingListingId = safeListingId(editingListing.id)
    const localListing = readLocalListing(editingListingId)
    if (editingListingId.startsWith("local-") || localListing) {
      saveLocalListingEdits(updatedListing)
      updateListingState(updatedListing)
      setEditingListing(null)
      setEditImagePreviews([])
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from("listings")
      .update({
        title: updatedListing.title,
        price: updatedListing.price,
        location: updatedListing.location,
        city: updatedListing.city,
        category: updatedListing.category,
        subcategory: updatedListing.subcategory,
        condition: updatedListing.condition,
        power_type: updatedListing.power_type,
        dimensions: updatedListing.dimensions,
        service_history: updatedListing.service_history,
        warranty_type: updatedListing.warranty_type,
        manuals_available: updatedListing.manuals_available,
        tested_status: updatedListing.tested_status,
        delivery_option: updatedListing.delivery_option,
        collection_postcode: updatedListing.collection_postcode,
        vat_included: updatedListing.vat_included,
        weight_kg: updatedListing.weight_kg,
        length_cm: updatedListing.length_cm,
        width_cm: updatedListing.width_cm,
        height_cm: updatedListing.height_cm,
        pallet_ready: updatedListing.pallet_ready,
        tail_lift_required: updatedListing.tail_lift_required,
        forklift_available: updatedListing.forklift_available,
        ground_floor_collection: updatedListing.ground_floor_collection,
        commercial_premises: updatedListing.commercial_premises,
        delivery_available: updatedListing.delivery_available,
        description: updatedListing.description,
        image_url: updatedListing.image_url,
        images: updatedListing.images,
      })
      .eq("id", safeListingId(updatedListing.id))

    if (error) {
      setEditError(error.message || "Could not save listing changes.")
      return
    }

    updateListingState(updatedListing)
    setEditingListing(null)
    setEditImagePreviews([])
  }

  async function deleteListing(item: Listing) {
    const confirmed = window.confirm("Delete this listing? This cannot be undone.")
    if (!confirmed) return

    if (!userOwnsListing(item)) {
      setEditError("You can only delete listings from your own account.")
      return
    }

    const itemId = safeListingId(item.id)

    const removeLocal = () => {
      const nextListings = readLocalListings().filter((listingItem) => safeListingId(listingItem.id) !== itemId)
      writeLocalListings(nextListings)
      const current = readJsonValue<Listing | null>(LOCAL_CURRENT_LISTING_KEY, null, true)
      if (safeListingId(current?.id) === itemId) {
        localStorage.removeItem(LOCAL_CURRENT_LISTING_KEY)
      }
    }

    if (!itemId || itemId.startsWith("local-") || readLocalListing(itemId)) {
      removeLocal()
      setMyListings((items) => items.filter((listingItem) => safeListingId(listingItem.id) !== itemId))
      if (id) router.push("/listing")
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from("listings").delete().eq("id", itemId)

    if (error) {
      setEditError(error.message || "Could not delete listing.")
      return
    }

    setMyListings((items) => items.filter((listingItem) => safeListingId(listingItem.id) !== itemId))
    if (id) router.push("/listing")
  }

  async function messageSeller() {
    if (!listing) return

    setMessageError("")
    setOpeningMessage(true)

    const supabase = createClient()
    const user = await getCurrentUser(supabase)

    if (!user) {
      setOpeningMessage(false)
      router.push(`/login?next=${encodeURIComponent(`/listing?id=${listing.id}`)}`)
      return
    }

    if (!listing.user_id || listing.user_id === "local") {
      setOpeningMessage(false)
      setMessageError("Messaging is only available for saved CaterBids listings.")
      return
    }

    if (listing.user_id === user.id) {
      setOpeningMessage(false)
      setMessageError("This is your listing, so buyers will message you from here.")
      return
    }

    const createLocalConversation = () => {
      const existing = readLocalConversations().find((conversation) => {
        return (
          conversation.buyer_id === user.id &&
          conversation.seller_id === listing.user_id &&
          conversation.listing_id === listing.id
        )
      })

      if (existing) {
        router.push(`/messages?conversation=${existing.id}`)
        return
      }

      const now = new Date().toISOString()
      const conversation = {
        id: `local-conversation-${Date.now()}`,
        buyer_id: user.id,
        seller_id: listing.user_id,
        listing_id: listing.id,
        platform: "caterbids",
        participant_name: "Seller",
        listing_title: listing.title,
        last_message: "Conversation started",
        last_message_at: now,
        unread_count: 0,
        created_at: now,
        updated_at: now,
      }

      writeLocalConversations([conversation, ...readLocalConversations()])
      router.push(`/messages?conversation=${conversation.id}`)
    }

    const { data: existingConversation, error: existingError } = await supabase
      .from("conversations")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("seller_id", listing.user_id)
      .eq("listing_id", listing.id)
      .maybeSingle()

    if (existingError) {
      logSupabaseListingMessageError(existingError)
      createLocalConversation()
      return
    }

    if (existingConversation?.id) {
      router.push(`/messages?conversation=${existingConversation.id}`)
      return
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        buyer_id: user.id,
        seller_id: listing.user_id,
        listing_id: listing.id,
        platform: "caterbids",
        participant_name: "Seller",
        listing_title: listing.title,
        last_message: "Conversation started",
        unread_count: 0,
      })
      .select("id")
      .single()

    if (conversationError || !conversation) {
      logSupabaseListingMessageError(conversationError)
      createLocalConversation()
      return
    }

    router.push(`/messages?conversation=${conversation.id}`)
  }

  async function toggleListingFavourite() {
    if (!listing) return
    const listingId = safeListingId(listing.id)

    const supabase = createClient()
    const user = await getCurrentUser(supabase)

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/listing?id=${listingId}`)}`)
      return
    }

    setLiked((current) => !current)

    if (!liked) {
      const favouriteImage = listingImageUrls(listing)[0] || null
      const { error } = await supabase.from("favourites").upsert(
        {
          user_id: user.id,
          source: "caterbids",
          external_id: listingId,
          title: listing.title,
          price: formatPrice(listing.price),
          location: listing.city || listing.location || null,
          category: listing.category || null,
          condition: listing.condition || null,
          image_url: favouriteImage,
          url: `/listing?id=${listingId}`,
        },
        { onConflict: "user_id,source,external_id" }
      )

      if (error) console.warn("Listing favourite unavailable:", error.message || error)
      return
    }

    const { error } = await supabase
      .from("favourites")
      .delete()
      .eq("user_id", user.id)
      .eq("source", "caterbids")
      .eq("external_id", listingId)

    if (error) console.warn("Listing favourite delete unavailable:", error.message || error)
  }

  useEffect(() => {
    async function fetchListing() {
      const supabase = createClient()
      const user = await getCurrentUser(supabase)
      const userId = safeListingId(user?.id) || null
      setCurrentUserId(userId)

      async function getSoldIds() {
        try {
          const res = await fetch("/api/sold-listings", { cache: "no-store" })
          if (!res.ok) return new Set<string>()
          const data = (await res.json()) as { listingIds?: string[] }
          return new Set((data.listingIds || []).map((item) => safeListingId(item)))
        } catch (error) {
          console.warn("Sold listing status unavailable:", error)
          return new Set<string>()
        }
      }

      const soldIds = await getSoldIds()

      function withSoldStatus(item: Listing | null) {
        if (!item) return null
        return soldIds.has(safeListingId(item.id)) ? { ...item, status: "sold" } : item
      }

      if (!id) {
        const localListings = readLocalListings()
        const ownedLocalListings = userId
          ? localListings.filter((item) => safeListingId(item.user_id) === userId)
          : []

        if (!user) {
          setMyListings([])
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('Error fetching my listings:', error.message || error)
          setMyListings(ownedLocalListings)
          setLoading(false)
          return
        }

        const remoteListings = data || []
        const remoteIds = new Set(remoteListings.map((item) => safeListingId(item.id)))
        setMyListings([...ownedLocalListings.filter((item) => !remoteIds.has(safeListingId(item.id))), ...remoteListings])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.warn('Error fetching listing:', error.message || error)
        setListing(withSoldStatus(readLocalListing(id)))
        setLoading(false)
        return
      }

      setListing(withSoldStatus(data || readLocalListing(id)))
      setLoading(false)
    }

    fetchListing()
  }, [id])

  useEffect(() => {
    const images = listingImageUrls(listing)
    const timer = window.setTimeout(() => {
      setActiveImage((current) => (current && images.includes(current) ? current : images[0] || ""))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [listing])

  const editListingPanel = editingListing ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 py-4 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={saveListingEdits}
        className="premium-shell max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] p-5 shadow-2xl shadow-black/40"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">Edit Listing</p>
            <h2 className="mt-1 text-xl font-black">Update your item</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingListing(null)
              setEditImagePreviews([])
              setEditError("")
            }}
            className="soft-button flex h-10 w-10 items-center justify-center rounded-2xl"
            aria-label="Close edit listing"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-white/55">Listing images</span>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleEditImageUpload}
            className="premium-input w-full rounded-2xl p-3 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#FF6B00] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
          />
          <span className="mt-2 block text-xs text-white/45">Add up to 6 images. The first image is the main listing image.</span>
        </label>

        {editImagePreviews.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-3">
            {editImagePreviews.map((src, index) => (
              <div key={`${src}-${index}`} className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
                <img
                  src={src}
                  alt={`Listing preview ${index + 1}`}
                  className="h-24 w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-[#FF6B00] px-2 py-1 text-[10px] font-bold text-white">
                    Main
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeEditImage(index)}
                  className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white"
                  aria-label={`Remove listing image ${index + 1}`}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          name="title"
          defaultValue={editingListing.title}
          placeholder="Title"
          className="premium-input mb-3 w-full rounded-2xl p-3"
        />
        <input
          name="price"
          defaultValue={formatPrice(editingListing.price)}
          placeholder="Price"
          className="premium-input mb-3 w-full rounded-2xl p-3"
        />
        <input
          name="location"
          defaultValue={editingListing.location}
          placeholder="Location"
          className="premium-input mb-3 w-full rounded-2xl p-3"
        />
        <input
          name="city"
          defaultValue={editingListing.city || ""}
          placeholder="City / Location"
          className="premium-input mb-3 w-full rounded-2xl p-3"
        />
        <select
          name="category"
          value={editingCategory}
          onChange={(event) => {
            const nextCategory = event.target.value
            setEditingCategory(nextCategory)
            setEditingSubcategory(subcategoriesForCategory(nextCategory)[0] || "")
          }}
          className="premium-input mb-3 w-full rounded-2xl p-3"
        >
          {CATEGORY_OPTIONS.filter((category) => category !== "All Categories").map((category) => (
            <option key={category} className="text-black">
              {category}
            </option>
          ))}
        </select>
        {subcategoriesForCategory(editingCategory).length > 0 && (
          <select
            name="subcategory"
            value={editingSubcategory}
            onChange={(event) => setEditingSubcategory(event.target.value)}
            className="premium-input mb-3 w-full rounded-2xl p-3"
          >
            {subcategoriesForCategory(editingCategory).map((subcategory) => (
              <option key={subcategory} className="text-black">
                {subcategory}
              </option>
            ))}
          </select>
        )}
        <select
          name="condition"
          defaultValue={editingListing.condition || "Used"}
          className="premium-input mb-3 w-full rounded-2xl p-3"
        >
          {listingConditions.map((condition) => (
            <option key={condition} className="text-black">
              {condition}
            </option>
          ))}
        </select>
        <div className="mb-4 rounded-3xl border border-[#FF6B00]/20 bg-[#002E5D]/35 p-4">
          <p className="mb-3 text-sm font-black text-[#FF6B00]">Trade trust details</p>
          <label className="mb-1 block text-xs font-bold text-[#002E5D]">
            Power / Fuel Type
          </label>
          <select
            name="power_type"
            defaultValue={editingListing.power_type || "Unknown"}
            className="w-full rounded-xl border border-gray-300 bg-[#243B63] px-4 py-3 text-sm font-semibold text-white focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
          >
            {POWER_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <input
            name="dimensions"
            defaultValue={editingListing.dimensions || ""}
            placeholder="Dimensions e.g. 900w x 700d x 900h mm"
            className="premium-input my-3 w-full rounded-2xl p-3"
          />
          <textarea
            name="service_history"
            defaultValue={editingListing.service_history || ""}
            placeholder="Service history, engineer checks, PAT/gas-safe notes"
            className="premium-input mb-3 min-h-24 w-full rounded-2xl p-3"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              name="warranty_type"
              defaultValue={editingListing.warranty_type || "No warranty"}
              className="premium-input w-full rounded-2xl p-3"
            >
              {WARRANTY_TYPE_OPTIONS.map((option) => (
                <option key={option} className="text-black">{option}</option>
              ))}
            </select>
            <select
              name="tested_status"
              defaultValue={editingListing.tested_status || "Untested"}
              className="premium-input w-full rounded-2xl p-3"
            >
              {TESTED_STATUS_OPTIONS.map((option) => (
                <option key={option} className="text-black">{option}</option>
              ))}
            </select>
          </div>
          <select
            name="delivery_option"
            defaultValue={editingListing.delivery_option || "Collection only"}
            className="premium-input my-3 w-full rounded-2xl p-3"
          >
            {DELIVERY_OPTION_OPTIONS.map((option) => (
              <option key={option} className="text-black">{option}</option>
            ))}
          </select>
          <input
            name="collection_postcode"
            defaultValue={editingListing.collection_postcode || ""}
            placeholder="Collection postcode e.g. B12"
            className="premium-input mb-3 w-full rounded-2xl p-3"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80">
              <input name="manuals_available" type="checkbox" defaultChecked={Boolean(editingListing.manuals_available)} className="h-4 w-4 accent-[#FF6B00]" />
              Manuals available
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80">
              <input name="vat_included" type="checkbox" defaultChecked={Boolean(editingListing.vat_included)} className="h-4 w-4 accent-[#FF6B00]" />
              VAT included
            </label>
          </div>
        </div>
        <div className="mb-4 rounded-3xl border border-[#FF6B00]/20 bg-[#002E5D]/35 p-4">
          <p className="mb-3 text-sm font-black text-[#FF6B00]">CaterBids Delivery setup</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80">
              <input name="delivery_available" type="checkbox" defaultChecked={editingListing.delivery_available !== false} className="h-4 w-4 accent-[#FF6B00]" />
              Delivery available
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80">
              <input name="pallet_ready" type="checkbox" defaultChecked={Boolean(editingListing.pallet_ready)} className="h-4 w-4 accent-[#FF6B00]" />
              Pallet ready
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80">
              <input name="tail_lift_required" type="checkbox" defaultChecked={editingListing.tail_lift_required !== false} className="h-4 w-4 accent-[#FF6B00]" />
              Tail-lift required
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80">
              <input name="forklift_available" type="checkbox" defaultChecked={Boolean(editingListing.forklift_available)} className="h-4 w-4 accent-[#FF6B00]" />
              Forklift available
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80">
              <input name="ground_floor_collection" type="checkbox" defaultChecked={editingListing.ground_floor_collection !== false} className="h-4 w-4 accent-[#FF6B00]" />
              Ground-floor collection
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80">
              <input name="commercial_premises" type="checkbox" defaultChecked={Boolean(editingListing.commercial_premises)} className="h-4 w-4 accent-[#FF6B00]" />
              Commercial premises
            </label>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input name="weight_kg" type="number" defaultValue={editingListing.weight_kg || ""} placeholder="Weight kg" className="premium-input rounded-2xl p-3" />
            <input name="length_cm" type="number" defaultValue={editingListing.length_cm || ""} placeholder="Length cm" className="premium-input rounded-2xl p-3" />
            <input name="width_cm" type="number" defaultValue={editingListing.width_cm || ""} placeholder="Width cm" className="premium-input rounded-2xl p-3" />
            <input name="height_cm" type="number" defaultValue={editingListing.height_cm || ""} placeholder="Height cm" className="premium-input rounded-2xl p-3" />
          </div>
        </div>
        <textarea
          name="description"
          defaultValue={editingListing.description || ""}
          placeholder="Description"
          className="premium-input mb-4 min-h-32 w-full rounded-2xl p-3"
        />

        {editError && (
          <p className="mb-3 rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200">
            {editError}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="premium-button flex-1 rounded-2xl px-5 py-3 text-sm font-bold"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => deleteListing(editingListing)}
            className="soft-button rounded-2xl px-5 py-3 text-sm font-bold text-red-200"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  ) : null

  if (!id) {
    return (
      <main className="app-bg min-h-screen pb-10 text-white">
        {editListingPanel}
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => router.push("/account")}
              className="soft-button flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              Account
            </button>

            <button
              onClick={() => router.push("/post-listing")}
              className="premium-button flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold"
            >
              <Plus className="h-4 w-4" />
              Sell Item
            </button>
          </div>

          <section className="premium-shell rounded-[2rem] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF6B00]">Account</p>
            <h1 className="mt-2 text-3xl font-black">My Listings</h1>
            <p className="mt-2 text-sm text-white/60">
              Items you have published on CaterBids.
            </p>
          </section>

          {loading ? (
            <div className="mt-6 premium-card rounded-3xl p-6 text-center text-white/60">
              Loading your listings...
            </div>
          ) : myListings.length === 0 ? (
            <div className="premium-card mt-6 rounded-3xl p-8 text-center">
              <Tag className="mx-auto h-10 w-10 text-white/30" />
              <h2 className="mt-4 text-xl font-black">No test listings found yet</h2>
              <p className="mt-2 text-sm text-white/60">
                Create a local beta listing or search live marketplace results.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => router.push("/post-listing")}
                  className="premium-button rounded-2xl px-5 py-3 text-sm font-bold"
                >
                  Create Test Listing
                </button>
                <button
                  onClick={() => router.push("/search")}
                  className="soft-button rounded-2xl px-5 py-3 text-sm font-bold"
                >
                  Go to Search
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {myListings.map((item, index) => {
                const itemId = safeListingId(item.id)
                const itemImage = listingImageUrls(item)[0]

                return (
                <article
                  key={itemId || `listing-${index}`}
                  className="premium-card premium-card-hover overflow-hidden rounded-3xl"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/listing?id=${encodeURIComponent(itemId)}`)}
                    className="block w-full text-left"
                  >
                    {itemImage ? (
                      <div className="aspect-[4/3] overflow-hidden bg-black/20">
                        <img src={itemImage} alt={item.title} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-white/5">
                        <Tag className="h-10 w-10 text-white/30" />
                      </div>
                    )}

                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="line-clamp-2 text-base font-black leading-snug">{item.title}</h2>
                        <span className="premium-badge shrink-0 rounded-xl px-2 py-1 text-xs font-black">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          <MapPin className="h-3 w-3" />
                          {item.city || item.location || "UK"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          <Tag className="h-3 w-3" />
                          {item.category}
                        </span>
                        {trustBadgesForListing(item).slice(0, 2).map((badge) => (
                          <span
                            key={badge}
                            className="inline-flex items-center gap-1 rounded-full border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-2 py-1 font-bold text-orange-100"
                          >
                            <Shield className="h-3 w-3" />
                            {badge}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/55">
                        {item.description || "No description added."}
                      </p>
                    </div>
                  </button>

                  <div className="flex gap-2 border-t border-white/10 p-3">
                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      className="soft-button flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteListing(item)}
                      className="soft-button flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold text-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </article>
                )
              })}
            </div>
          )}
        </div>
      </main>
    )
  }

  if (loading || !listing) {
    return (
      <main className="app-bg flex min-h-screen items-center justify-center px-4 text-white">
        <div className="premium-card rounded-3xl p-8 text-center">
          {loading ? (
            <p className="text-lg font-semibold text-white/70">Loading listing...</p>
          ) : (
            <>
              <AlertTriangle className="mx-auto h-12 w-12 text-white/30" />
              <p className="mt-4 text-lg font-semibold text-white/70">Listing not found</p>
              <button
                onClick={() => router.push("/listing")}
                className="premium-button mt-4 rounded-2xl px-5 py-2.5 text-sm font-bold"
              >
                Back to My Listings
              </button>
            </>
          )}
        </div>
      </main>
    )
  }

  const listingImages = listingImageUrls(listing)
  const buyerChecklist = buyerChecklistForListing(listing)
  const trustBadges = trustBadgesForListing(listing)
  const deliveryOptionText = (listing.delivery_option || "").toLowerCase()
  const usesCaterBidsDelivery =
    Boolean(listing.caterbids_delivery_available) ||
    Boolean(listing.delivery_available) ||
    listing.delivery_method === "caterbids_delivery" ||
    deliveryOptionText.includes("delivery") ||
    deliveryOptionText.includes("pallet") ||
    deliveryOptionText.includes("courier") ||
    deliveryOptionText.includes("local")
  const listingWeightKg = listing.pallet_weight_kg || listing.weight_kg
  const listingLengthCm = listing.pallet_length_cm || listing.length_cm
  const listingWidthCm = listing.pallet_width_cm || listing.width_cm
  const listingHeightCm = listing.pallet_height_cm || listing.height_cm
  const hasDeliveryMeasurements =
    Number(listingWeightKg || 0) > 0 &&
    Number(listingLengthCm || 0) > 0 &&
    Number(listingWidthCm || 0) > 0 &&
    Number(listingHeightCm || 0) > 0
  const deliveryExplicitlyDisabled =
    !usesCaterBidsDelivery &&
    (listing.delivery_method === "collection_only" ||
      listing.delivery_available === false ||
      deliveryOptionText.includes("buyer arranges transport")
    )
  const hasDeliveryOption =
    usesCaterBidsDelivery &&
    hasDeliveryMeasurements &&
    (listing.delivery_available === true ||
      usesCaterBidsDelivery ||
      deliveryOptionText.includes("delivery") ||
      deliveryOptionText.includes("pallet") ||
      deliveryOptionText.includes("courier") ||
      deliveryOptionText.includes("local"))
  const isListingOwner = userOwnsListing(listing)
  const isSoldListing = listing.status === "sold"
  const manualSourceUrl = listing.manual_source_url || listing.spec_source_url || ""
  const manualSourceName = listing.manual_source_name || "Manual / spec source"
  const specConfidence = listing.ai_spec_confidence || ""
  const specsVerifiedBySeller = Boolean(listing.specs_verified_by_seller)
  const manualSourceValidated = Boolean(listing.manual_source_validated)
  const sourceRejectedBySeller = Boolean(listing.source_rejected_by_seller)
  const showCaterBotSource =
    Boolean(manualSourceUrl) &&
    manualSourceValidated &&
    specsVerifiedBySeller &&
    !sourceRejectedBySeller &&
    specConfidence.toLowerCase() !== "low" &&
    specConfidence.toLowerCase() !== "source rejected"
  const checkoutSellerId = isUuid(safeListingId(listing.seller_id || listing.user_id))
    ? safeListingId(listing.seller_id || listing.user_id)
    : ""
  const fullCollectionPostcode = resolveFullUkPostcode(
    listing.collection_postcode,
    listing.collection_full_address,
    listing.location
  )
  const safetyRows = [
    ["Condition", valueOrNotProvided(listing.condition)],
    ["Tested status", valueOrNotProvided(listing.tested_status)],
    ["Warranty", valueOrNotProvided(listing.warranty_type)],
    ["Power type", valueOrNotProvided(listing.power_type)],
    ["Dimensions", valueOrNotProvided(listing.dimensions)],
    ["Service history", valueOrNotProvided(listing.service_history)],
    ["Manuals", listing.manuals_available ? "Available" : "Not provided"],
    ["VAT", listing.vat_included ? "Included" : "Not stated"],
    ["Delivery", valueOrNotProvided(listing.delivery_option)],
    ["Collection postcode", fullCollectionPostcode || "Collection postcode not provided"],
    ["Weight", listingWeightKg ? `${listingWeightKg} kg` : "Not provided"],
    ["Package size", listingLengthCm && listingWidthCm && listingHeightCm ? `${listingLengthCm} x ${listingWidthCm} x ${listingHeightCm} cm` : "Not provided"],
    ["Pallet ready", listing.pallet_ready ? "Yes" : "Not stated"],
    ["Tail-lift", listing.tail_lift_required === false ? "Not required" : "Available / may be required"],
  ]

  return (
    <main className="app-bg min-h-screen pb-10 text-white">
      {editListingPanel}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Image Gallery */}
        <div className="w-full overflow-hidden rounded-b-[2rem] border border-white/10 bg-[#001B35] shadow-2xl shadow-black/30 sm:mt-4 sm:rounded-[2rem]">
          <div className="relative mx-auto flex h-[52vh] max-h-[620px] min-h-[360px] w-full items-center justify-center bg-[#001B35] p-3 sm:h-[560px] sm:p-5">
            {activeImage ? (
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-3xl bg-black/20">
                <img
                  src={activeImage}
                  alt={listing.title || "CaterBids listing image"}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-slate-400">
                <Tag className="h-12 w-12 text-white/20" />
                No image available
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#001633]/65 via-transparent to-black/20" />

            {/* Top Actions */}
            <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="soft-button flex h-11 w-11 items-center justify-center rounded-2xl bg-black/35 backdrop-blur-md"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListingFavourite}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl backdrop-blur-md transition-all ${
                  liked ? "bg-red-500/80" : "soft-button bg-black/35"
                }`}
              >
                <Heart className={`h-5 w-5 ${liked ? "fill-white" : ""}`} />
              </button>
              <button type="button" className="soft-button flex h-11 w-11 items-center justify-center rounded-2xl bg-black/35 backdrop-blur-md">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>

            <div className="absolute bottom-4 left-4 sm:left-6">
              <span className="premium-button rounded-2xl px-4 py-2 text-lg font-black text-white">
                {formatPrice(listing.price)}
              </span>
            </div>

            {listingImages.length > 0 && (
              <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                {Math.max(1, listingImages.indexOf(activeImage) + 1)} / {listingImages.length}
              </div>
            )}
          </div>

          {listingImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto bg-[#001B35] px-4 py-3">
              {listingImages.map((img, index) => (
                <button
                  key={`${img}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border ${
                    activeImage === img ? "border-[#FF6B00]" : "border-white/20"
                  }`}
                >
                  <img
                    src={img}
                    alt={`Listing image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="relative z-10 mt-5 space-y-5 pb-10">
          {/* Title & Meta */}
          <div className="premium-shell rounded-[2rem] p-5 sm:p-6">
            <h1 className="text-2xl font-black leading-tight sm:text-3xl">{listing.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                <MapPin className="h-3 w-3" /> {listing.city || listing.location || "UK"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                <Tag className="h-3 w-3" /> {listing.category}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                <Shield className="h-3 w-3" /> {listing.condition}
              </span>
              {trustBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 rounded-full border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-3 py-1 text-xs font-bold text-orange-100"
                >
                  <Shield className="h-3 w-3" /> {badge}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-white/50">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'Listed recently'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" /> 1 view
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/45">Price</p>
                  <p className="mt-1 text-lg font-black text-[#FF6B00]">{formatPrice(listing.price)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/45">Delivery</p>
                  <p className="mt-1 font-black text-white">{usesCaterBidsDelivery ? "Available" : "Collection"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/45">Condition</p>
                  <p className="mt-1 font-black text-white">{listing.condition || "Used"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/45">Seller</p>
                  <p className="mt-1 font-black text-white">{listing.seller_contact_name || "CaterBids seller"}</p>
                </div>
              </div>
              {!isListingOwner && !isSoldListing && (
                <button
                  type="button"
                  onClick={messageSeller}
                  disabled={openingMessage}
                  className="premium-button rounded-2xl px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {openingMessage ? "Opening..." : "Contact seller"}
                </button>
              )}
            </div>
          </div>

          {/* Listing status */}
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
            isSoldListing
              ? "border-red-500/25 bg-red-500/10"
              : "border-green-500/20 bg-green-500/10"
          }`}>
            <div className="relative flex h-3 w-3">
              {!isSoldListing && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              )}
              <span className={`relative inline-flex h-3 w-3 rounded-full ${isSoldListing ? "bg-red-400" : "bg-green-500"}`} />
            </div>
            <span className={`text-sm font-medium ${isSoldListing ? "text-red-200" : "text-green-400"}`}>
              {isSoldListing ? "Sold - this listing is no longer available" : isListingOwner ? "Your listing is live" : "This listing is live"}
            </span>
          </div>

          {isListingOwner && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => startEditing(listing)}
                className="soft-button flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold"
              >
                <Pencil className="h-4 w-4" />
                Edit Listing
              </button>
              <button
                type="button"
                onClick={() => deleteListing(listing)}
                className="soft-button flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-red-200"
              >
                <Trash2 className="h-4 w-4" />
                Delete Listing
              </button>
            </div>
          )}

          {editError && !isListingOwner && (
            <p className="rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-4 py-3 text-sm font-bold text-orange-100">
              {editError}
            </p>
          )}

          {/* Description */}
          <details className="premium-card rounded-3xl p-5">
            <summary className="cursor-pointer list-none text-sm font-black uppercase tracking-wider text-white/70">
              Description
            </summary>
            <p className="mt-3 whitespace-pre-line text-base leading-7 text-white/82">
              {listing.description || ''}
            </p>
          </details>

          {/* Trade Checks */}
          <details className="premium-card rounded-3xl p-5">
            <summary className="cursor-pointer list-none text-sm font-black uppercase tracking-wider text-white/70">
              Specs & checks
            </summary>
            <p className="mt-2 text-xs text-white/50">Specs, condition and paperwork.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {safetyRows.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-[#002E5D]/35 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">{label}</p>
                  <p className="mt-1 text-sm font-bold text-white/82">{value}</p>
                </div>
              ))}
            </div>
            <details className="mt-4 rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-3 text-xs text-orange-100">
              <summary className="cursor-pointer font-black">Safety note</summary>
              <p className="mt-2 leading-relaxed">{BUYER_WARNING}</p>
              <p className="mt-2 leading-relaxed text-orange-100/75">{SAFETY_DISCLAIMER}</p>
            </details>
          </details>

          <details className="premium-card rounded-3xl p-5">
            <summary className="cursor-pointer list-none text-sm font-black uppercase tracking-wider text-white/70">
              Delivery details
            </summary>
            {usesCaterBidsDelivery ? (
              <div className="mt-3 space-y-3">
                <p className="text-lg font-black text-white">Delivery available</p>
                <p className="text-sm text-white/65">
                  {listing.delivery_details_confirmed
                    ? "Pallet details confirmed."
                    : "Pallet details need checking."}
                </p>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="font-black uppercase text-white/40">Pallets</p>
                    <p className="mt-1 font-bold text-white">{listing.pallet_count || 1}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="font-black uppercase text-white/40">Weight</p>
                    <p className="mt-1 font-bold text-white">{listingWeightKg ? `${listingWeightKg} kg` : "Not confirmed"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="font-black uppercase text-white/40">Dimensions</p>
                    <p className="mt-1 font-bold text-white">
                      {listingLengthCm && listingWidthCm && listingHeightCm
                        ? `${listingLengthCm} x ${listingWidthCm} x ${listingHeightCm} cm`
                        : "Not confirmed"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="font-black uppercase text-white/40">Collection postcode</p>
                    <p className="mt-1 font-bold text-white">
                      {fullCollectionPostcode || "Collection postcode not provided"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-lg font-black text-white">Collection only</p>
            )}
          </details>

          {!isSoldListing && hasDeliveryOption && (
            <DeliveryQuoteBox
              listingId={safeListingId(listing.id)}
              collectionPostcode={fullCollectionPostcode}
              weightKg={listingWeightKg}
              lengthCm={listingLengthCm}
              widthCm={listingWidthCm}
              heightCm={listingHeightCm}
              palletReady={listing.pallet_ready}
              tailLiftRequired={listing.tail_lift_required}
              palletCount={listing.pallet_count}
              insuranceValue={listing.insurance_value}
              deliveryAvailable={hasDeliveryOption}
              onSelectDelivery={setSelectedDelivery}
            />
          )}

          {!isSoldListing && !hasDeliveryOption && !deliveryExplicitlyDisabled && !hasDeliveryMeasurements && (
            <div className="premium-card rounded-3xl border-[#FF6B00]/25 p-5">
              <h3 className="text-xl font-black text-white">Delivery pending</h3>
              <p className="mt-2 text-sm text-white/65">Weight and size are not confirmed yet.</p>
              <p className="mt-3 rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-3 text-xs font-bold text-orange-100">
                Contact seller for delivery details.
              </p>
            </div>
          )}

          {!isSoldListing ? (
            <BuyCheckoutBox
              listingId={safeListingId(listing.id)}
              sellerId={checkoutSellerId}
              title={listing.title}
              price={listingPriceNumber(listing.price)}
              selectedDelivery={selectedDelivery}
              deliveryAvailable={hasDeliveryOption}
              onMessageSeller={messageSeller}
            />
          ) : (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
              <h3 className="text-xl font-black text-red-100">This item has sold</h3>
              <p className="mt-2 text-sm text-red-100/75">
                Checkout and delivery options are closed for this listing.
              </p>
            </div>
          )}

          {showCaterBotSource && (
            <details className="premium-card rounded-3xl border-[#FF6B00]/25 p-5">
              <summary className="cursor-pointer list-none text-sm font-black uppercase tracking-wider text-white/70">
                Manuals & AI notes
              </summary>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-black text-white">Seller-confirmed source.</p>
                <p className="mt-1 text-xs text-white/55">
                  {manualSourceName}
                  {specConfidence ? ` · CaterBot spec confidence: ${specConfidence}` : ""}
                  {" · Seller checked"}
                </p>
                <a
                  href={manualSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white"
                >
                  Open manual/spec source
                </a>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/55">
                Check specs before purchase.
              </p>
            </details>
          )}

          {/* Buyer Checklist */}
          <details className="premium-card rounded-3xl p-5">
            <summary className="cursor-pointer list-none text-sm font-black uppercase tracking-wider text-white/70">
              More details
            </summary>
            <h3 className="mt-3 flex items-center gap-2 text-sm font-bold">
              <Shield className="h-4 w-4 text-[#FF6B00]" />
              Buyer checks: {buyerChecklist.label}
            </h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/65">
              {buyerChecklist.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6B00]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </details>

          {/* CTA */}
          {messageError && (
            <p className="rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200">
              {messageError}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={messageSeller}
              disabled={openingMessage}
              className="premium-button flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MessageCircle className="h-5 w-5" />
              {openingMessage ? "Opening..." : "Contact seller"}
            </button>
            <button className="soft-button flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold">
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function ListingPage() {
  return (
    <Suspense
      fallback={
        <div className="app-bg flex min-h-screen items-center justify-center text-white">
          <div className="animate-pulse text-white/50">Loading...</div>
        </div>
      }
    >
      <ListingContent />
    </Suspense>
  )
}
