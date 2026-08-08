"use client"

import Image from "next/image"
import Link from "next/link"
import SiteLogo from "@/components/SiteLogo"
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth'
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  MapPin,
  Tag,
  Shield,
  Clock,
  MessageCircle,
  Share2,
  Heart,
  AlertTriangle,
  Eye,
  Info,
  Mail,
  Package,
  Plus,
  Pencil,
  Star,
  Trash2,
  Truck,
  UserCircle2,
  Zap,
  X,
} from "lucide-react"

import DeliveryQuoteBox from "@/components/DeliveryQuoteBox"
import BuyCheckoutBox from "@/components/BuyCheckoutBox"
import SellerTrustCard from "@/components/trust/SellerTrustCard"
import SocialShareButtons from "@/components/social/SocialShareButtons"
import SellerSocialLinks, { type SellerSocialLinksValue } from "@/components/social/SellerSocialLinks"
import FeaturedBoostButton from "@/components/FeaturedBoostButton"
import FoundingMemberBadge from "@/components/FoundingMemberBadge"
import SellerReviewsList from "@/components/SellerReviewsList"
import { isFeaturedAndActive } from "@/lib/featured"
import type { DeliveryQuote } from "@/components/DeliveryQuoteBox"
import type { Database } from '@/types/supabase'
import { formatUKDate } from "@/lib/trust/badges"
import { CATEGORY_OPTIONS, categoryByTitle, subcategoriesForCategory } from "@/lib/categories"
import { sellerDeleteListing } from "@/app/account/listings/listing-actions"
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
type SellerProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  | 'verified'
  | 'email_verified'
  | 'phone_verified'
  | 'badge'
  | 'seller_verification_level'
  | 'business_verified'
  | 'government_id_verified'
  | 'stripe_connect_onboarding_complete'
  | 'is_founding_member'
  | 'created_at'
  | 'name'
  | 'full_name'
  | 'business'
> & {
  social_links?: SellerSocialLinksValue | null
}
type SellerReviewStats = {
  reviewCount: number
  averageRating: number
  completedSales: number
  responseRate: number
  averageResponseHours: number
  disputeCount: number
}
type OptionalProfileRow = Database['public']['Tables']['profiles']['Row'] & {
  is_email_verified?: boolean | null
  is_phone_verified?: boolean | null
  verified_user_badge?: boolean | null
  full_name?: string | null
  social_links?: SellerSocialLinksValue | null
  stripe_connect_onboarding_complete?: boolean | null
}
type SellerReviewStatsRow = {
  review_count?: number | string | null
  average_rating?: number | string | null
}
type SellerReviewRow = Database["public"]["Tables"]["seller_reviews"]["Row"]
type EquipmentSpec = Database['public']['Tables']['EquipmentSpecs']['Row']
type ListingEquipmentSpec = Database['public']['Tables']['listing_equipment_specs']['Row'] & {
  EquipmentSpecs?: EquipmentSpec | null
}
type CaterBotEquipmentSpec = {
  id: string
  listing_id: string | null
  brand: string | null
  model: string | null
  equipment_type: string | null
  height_cm: number | null
  width_cm: number | null
  depth_cm: number | null
  net_weight_kg: number | null
  gross_weight_kg: number | null
  capacity_litres: number | null
  power_type: string | null
  voltage: string | null
  phase: string | null
  watts: number | null
  amps: number | null
  refrigerant: string | null
  pallet_required: boolean | null
  suggested_pallet_size: string | null
  source_url: string | null
  source_title: string | null
  source_type: string | null
  confidence_score: number | null
  checked_at: string | null
}

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

function copyTextFallback(value: string) {
  try {
    const input = document.createElement("textarea")
    input.value = value
    input.setAttribute("readonly", "true")
    input.style.position = "fixed"
    input.style.left = "-9999px"
    document.body.appendChild(input)
    input.select()
    document.execCommand("copy")
    document.body.removeChild(input)
    return true
  } catch {
    return false
  }
}

function listingImageUrls(item: Partial<Listing> | null | undefined) {
  const images = Array.isArray(item?.images)
    ? item.images.filter((url): url is string => typeof url === "string" && Boolean(url))
    : []
  return images.length > 0 ? images : item?.image_url ? [item.image_url] : []
}

function cleanSellerDisplayName(value?: string | null) {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  if (!text) return ""
  if (/^caterbids(?:uk)?\s+seller$/i.test(text)) return ""
  if (/^seller$/i.test(text)) return ""
  return text
}

function publicSellerDisplayName(profile: SellerProfile | null, item: Listing | null) {
  return (
    cleanSellerDisplayName(profile?.business) ||
    cleanSellerDisplayName(profile?.name) ||
    cleanSellerDisplayName(profile?.full_name) ||
    cleanSellerDisplayName(item?.seller_contact_name) ||
    "Private seller"
  )
}

function outwardPostcode(value?: string | null) {
  const text = String(value || "").trim().toUpperCase()
  if (!text) return ""
  return text.split(/\s+/)[0] || text
}

function publicListingLocation(item: Listing) {
  return (
    String(item.city || "").trim() ||
    String(item.location || "").trim() ||
    outwardPostcode(item.collection_postcode) ||
    "UK"
  )
}

function supportedViewCount(item: Listing) {
  const candidate = (item as unknown as { view_count?: unknown; views?: unknown }).view_count ??
    (item as unknown as { view_count?: unknown; views?: unknown }).views
  const value = Number(candidate)
  return Number.isFinite(value) && value > 0 ? value : null
}

function formatPalletSize(value: string | null | undefined): string {
  const map: Record<string, string> = {
    // new slug values
    mini_quarter: "Mini Quarter Pallet",
    quarter: "Quarter Pallet",
    half: "Half Pallet",
    light: "Light Pallet",
    full: "Full Pallet",
    custom: "Custom / Oversized",
    // old capitalised values (existing listings)
    "Mini Quarter": "Mini Quarter Pallet",
    "Quarter": "Quarter Pallet",
    "Half": "Half Pallet",
    "Light": "Light Pallet",
    "Full": "Full Pallet",
  }
  return value ? (map[value] ?? value) : "Not confirmed"
}

function listingStatusCopy(status?: string | null) {
  const normalised = String(status || "").toLowerCase()
  if (normalised === "sold") {
    return {
      title: "Item marked as sold",
      text: "This listing is no longer available to new buyers.",
      tone: "red",
    }
  }
  if (normalised === "draft") {
    return {
      title: "Draft listing",
      text: "Complete and publish your listing when ready.",
      tone: "amber",
    }
  }
  if (normalised === "pending" || normalised === "pending_review") {
    return {
      title: "Listing pending review",
      text: "Your listing will appear to buyers once approved.",
      tone: "amber",
    }
  }
  if (normalised === "removed" || normalised === "archived") {
    return {
      title: "Listing hidden from buyers",
      text: "This listing is not currently visible on the marketplace.",
      tone: "red",
    }
  }
  return {
    title: "Your listing is live",
    text: "Your listing is visible to buyers.",
    tone: "green",
  }
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
  const [showFeaturedSuccess, setShowFeaturedSuccess] = useState(params.get("featured") === "success")

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
  const [editingEquipmentType, setEditingEquipmentType] = useState("")
  const [editError, setEditError] = useState("")
  const [messageError, setMessageError] = useState("")
  const [openingMessage, setOpeningMessage] = useState(false)
  const [verifiedSpec, setVerifiedSpec] = useState<ListingEquipmentSpec | null>(null)
  const [caterBotEquipmentSpec, setCaterBotEquipmentSpec] = useState<CaterBotEquipmentSpec | null>(null)
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null)
  const [sellerReviewStats, setSellerReviewStats] = useState<SellerReviewStats>({
    reviewCount: 0,
    averageRating: 0,
    completedSales: 0,
    responseRate: 0,
    averageResponseHours: 0,
    disputeCount: 0,
  })
  const [sellerReviews, setSellerReviews] = useState<SellerReviewRow[]>([])
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [specReportSent, setSpecReportSent] = useState(false)

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
    setEditingEquipmentType(item.equipment_type || "")
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
    const editedDeliveryOption = (formData.get("delivery_option") as string) || "Collection Only"
    const editedUsesPalletDelivery = /pallet/i.test(editedDeliveryOption)
    const updatedListing: Listing = {
      ...editingListing,
      title: ((formData.get("title") as string) || "").trim(),
      price: formatPrice(formData.get("price") as string),
      location: ((formData.get("location") as string) || "").trim(),
      city: ((formData.get("city") as string) || "").trim() || null,
      category: (formData.get("category") as string) || "Catering Equipment",
      subcategory: (formData.get("subcategory") as string) || null,
      equipment_type: (formData.get("equipment_type") as string) || null,
      condition: (formData.get("condition") as string) || "Used",
      power_type: (formData.get("power_type") as string) || "Unknown",
      dimensions: ((formData.get("dimensions") as string) || "").trim() || null,
      service_history: ((formData.get("service_history") as string) || "").trim() || null,
      warranty_type: (formData.get("warranty_type") as string) || "No warranty",
      manuals_available: formData.get("manuals_available") === "on",
      tested_status: (formData.get("tested_status") as string) || "Untested",
      delivery_option: editedUsesPalletDelivery ? "CaterBids Pallet Delivery" : "Collection Only",
      collection_postcode: editedUsesPalletDelivery ? ((formData.get("collection_postcode") as string) || "").trim() || null : null,
      vat_included: formData.get("vat_included") === "on",
      weight_kg: optionalNumber(formData.get("weight_kg")),
      length_cm: optionalNumber(formData.get("length_cm")),
      width_cm: optionalNumber(formData.get("width_cm")),
      height_cm: optionalNumber(formData.get("height_cm")),
      pallet_ready: editedUsesPalletDelivery ? formData.get("pallet_ready") === "on" : false,
      tail_lift_required: editedUsesPalletDelivery ? formData.get("tail_lift_required") === "on" : false,
      forklift_available: editedUsesPalletDelivery ? formData.get("forklift_available") === "on" : false,
      ground_floor_collection: editedUsesPalletDelivery ? formData.get("ground_floor_collection") === "on" : false,
      commercial_premises: editedUsesPalletDelivery ? formData.get("commercial_premises") === "on" : false,
      delivery_available: editedUsesPalletDelivery,
      caterbids_delivery_available: editedUsesPalletDelivery,
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
        equipment_type: updatedListing.equipment_type,
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

  // Redirect DB-backed listings to the full edit page.
  // Local-only listings (not yet in DB) fall back to the inline modal.
  function handleEdit(item: Listing) {
    const itemId = safeListingId(item.id)
    if (!itemId || itemId.startsWith("local-") || readLocalListing(itemId)) {
      startEditing(item)
      return
    }
    router.push(`/account/listings/${itemId}/edit`)
  }

  async function deleteListing(item: Listing) {
    const confirmed = window.confirm(
      "This will remove your listing from the site. Buyers will no longer be able to find it. This cannot be undone by you. Continue?"
    )
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

    // Soft delete via server action — sets status = 'deleted', never removes the row
    const result = await sellerDeleteListing(itemId)
    if (!result.success) {
      setEditError(result.error)
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
        .neq('status', 'deleted')
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

  useEffect(() => {
    async function fetchVerifiedSpecs() {
      const listingId = safeListingId(listing?.id || id)
      if (!listingId) {
        setVerifiedSpec(null)
        setCaterBotEquipmentSpec(null)
        return
      }

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("listing_equipment_specs")
          .select("*, EquipmentSpecs(*)")
          .eq("listing_id", listingId)
          .maybeSingle()

        if (error) {
          console.warn("Verified specs unavailable:", error.message || error)
          setVerifiedSpec(null)
        } else {
          setVerifiedSpec((data as ListingEquipmentSpec | null) || null)
        }
      } catch (error) {
        console.warn("Verified specs unavailable:", error)
        setVerifiedSpec(null)
      }

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("equipment_specs")
          .select("*")
          .eq("listing_id", listingId)
          .order("confidence_score", { ascending: false })
          .order("checked_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.warn("CaterBot specs unavailable:", error.message || error)
          setCaterBotEquipmentSpec(null)
          return
        }

        setCaterBotEquipmentSpec((data as CaterBotEquipmentSpec | null) || null)
      } catch (error) {
        console.warn("CaterBot specs unavailable:", error)
        setCaterBotEquipmentSpec(null)
      }
    }

    fetchVerifiedSpecs()
  }, [id, listing])

  useEffect(() => {
    async function fetchSellerProfile() {
      const sellerId = safeListingId(listing?.seller_id || listing?.user_id)
      if (!sellerId || sellerId === "local") {
        setSellerProfile(null)
        return
      }

      try {
        const supabase = createClient()
        let publicProfileResult = await supabase
          .from("seller_public_profiles" as "profiles")
          .select("verified,email_verified,is_email_verified,phone_verified,is_phone_verified,verified_user_badge,seller_verification_level,business_verified,government_id_verified,stripe_connect_onboarding_complete,is_founding_member,created_at,name,full_name,business,social_links")
          .eq("id", sellerId)
          .maybeSingle()

        if (publicProfileResult.error) {
          const msg = publicProfileResult.error.message || ""
          if (/full_name|social_links|schema cache/i.test(msg)) {
            publicProfileResult = await supabase
              .from("seller_public_profiles" as "profiles")
              .select("verified,email_verified,is_email_verified,phone_verified,is_phone_verified,verified_user_badge,seller_verification_level,business_verified,government_id_verified,stripe_connect_onboarding_complete,created_at,name,business")
              .eq("id", sellerId)
              .maybeSingle()
          } else {
            console.error("seller_public_profiles query failed — view may be missing a column:", publicProfileResult.error)
          }
        }

        if (!publicProfileResult.error) {
          const publicProfile = publicProfileResult.data as OptionalProfileRow | null
          setSellerProfile(
            publicProfile
              ? {
                  ...publicProfile,
                  badge: publicProfile.verified_user_badge ||
                    publicProfile.is_email_verified ||
                    publicProfile.email_verified ||
                    publicProfile.verified
                    ? "Verified User"
                    : "Email pending",
                }
              : null
          )
          return
        }

        let fallback = await supabase
          .from("profiles")
          .select("verified,email_verified,phone_verified,badge,seller_verification_level,business_verified,government_id_verified,stripe_connect_onboarding_complete,is_founding_member,created_at,name,full_name,business,social_links")
          .eq("id", sellerId)
          .maybeSingle()

        if (fallback.error && /social_links|schema cache|column|does not exist/i.test(fallback.error.message || "")) {
          fallback = await supabase
            .from("profiles")
            .select("verified,email_verified,phone_verified,badge,seller_verification_level,business_verified,government_id_verified,stripe_connect_onboarding_complete,is_founding_member,created_at,name,full_name,business")
            .eq("id", sellerId)
            .maybeSingle()
        }

        const fallbackProfile = fallback.data as OptionalProfileRow | null
        setSellerProfile(
          fallbackProfile
            ? ({
                verified: Boolean(fallbackProfile.verified),
                email_verified: Boolean(fallbackProfile.email_verified || fallbackProfile.verified),
                phone_verified: Boolean(fallbackProfile.phone_verified),
                badge: fallbackProfile.badge || (fallbackProfile.verified ? "Verified User" : "Email pending"),
                seller_verification_level: fallbackProfile.seller_verification_level || "unverified",
                business_verified: Boolean(fallbackProfile.business_verified),
                government_id_verified: Boolean(fallbackProfile.government_id_verified),
                stripe_connect_onboarding_complete: Boolean(fallbackProfile.stripe_connect_onboarding_complete),
                is_founding_member: Boolean((fallbackProfile as any).is_founding_member),
                created_at: fallbackProfile.created_at || null,
                name: fallbackProfile.name || null,
                full_name: fallbackProfile.full_name || null,
                business: fallbackProfile.business || null,
                social_links: fallbackProfile.social_links || null,
              } as SellerProfile)
            : null
        )
      } catch (error) {
        console.warn("Seller profile badge unavailable:", error)
        setSellerProfile(null)
      }
    }

    fetchSellerProfile()
  }, [listing?.seller_id, listing?.user_id])

  useEffect(() => {
    async function fetchSellerTrustStats() {
      const sellerId = safeListingId(listing?.seller_id || listing?.user_id)
      if (!sellerId || sellerId === "local") {
        setSellerReviewStats({
          reviewCount: 0,
          averageRating: 0,
          completedSales: 0,
          responseRate: 0,
          averageResponseHours: 0,
          disputeCount: 0,
        })
        return
      }

      try {
        const supabase = createClient()
        const [{ data: reviewStats }, { count: completedSales }] = await Promise.all([
          supabase
            .from("seller_review_stats")
            .select("review_count,average_rating")
            .eq("seller_id", sellerId)
            .maybeSingle(),
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("seller_id", sellerId)
            .or("payment_status.eq.paid,order_status.eq.paid,order_status.eq.delivered,delivery_status.eq.delivered"),
        ])

        const reviewStatsRow = reviewStats as SellerReviewStatsRow | null
        setSellerReviewStats({
          reviewCount: Number(reviewStatsRow?.review_count || 0),
          averageRating: Number(reviewStatsRow?.average_rating || 0),
          completedSales: completedSales || 0,
          responseRate: 0,
          averageResponseHours: 0,
          disputeCount: 0,
        })

        try {
          const reviewsRes = await fetch(`/api/reviews?sellerId=${encodeURIComponent(sellerId)}`)
          if (reviewsRes.ok) {
            const reviewsData = await reviewsRes.json()
            setSellerReviews(Array.isArray(reviewsData.reviews) ? reviewsData.reviews : [])
          }
        } catch {
          // individual reviews are non-critical
        }
      } catch (error) {
        console.warn("Seller trust stats unavailable:", error)
        setSellerReviewStats({
          reviewCount: 0,
          averageRating: 0,
          completedSales: 0,
          responseRate: 0,
          averageResponseHours: 0,
          disputeCount: 0,
        })
      }
    }

    fetchSellerTrustStats()
  }, [listing?.seller_id, listing?.user_id])

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
            onChange={(event) => {
              setEditingSubcategory(event.target.value)
              setEditingEquipmentType("")
            }}
            className="premium-input mb-3 w-full rounded-2xl p-3"
          >
            {subcategoriesForCategory(editingCategory).map((subcategory) => (
              <option key={subcategory} className="text-black">
                {subcategory}
              </option>
            ))}
          </select>
        )}
        {(() => {
          const level3 = categoryByTitle(editingSubcategory)?.subcategories ?? []
          return level3.length > 0 ? (
            <select
              name="equipment_type"
              value={editingEquipmentType}
              onChange={(e) => setEditingEquipmentType(e.target.value)}
              className="premium-input mb-3 w-full rounded-2xl p-3"
            >
              <option value="" className="text-black">— Subcategory (optional) —</option>
              {level3.map((item) => (
                <option key={item} className="text-black">{item}</option>
              ))}
            </select>
          ) : null
        })()}
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
          <p className="mb-3 text-sm font-black text-[#FF6B00]">CaterBids Pallet Delivery setup</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80">
              <input name="delivery_available" type="checkbox" defaultChecked={Boolean(editingListing.caterbids_delivery_available)} className="h-4 w-4 accent-[#FF6B00]" />
              CaterBids Pallet Delivery available
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
              onClick={() => router.push("/post-listing/start")}
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
                  onClick={() => router.push("/post-listing/start")}
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

                  <div className="px-3 pb-3">
                    <SocialShareButtons
                      listingId={itemId}
                      title={item.title || "CaterBidsUK listing"}
                      price={formatPrice(item.price)}
                      location={item.city || item.location || "UK"}
                      url={`/listing?id=${encodeURIComponent(itemId)}`}
                      compact
                    />
                  </div>

                  <div className="flex gap-2 border-t border-white/10 p-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
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
  const publicLocation = publicListingLocation(listing)
  const viewCount = supportedViewCount(listing)
  const buyerChecklist = buyerChecklistForListing(listing)
  const trustBadges = trustBadgesForListing(listing)
  const deliveryOptionText = (listing.delivery_option || "").toLowerCase()
  const usesCaterBidsDelivery =
    Boolean(listing.caterbids_delivery_available && deliveryOptionText.includes("pallet")) ||
    Boolean(listing.delivery_available && deliveryOptionText.includes("pallet"))
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
    ((listing as any).collection_enabled === true ||
      (listing as any).buyer_arranges_enabled === true ||
      listing.delivery_available === false ||
      deliveryOptionText.includes("buyer arranges transport")
    )
  const hasDeliveryOption =
    usesCaterBidsDelivery &&
    hasDeliveryMeasurements &&
    (listing.delivery_available === true ||
      usesCaterBidsDelivery ||
      deliveryOptionText.includes("pallet"))
  const isListingOwner = userOwnsListing(listing)
  const isSoldListing = listing.status === "sold"
  const ownerStatus = listingStatusCopy(listing.status)
  const deliveryStatusText = usesCaterBidsDelivery
    ? "CaterBids Pallet Delivery Available"
    : deliveryExplicitlyDisabled
      ? "Collection only"
      : "Check with seller"
  const manualSourceUrl = listing.manual_source_url || listing.spec_source_url || ""
  const manualSourceName = listing.manual_source_name || "Verified manual/spec source"
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
  const sellerTrustProfile = sellerProfile as (SellerProfile & {
    is_email_verified?: boolean | null
    is_phone_verified?: boolean | null
    verified_user_badge?: boolean | null
  }) | null
  const sellerEmailVerified = Boolean(
    sellerProfile?.email_verified ||
      sellerProfile?.verified ||
      sellerTrustProfile?.is_email_verified ||
      sellerTrustProfile?.verified_user_badge
  )
  const sellerTrustBadge = sellerEmailVerified ? sellerProfile?.badge || "Verified User" : ""
  const sellerVerificationBadge =
    sellerProfile?.seller_verification_level === "verified" ||
    sellerProfile?.seller_verification_level === "business_verified" ||
    sellerProfile?.business_verified ||
    sellerProfile?.government_id_verified
      ? "Verified Seller"
      : ""
  const sellerFullyVerified = Boolean(sellerVerificationBadge)
  const sellerDisplayName = publicSellerDisplayName(sellerProfile, listing)
  const sellerTrustInput = {
    emailVerified: sellerEmailVerified,
    phoneVerified: Boolean(sellerProfile?.phone_verified || sellerTrustProfile?.is_phone_verified),
    idVerified: Boolean(sellerProfile?.government_id_verified),
    businessVerified: Boolean(sellerProfile?.business_verified),
    stripeConnected: Boolean(sellerProfile?.stripe_connect_onboarding_complete),
    completedSales: sellerReviewStats.completedSales,
    averageRating: sellerReviewStats.averageRating,
    reviewCount: sellerReviewStats.reviewCount,
    responseRate: sellerReviewStats.responseRate,
    averageResponseHours: sellerReviewStats.averageResponseHours,
    disputeCount: sellerReviewStats.disputeCount,
  }
  const checkoutSellerId = isUuid(safeListingId(listing.seller_id || listing.user_id))
    ? safeListingId(listing.seller_id || listing.user_id)
    : ""
  const fullCollectionPostcode = resolveFullUkPostcode(
    listing.collection_postcode,
    listing.collection_full_address,
    listing.location
  )
  const publicCollectionArea = publicLocation || outwardPostcode(listing.collection_postcode) || "Not provided"
  const safetyRows = [
    ["Condition", valueOrNotProvided(listing.condition)],
    ["Tested status", valueOrNotProvided(listing.tested_status)],
    ["Warranty", valueOrNotProvided(listing.warranty_type)],
    ["Power type", valueOrNotProvided(listing.power_type)],
    ["Dimensions", valueOrNotProvided(listing.dimensions)],
    ["Service history", valueOrNotProvided(listing.service_history)],
    ["Manuals", listing.manuals_available ? "Available" : "Not provided"],
    ["VAT", listing.vat_included ? "Included" : "Not stated"],
    ["Delivery", usesCaterBidsDelivery ? "CaterBids Pallet Delivery Available" : "Collection only"],
    ["Collection area", publicCollectionArea],
    ["Pallet size", usesCaterBidsDelivery ? formatPalletSize((listing as any).pallet_size) : "Not required"],
    ["Weight", listingWeightKg ? `${listingWeightKg} kg` : "Not provided"],
    ["Package size", listingLengthCm && listingWidthCm && listingHeightCm ? `${listingLengthCm} x ${listingWidthCm} x ${listingHeightCm} cm` : "Not provided"],
    ["Pallet ready", listing.pallet_ready ? "Yes" : "Not stated"],
    ["Tail-lift", listing.tail_lift_required === false ? "Not required" : "Available / may be required"],
  ]
  const legacySpec = verifiedSpec?.EquipmentSpecs || null
  const sourceBackedSpec = legacySpec || caterBotEquipmentSpec
  const sourceBackedSpecConfidence = legacySpec?.confidence ?? caterBotEquipmentSpec?.confidence_score ?? 0
  const sourceBackedSpecSourceUrl = legacySpec?.source_url || caterBotEquipmentSpec?.source_url || ""
  const sourceBackedSpecSourceName =
    legacySpec?.source_name ||
    caterBotEquipmentSpec?.source_title ||
    [caterBotEquipmentSpec?.brand, caterBotEquipmentSpec?.model].filter(Boolean).join(" ") ||
    "Source not provided"
  const showVerifiedSpecs =
    Boolean(
      showCaterBotSource &&
        sourceBackedSpec &&
        ((verifiedSpec && legacySpec && verifiedSpec.verification_status === "verified") || caterBotEquipmentSpec)
    )
  const specRows = sourceBackedSpec
    ? [
        [
          "Dimensions",
          (legacySpec?.ext_height_cm || caterBotEquipmentSpec?.height_cm) &&
          (legacySpec?.ext_width_cm || caterBotEquipmentSpec?.width_cm) &&
          (legacySpec?.ext_depth_cm || caterBotEquipmentSpec?.depth_cm)
            ? `${legacySpec?.ext_height_cm || caterBotEquipmentSpec?.height_cm} x ${legacySpec?.ext_width_cm || caterBotEquipmentSpec?.width_cm} x ${legacySpec?.ext_depth_cm || caterBotEquipmentSpec?.depth_cm} cm`
            : "Not confirmed",
        ],
        ["Net weight", (legacySpec?.weight_net_kg || caterBotEquipmentSpec?.net_weight_kg) ? `${legacySpec?.weight_net_kg || caterBotEquipmentSpec?.net_weight_kg} kg` : "Not confirmed"],
        ["Packed weight", (legacySpec?.weight_gross_kg || caterBotEquipmentSpec?.gross_weight_kg) ? `${legacySpec?.weight_gross_kg || caterBotEquipmentSpec?.gross_weight_kg} kg` : "Not confirmed"],
        ["Capacity", caterBotEquipmentSpec?.capacity_litres ? `${caterBotEquipmentSpec.capacity_litres} litres` : "Not confirmed"],
        [
          "Power / gas",
          [
            legacySpec?.power_type || caterBotEquipmentSpec?.power_type,
            legacySpec?.voltage || caterBotEquipmentSpec?.voltage,
            (legacySpec?.phase || caterBotEquipmentSpec?.phase) ? `${legacySpec?.phase || caterBotEquipmentSpec?.phase} phase` : "",
            (legacySpec?.current_a || caterBotEquipmentSpec?.amps) ? `${legacySpec?.current_a || caterBotEquipmentSpec?.amps}A` : "",
            caterBotEquipmentSpec?.watts ? `${caterBotEquipmentSpec.watts}W` : "",
            legacySpec?.gas_type,
            legacySpec?.gas_connection,
          ]
            .filter(Boolean)
            .join(" · ") || "Not confirmed",
        ],
        ["Refrigerant", caterBotEquipmentSpec?.refrigerant || "Not stated"],
        ["Pallet", (legacySpec?.pallet_required || caterBotEquipmentSpec?.pallet_required) ? "Required" : caterBotEquipmentSpec?.suggested_pallet_size || "Not stated"],
        ["Handling", legacySpec?.lifting_notes || verifiedSpec?.seller_forklift_required ? "Mechanical handling may be required" : "Not stated"],
        ["Hazards", legacySpec?.hazardous_notes || "Not stated"],
      ]
    : []

  async function quickShareListing() {
    const shareUrl = window.location.href
    const shareTitle = listing?.title || "CaterBidsUK listing"
    const shareText = `${shareTitle} on CaterBidsUK`

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
        return
      } catch {
        return
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setMessageError("Listing link copied.")
    } catch {
      if (copyTextFallback(shareUrl)) {
        setMessageError("Listing link copied.")
      } else {
        document.getElementById("listing-share-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }

  async function reportIncorrectSpecs() {
    if (!verifiedSpec) return
    setSpecReportSent(false)

    try {
      const res = await fetch("/api/equipment-specs/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentSpecId: verifiedSpec.equipment_spec_id,
          listingId: safeListingId(listing?.id || id),
          reason: "incorrect_specs",
        }),
      })

      if (!res.ok) throw new Error("Could not report specs")
      setSpecReportSent(true)
    } catch (error) {
      console.warn("Could not report specs:", error)
      setMessageError("Could not report specs. Please try again.")
    }
  }

  const ownerStatusClasses =
    ownerStatus.tone === "red"
      ? "border-red-400/25 bg-red-500/10 text-red-100"
      : ownerStatus.tone === "amber"
        ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
        : "border-green-400/25 bg-green-500/10 text-green-100"
  const activeImageIndex = listingImages.length > 0 ? Math.max(0, listingImages.indexOf(activeImage)) : 0
  const sellerJoinedDate = sellerProfile?.created_at || listing.created_at
  const canContactSeller = !isListingOwner && !isSoldListing

  if (safeListingId(listing.id) || id) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,107,0,0.12),_transparent_30%),linear-gradient(180deg,#001A35_0%,#002E5D_48%,#001A35_100%)] pb-28 text-white md:pb-12">
        {editListingPanel}

        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#001A35]/92 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white transition hover:border-[#FF6B00]/60"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <SiteLogo size="sm" priority />

            {/* Desktop nav — hidden on mobile (bottom nav handles mobile) */}
            <nav className="ml-auto hidden items-center gap-5 text-sm font-bold text-white/80 lg:flex" aria-label="Primary">
              <Link href="/marketplace" className="transition hover:text-[#FF6B00]">Marketplace</Link>
              <Link href="/post-listing/start" className="transition hover:text-[#FF6B00]">Sell</Link>
              <Link href={currentUserId ? "/account" : "/login"} className="transition hover:text-[#FF6B00]">Account</Link>
              <Link
                href="/post-listing/start"
                className="rounded-2xl bg-[#FF6B00] px-4 py-2.5 font-black text-white shadow-[0_8px_24px_rgba(255,107,0,0.28)] transition hover:brightness-110"
              >
                Start Free Listing
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListingFavourite}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                  liked
                    ? "border-red-400/40 bg-red-500/25 text-red-100"
                    : "border-white/15 bg-white/8 text-white hover:border-[#FF6B00]/60"
                }`}
                aria-label={liked ? "Remove saved listing" : "Save listing"}
              >
                <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
              </button>
              <button
                type="button"
                onClick={quickShareListing}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white transition hover:border-[#FF6B00]/60"
                aria-label="Share listing"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {showFeaturedSuccess && (
          <div className="w-full bg-gradient-to-r from-[#FF6B00] to-amber-500 px-4 py-5 shadow-[0_4px_28px_rgba(255,107,0,0.45)]">
            <div className="mx-auto flex max-w-6xl items-center gap-4 sm:px-6">
              <Star className="h-7 w-7 shrink-0 fill-white text-white" />
              <div className="flex-1 min-w-0">
                <p className="text-xl font-black text-white">Your listing is now Featured!</p>
                {(listing as any)?.featured_until && (
                  <p className="mt-0.5 text-sm font-bold text-white/85">
                    Featured until {new Date(String((listing as any).featured_until)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                <Link
                  href="/account"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-sm font-black text-white transition hover:bg-white/30"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to my listings
                </Link>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowFeaturedSuccess(false)
                  router.replace(`/listing?id=${encodeURIComponent(id || "")}`, { scroll: false })
                }}
                className="shrink-0 rounded-xl p-1.5 text-white/80 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="mx-auto grid max-w-6xl gap-6 overflow-hidden px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] lg:items-start lg:py-8">
          <section className="min-w-0 space-y-5">
            <div className="overflow-hidden rounded-[2rem] border border-white/12 bg-[#062747]/85 shadow-2xl shadow-black/25">
              <div className="relative flex aspect-[4/3] min-h-[330px] items-center justify-center bg-[#001A35] p-2 sm:aspect-[16/10] lg:min-h-[560px]">
                {activeImage ? (
                  <div className="h-full w-full overflow-hidden rounded-[1.6rem] bg-white/5">
                    <img
                      src={activeImage}
                      alt={listing.title || "CaterBidsUK listing image"}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-[1.6rem] border border-white/10 bg-white/5 text-white/55">
                    <Package className="h-14 w-14 text-white/25" />
                    <span className="text-sm font-bold">No image available</span>
                  </div>
                )}

                <div className="pointer-events-none absolute inset-x-2 bottom-2 h-28 rounded-b-[1.6rem] bg-gradient-to-t from-[#001A35]/90 to-transparent" />

                <div className="absolute bottom-5 left-5 rounded-2xl bg-[#FF6B00] px-4 py-3 text-2xl font-black text-white shadow-xl shadow-[#FF6B00]/25">
                  {formatPrice(listing.price)}
                </div>

                {listingImages.length > 0 && (
                  <div className="absolute bottom-5 right-5 rounded-2xl bg-[#001A35]/85 px-4 py-2 text-sm font-black text-white shadow-lg backdrop-blur">
                    {activeImageIndex + 1} / {listingImages.length}
                  </div>
                )}
              </div>

              {listingImages.length > 1 && (
                <div className="flex items-center justify-center gap-2 px-4 py-4">
                  {listingImages.map((img, index) => (
                    <button
                      key={`${img}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`h-3 w-3 rounded-full transition ${
                        activeImage === img ? "bg-[#FF6B00]" : "bg-white/25 hover:bg-white/45"
                      }`}
                      aria-label={`Show listing image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {listingImages.length > 1 && (
              <div className="hidden grid-cols-5 gap-3 lg:grid">
                {listingImages.slice(0, 5).map((img, index) => (
                  <button
                    key={`${img}-thumb-${index}`}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className={`overflow-hidden rounded-2xl border bg-white/5 p-1 ${
                      activeImage === img ? "border-[#FF6B00]" : "border-white/12"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Listing thumbnail ${index + 1}`}
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <section className="rounded-[2rem] border border-white/12 bg-[#062747]/85 p-5 shadow-2xl shadow-black/20 lg:hidden">
              <h1 className="text-2xl font-black leading-tight text-white">{listing.title}</h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/78">
                  <MapPin className="h-4 w-4 text-[#FF6B00]" />
                  {publicLocation}
                </span>
                {listing.category && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/78">
                    <Tag className="h-4 w-4 text-[#FF6B00]" />
                    {listing.category}
                  </span>
                )}
                {listing.subcategory && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/78">
                    <Tag className="h-4 w-4 text-white/45" />
                    {listing.subcategory}
                  </span>
                )}
                {listing.condition && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/78">
                    <Package className="h-4 w-4 text-white/70" />
                    {listing.condition}
                  </span>
                )}
                {listing.power_type && !/unknown/i.test(listing.power_type) && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-3 py-2 text-xs font-bold text-orange-100">
                    <Zap className="h-4 w-4 text-[#FF6B00]" />
                    {listing.power_type}
                  </span>
                )}
                {usesCaterBidsDelivery && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-3 py-2 text-xs font-bold text-orange-100">
                    <Truck className="h-4 w-4 text-white/80" />
                    Pallet delivery
                  </span>
                )}
                {sellerFullyVerified && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-green-400/25 bg-green-500/12 px-3 py-2 text-xs font-bold text-green-100">
                    <BadgeCheck className="h-4 w-4 text-green-300" />
                    Verified Seller
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-white/55">
                {listing.created_at && (
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Posted {formatUKDate(listing.created_at)}
                  </span>
                )}
                {viewCount !== null && (
                  <span className="inline-flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {viewCount} {viewCount === 1 ? "view" : "views"}
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-bold text-white/55">Price</p>
                  <p className="mt-1 text-xl font-black text-white">{formatPrice(listing.price)}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-bold text-white/55">Delivery</p>
                  <p className="mt-1 text-lg font-black text-white">{usesCaterBidsDelivery ? "Pallet" : "Collection"}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-bold text-white/55">Condition</p>
                  <p className="mt-1 text-lg font-black text-white">{listing.condition || "Not stated"}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-bold text-white/55">Seller</p>
                  <p className="mt-1 line-clamp-2 text-lg font-black text-white">{sellerDisplayName}</p>
                </div>
              </div>

              {(sellerReviewStats.reviewCount > 0 || sellerReviewStats.completedSales > 0 || sellerReviewStats.responseRate > 0) && (
                <div className="mt-5 grid gap-3 grid-cols-3">
                  {sellerReviewStats.reviewCount > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                      <Star className="h-5 w-5 text-[#FF6B00]" />
                      <p className="mt-2 text-lg font-black text-white">{sellerReviewStats.averageRating.toFixed(1)} / 5</p>
                      <p className="text-xs font-bold text-white/45">Seller rating</p>
                    </div>
                  )}
                  {sellerReviewStats.completedSales > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                      <Package className="h-5 w-5 text-[#FF6B00]" />
                      <p className="mt-2 text-lg font-black text-white">{sellerReviewStats.completedSales}</p>
                      <p className="text-xs font-bold text-white/45">Completed sales</p>
                    </div>
                  )}
                  {sellerReviewStats.responseRate > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                      <MessageCircle className="h-5 w-5 text-[#FF6B00]" />
                      <p className="mt-2 text-lg font-black text-white">{sellerReviewStats.responseRate}%</p>
                      <p className="text-xs font-bold text-white/45">Response rate</p>
                    </div>
                  )}
                </div>
              )}

              {sellerReviews.length > 0 && (
                <div className="mt-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.15em] text-white/45">
                    Buyer Reviews
                  </p>
                  <SellerReviewsList
                    reviews={sellerReviews.slice(0, showAllReviews ? undefined : 5)}
                  />
                  {sellerReviews.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllReviews((v) => !v)}
                      className="mt-3 w-full rounded-2xl border border-white/10 py-2 text-xs font-black text-white/50 transition hover:bg-white/5"
                    >
                      {showAllReviews ? "Show fewer" : `Show all ${sellerReviews.length} reviews`}
                    </button>
                  )}
                </div>
              )}

              {isListingOwner && !isSoldListing && (
                <div className="mt-5">
                  <FeaturedBoostButton
                    listingId={safeListingId(listing.id)}
                    isFeatured={Boolean((listing as any).featured || (listing as any).is_featured)}
                    featuredUntil={(listing as any).featured_until ?? null}
                  />
                </div>
              )}

              {canContactSeller && (
                <button
                  type="button"
                  onClick={messageSeller}
                  disabled={openingMessage}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-5 py-4 text-sm font-black text-white shadow-xl shadow-[#FF6B00]/20 disabled:opacity-60"
                >
                  <MessageCircle className="h-5 w-5" />
                  {openingMessage ? "Opening..." : "Contact seller"}
                </button>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/12 bg-[#062747]/85 p-4 shadow-xl shadow-black/15 sm:p-5 lg:hidden">
              <h2 className="text-lg font-black text-white">{isListingOwner ? "Promote listing" : "Share listing"}</h2>
              <div className="mt-4">
                <SocialShareButtons
                  listingId={safeListingId(listing.id || id)}
                  title={listing.title || "CaterBidsUK listing"}
                  price={formatPrice(listing.price)}
                  location={publicLocation}
                  heading={isListingOwner ? "Promote Listing" : "Share Listing"}
                  description={isListingOwner ? "Share this listing to get more views." : "Share this item with someone who may be interested."}
                  compact
                />
              </div>
            </section>

            <section className="space-y-3">
              <details className="group rounded-3xl border border-white/12 bg-[#062747]/85 p-4 shadow-lg shadow-black/10" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="flex items-center gap-3 text-lg font-black text-white">
                    <BookOpen className="h-5 w-5 text-white/75" />
                    Description
                  </span>
                  <ChevronDown className="h-5 w-5 text-white/55 transition group-open:rotate-180" />
                </summary>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/75">
                  {listing.description || "No description has been provided yet."}
                </p>
              </details>

              <details className="group rounded-3xl border border-white/12 bg-[#062747]/85 p-4 shadow-lg shadow-black/10">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="flex items-center gap-3 text-lg font-black text-white">
                    <CheckCircle2 className="h-5 w-5 text-white/75" />
                    Specs & Checks
                  </span>
                  <ChevronDown className="h-5 w-5 text-white/55 transition group-open:rotate-180" />
                </summary>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {safetyRows.map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">{label}</p>
                      <p className="mt-1 text-sm font-bold text-white/82">{value}</p>
                    </div>
                  ))}
                </div>

                {showVerifiedSpecs && sourceBackedSpec && (
                  <div className="mt-4 rounded-3xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF9A4A]">
                          CaterBot Specs
                        </p>
                        <h3 className="mt-1 text-lg font-black text-white">Source-backed equipment specs</h3>
                      </div>
                      <span className="rounded-full border border-green-400/25 bg-green-500/15 px-3 py-1 text-xs font-black text-green-200">
                        {sourceBackedSpecConfidence}% confidence
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {specRows.map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-white/10 bg-[#001A35]/45 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">{label}</p>
                          <p className="mt-1 text-sm font-bold text-white/82">{value}</p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-white/65">
                      Specs are for guidance only. Buyers should confirm details with the seller before purchase, collection or delivery booking.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {sourceBackedSpecSourceUrl && showCaterBotSource && (
                        <a
                          href={sourceBackedSpecSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white"
                        >
                          Open source
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {verifiedSpec && (
                        <button
                          type="button"
                          onClick={reportIncorrectSpecs}
                          className="inline-flex items-center rounded-2xl border border-white/12 px-4 py-3 text-sm font-black text-white transition hover:border-[#FF6B00]/50"
                        >
                          {specReportSent ? "Report sent" : "Report incorrect specs"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <details className="mt-4 rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-3 text-xs text-orange-100">
                  <summary className="cursor-pointer font-black">Safety note</summary>
                  <p className="mt-2 leading-relaxed">{BUYER_WARNING}</p>
                  <p className="mt-2 leading-relaxed text-orange-100/75">{SAFETY_DISCLAIMER}</p>
                </details>
              </details>

              <details className="group rounded-3xl border border-white/12 bg-[#062747]/85 p-4 shadow-lg shadow-black/10">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="flex items-center gap-3 text-lg font-black text-white">
                    <Truck className="h-5 w-5 text-white/75" />
                    Delivery Details
                  </span>
                  <ChevronDown className="h-5 w-5 text-white/55 transition group-open:rotate-180" />
                </summary>

                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">Delivery option</p>
                    <p className="mt-1 text-lg font-black text-white">{deliveryStatusText}</p>
                    <p className="mt-2 text-sm text-white/60">
                      {usesCaterBidsDelivery
                        ? listing.delivery_details_confirmed
                          ? "Delivery details have been confirmed by the seller."
                          : "Seller should confirm measurements before booking delivery."
                        : "Contact the seller to arrange collection."}
                    </p>
                    {usesCaterBidsDelivery && (
                      <p className="mt-3 text-sm font-semibold text-orange-100/85">
                        Before collection, the seller must prepare the item correctly.{" "}
                        <a
                          href="/pallet-delivery-guide"
                          target="_blank"
                          rel="noreferrer"
                          className="font-black text-[#FF9A4A] underline-offset-4 hover:underline"
                        >
                          View pallet preparation guide
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">Collection area</p>
                      <p className="mt-1 text-sm font-bold text-white/82">{publicCollectionArea}</p>
                    </div>
                    {usesCaterBidsDelivery && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">Pallet size</p>
                        <p className="mt-1 text-sm font-bold text-white/82">{formatPalletSize((listing as any).pallet_size)}</p>
                      </div>
                    )}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">Weight</p>
                      <p className="mt-1 text-sm font-bold text-white/82">{listingWeightKg ? `${listingWeightKg} kg` : "Not confirmed"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:col-span-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">Dimensions</p>
                      <p className="mt-1 text-sm font-bold text-white/82">
                        {listingLengthCm && listingWidthCm && listingHeightCm
                          ? `${listingLengthCm} x ${listingWidthCm} x ${listingHeightCm} cm`
                          : "Not confirmed"}
                      </p>
                    </div>
                  </div>
                </div>
              </details>

              <details className="group rounded-3xl border border-white/12 bg-[#062747]/85 p-4 shadow-lg shadow-black/10">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="flex items-center gap-3 text-lg font-black text-white">
                    <Info className="h-5 w-5 text-white/75" />
                    More Details
                  </span>
                  <ChevronDown className="h-5 w-5 text-white/55 transition group-open:rotate-180" />
                </summary>
                <div className="mt-4 space-y-4 text-sm text-white/70">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-black text-white">
                      <Shield className="h-4 w-4 text-[#FF6B00]" />
                      Buyer checks: {buyerChecklist.label}
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {buyerChecklist.items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6B00]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">Listing reference</p>
                    <p className="mt-1 break-all text-xs font-bold text-white/82">{safeListingId(listing.id || id)}</p>
                  </div>
                </div>
              </details>
            </section>
          </section>

          <aside className="min-w-0 space-y-5 lg:sticky lg:top-24">
            <section className="hidden rounded-[2rem] border border-white/12 bg-[#062747]/85 p-5 shadow-2xl shadow-black/20 lg:block">
              <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">{listing.title}</h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {isFeaturedAndActive(listing as Record<string, unknown>) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#FF6B00] bg-[#0a2a4a] px-3 py-1.5 shadow-[0_0_12px_rgba(255,107,0,0.3)]">
                    <Bell className="h-3.5 w-3.5 fill-[#FF6B00] text-[#FF6B00]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Featured</span>
                    <span className="ml-0.5 text-[8px] font-black uppercase text-[#FF6B00]">· Top Listing</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/78">
                  <MapPin className="h-4 w-4 text-[#FF6B00]" />
                  {publicLocation}
                </span>
                {listing.category && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/78">
                    <Tag className="h-4 w-4 text-[#FF6B00]" />
                    {listing.category}
                  </span>
                )}
                {listing.subcategory && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/78">
                    <Tag className="h-4 w-4 text-white/45" />
                    {listing.subcategory}
                  </span>
                )}
                {listing.condition && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/78">
                    <Package className="h-4 w-4 text-white/70" />
                    {listing.condition}
                  </span>
                )}
                {listing.power_type && !/unknown/i.test(listing.power_type) && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-3 py-2 text-xs font-bold text-orange-100">
                    <Zap className="h-4 w-4 text-[#FF6B00]" />
                    {listing.power_type}
                  </span>
                )}
                {(listing.manuals_available || showCaterBotSource) && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/78">
                    <BookOpen className="h-4 w-4 text-white/70" />
                    Manuals
                  </span>
                )}
                {usesCaterBidsDelivery && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-3 py-2 text-xs font-bold text-orange-100">
                    <Truck className="h-4 w-4 text-white/80" />
                    Pallet delivery
                  </span>
                )}
                {sellerFullyVerified && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-green-400/25 bg-green-500/12 px-3 py-2 text-xs font-bold text-green-100">
                    <BadgeCheck className="h-4 w-4 text-green-300" />
                    Verified Seller
                  </span>
                )}
                {trustBadges
                  .filter((badge) => !/delivery available|manuals/i.test(badge) && badge !== listing.power_type)
                  .map((badge) => (
                    <span
                      key={badge}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white/75"
                    >
                      <Shield className="h-4 w-4 text-[#FF6B00]" />
                      {badge}
                    </span>
                  ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-white/55">
                {listing.created_at && (
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Posted {formatUKDate(listing.created_at)}
                  </span>
                )}
                {viewCount !== null && (
                  <span className="inline-flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {viewCount} {viewCount === 1 ? "view" : "views"}
                  </span>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]">
                    <Tag className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-white/55">Price</p>
                  <p className="mt-1 text-xl font-black text-white">{formatPrice(listing.price)}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500/18 text-green-200">
                    <Truck className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-white/55">Delivery</p>
                  <p className="mt-1 text-lg font-black text-white">{usesCaterBidsDelivery ? "Pallet" : "Collection"}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/18 text-blue-200">
                    <Package className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-white/55">Condition</p>
                  <p className="mt-1 text-lg font-black text-white">{listing.condition || "Not stated"}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-100">
                    <UserCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-white/55">Seller</p>
                  <p className="mt-1 line-clamp-2 text-lg font-black text-white">{sellerDisplayName}</p>
                </div>
              </div>

              {canContactSeller && (
                <button
                  type="button"
                  onClick={messageSeller}
                  disabled={openingMessage}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-5 py-4 text-sm font-black text-white shadow-xl shadow-[#FF6B00]/20 transition hover:bg-[#ff7c1f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageCircle className="h-5 w-5" />
                  {openingMessage ? "Opening..." : "Contact seller"}
                </button>
              )}
            </section>

            {isListingOwner && !isSoldListing && (
              <FeaturedBoostButton
                listingId={safeListingId(listing.id)}
                isFeatured={Boolean((listing as any).featured || (listing as any).is_featured)}
                featuredUntil={(listing as any).featured_until ?? null}
                featuredType={listing.featured_type ?? null}
              />
            )}

            <section className="hidden rounded-[2rem] border border-white/12 bg-[#062747]/85 p-5 shadow-xl shadow-black/15 lg:block">
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  sellerFullyVerified ? "bg-green-500/18 text-green-200" : "bg-white/10 text-white/75"
                }`}>
                  {sellerFullyVerified ? <CheckCircle2 className="h-6 w-6" /> : <UserCircle2 className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF6B00]">
                    {sellerFullyVerified ? "Verified Seller" : "Seller Profile"}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">{sellerDisplayName}</h2>
                  {sellerProfile?.is_founding_member && (
                    <div className="mt-1.5">
                      <FoundingMemberBadge />
                    </div>
                  )}
                  {sellerJoinedDate && (
                    <p className="mt-1 text-sm font-semibold text-white/55">Joined {formatUKDate(sellerJoinedDate)}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {sellerEmailVerified && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-500/10 px-3 py-2 text-xs font-black text-green-100">
                    <Mail className="h-4 w-4" />
                    Email verified
                  </span>
                )}
                {sellerTrustInput.phoneVerified && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-500/10 px-3 py-2 text-xs font-black text-green-100">
                    <CheckCircle2 className="h-4 w-4" />
                    Phone verified
                  </span>
                )}
                {sellerFullyVerified && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-500/10 px-3 py-2 text-xs font-black text-green-100">
                    <BadgeCheck className="h-4 w-4" />
                    Seller verification complete
                  </span>
                )}
              </div>

              {(sellerReviewStats.reviewCount > 0 || sellerReviewStats.completedSales > 0 || sellerReviewStats.responseRate > 0) ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {sellerReviewStats.reviewCount > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                      <Star className="h-5 w-5 text-[#FF6B00]" />
                      <p className="mt-2 text-lg font-black text-white">{sellerReviewStats.averageRating.toFixed(1)} / 5</p>
                      <p className="text-xs font-bold text-white/45">Seller rating</p>
                    </div>
                  )}
                  {sellerReviewStats.completedSales > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                      <Package className="h-5 w-5 text-[#FF6B00]" />
                      <p className="mt-2 text-lg font-black text-white">{sellerReviewStats.completedSales}</p>
                      <p className="text-xs font-bold text-white/45">Completed sales</p>
                    </div>
                  )}
                  {sellerReviewStats.responseRate > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                      <MessageCircle className="h-5 w-5 text-[#FF6B00]" />
                      <p className="mt-2 text-lg font-black text-white">{sellerReviewStats.responseRate}%</p>
                      <p className="text-xs font-bold text-white/45">Response rate</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-semibold text-white/65">
                  This seller is building their CaterBidsUK trust profile.
                </p>
              )}

              {sellerReviews.length > 0 && (
                <div className="mt-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.15em] text-white/45">
                    Buyer Reviews
                  </p>
                  <SellerReviewsList
                    reviews={sellerReviews.slice(0, showAllReviews ? undefined : 5)}
                  />
                  {sellerReviews.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllReviews((v) => !v)}
                      className="mt-3 w-full rounded-2xl border border-white/10 py-2 text-xs font-black text-white/50 transition hover:bg-white/5"
                    >
                      {showAllReviews ? "Show fewer" : `Show all ${sellerReviews.length} reviews`}
                    </button>
                  )}
                </div>
              )}

              {isListingOwner && (
                <button
                  type="button"
                  onClick={() => router.push("/account")}
                  className="mt-4 w-full rounded-2xl border border-[#FF6B00]/30 px-4 py-3 text-sm font-black text-orange-100 transition hover:bg-[#FF6B00]/10"
                >
                  Manage verification
                </button>
              )}
            </section>

            <SellerSocialLinks links={sellerProfile?.social_links || null} />

            <section className="hidden lg:block">
              <SocialShareButtons
                listingId={safeListingId(listing.id || id)}
                title={listing.title || "CaterBidsUK listing"}
                price={formatPrice(listing.price)}
                location={publicLocation}
                heading={isListingOwner ? "Promote Listing" : "Share Listing"}
                description={isListingOwner ? "Share this listing to get more views." : "Share this item with someone who may be interested."}
              />
            </section>

            {isListingOwner && (
              <section className={`rounded-3xl border p-4 ${ownerStatusClasses}`}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                  <div>
                    <h2 className="text-lg font-black">{ownerStatus.title}</h2>
                    <p className="mt-1 text-sm font-semibold opacity-80">{ownerStatus.text}</p>
                  </div>
                </div>
              </section>
            )}

            {isListingOwner ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={() => handleEdit(listing)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-4 text-sm font-black text-white transition hover:border-[#FF6B00]/60"
                >
                  <Pencil className="h-5 w-5" />
                  Edit Listing
                </button>
                <button
                  type="button"
                  onClick={() => deleteListing(listing)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/35 bg-red-500/10 px-5 py-4 text-sm font-black text-red-100 transition hover:bg-red-500/15"
                >
                  <Trash2 className="h-5 w-5" />
                  Delete Listing
                </button>
              </div>
            ) : null}

            {editError && !isListingOwner && (
              <p className="rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-4 py-3 text-sm font-bold text-orange-100">
                {editError}
              </p>
            )}

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
              <div className="rounded-3xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-5">
                <h3 className="text-xl font-black text-white">Delivery pending</h3>
                <p className="mt-2 text-sm text-orange-100/80">Weight and size are not confirmed yet. Contact the seller for delivery details.</p>
              </div>
            )}

            {!isListingOwner && !isSoldListing ? (
              <BuyCheckoutBox
                listingId={safeListingId(listing.id)}
                sellerId={checkoutSellerId}
                title={listing.title}
                price={listingPriceNumber(listing.price)}
                selectedDelivery={selectedDelivery}
                deliveryAvailable={hasDeliveryOption}
                onMessageSeller={messageSeller}
              />
            ) : isSoldListing ? (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
                <h3 className="text-xl font-black text-red-100">This item has sold</h3>
                <p className="mt-2 text-sm text-red-100/75">
                  Checkout and delivery options are closed for this listing.
                </p>
              </div>
            ) : null}

            {showCaterBotSource && (
              <details className="rounded-3xl border border-[#FF6B00]/25 bg-[#062747]/85 p-5">
                <summary className="cursor-pointer list-none text-sm font-black uppercase tracking-wider text-white/70">
                  Product specs supported by CaterBot
                </summary>
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-black text-white">Seller-confirmed product source available.</p>
                  <p className="mt-1 text-xs text-white/55">
                    {manualSourceName}
                    {specConfidence ? ` · CaterBot spec confidence: ${specConfidence}` : ""}
                    {" · Seller checked"}
                  </p>
                  <a
                    href={manualSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white"
                  >
                    Open manual/spec source
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/55">
                  Specs are provided to help buyers check details. Please confirm suitability before purchase.
                </p>
              </details>
            )}

            {messageError && (
              <p className="rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200">
                {messageError}
              </p>
            )}
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#001A35]/95 p-3 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-3xl gap-3">
            {isListingOwner ? (
              <button
                type="button"
                onClick={() => handleEdit(listing)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-4 py-4 text-sm font-black text-white"
              >
                <Pencil className="h-5 w-5" />
                Edit Listing
              </button>
            ) : (
              <button
                type="button"
                onClick={messageSeller}
                disabled={openingMessage || isSoldListing}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-4 py-4 text-sm font-black text-white disabled:opacity-55"
              >
                <MessageCircle className="h-5 w-5" />
                {isSoldListing ? "Sold" : openingMessage ? "Opening..." : "Contact seller"}
              </button>
            )}
            <button
              type="button"
              onClick={quickShareListing}
              className="flex min-w-28 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-4 text-sm font-black text-white"
            >
              <Share2 className="h-5 w-5" />
              Share
            </button>
          </div>
        </div>
      </main>
    )
  }

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
              <button
                type="button"
                onClick={quickShareListing}
                className="soft-button flex h-11 w-11 items-center justify-center rounded-2xl bg-black/35 backdrop-blur-md"
                aria-label="Share listing"
              >
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
              {sellerTrustBadge && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-green-400/25 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-100"
                  title="This account has verified ownership of their email address."
                >
                  <Shield className="h-3 w-3" /> {sellerTrustBadge}
                </span>
              )}
              {sellerVerificationBadge && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-3 py-1 text-xs font-bold text-orange-100">
                  <Shield className="h-3 w-3" /> {sellerVerificationBadge}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-white/50">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {listing.created_at ? formatUKDate(listing.created_at) : 'Listed recently'}
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
                  <p className="mt-1 font-black text-white">{usesCaterBidsDelivery ? "Pallet" : "Collection"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/45">Condition</p>
                  <p className="mt-1 font-black text-white">{listing.condition || "Used"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/45">Seller</p>
                  <p className="mt-1 font-black text-white">{sellerDisplayName}</p>
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

          <SellerTrustCard
            sellerName={sellerDisplayName}
            createdAt={sellerProfile?.created_at || listing.created_at}
            trust={sellerTrustInput}
          />

          <SellerSocialLinks links={sellerProfile?.social_links || null} />

          <SocialShareButtons
            listingId={safeListingId(listing.id || id)}
            title={listing.title || "CaterBidsUK listing"}
            price={formatPrice(listing.price)}
            location={listing.city || listing.location || "UK"}
          />

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
                onClick={() => handleEdit(listing)}
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

          {listing.category === "Catering Businesses" && listing.business_details && typeof listing.business_details === "object" && (() => {
            const bd = listing.business_details as Record<string, unknown>
            const confidential = Boolean(listing.is_confidential)
            const rows: [string, string][] = []
            if (!confidential && bd.trading_name) rows.push(["Trading name", String(bd.trading_name)])
            if (bd.business_type) rows.push(["Business type", String(bd.business_type)])
            if (bd.years_trading) rows.push(["Years trading", String(bd.years_trading)])
            if (bd.reason_for_sale) rows.push(["Reason for sale", String(bd.reason_for_sale)])
            if (bd.annual_turnover) rows.push(["Annual turnover", String(bd.annual_turnover)])
            if (bd.annual_profit) rows.push(["Annual profit", String(bd.annual_profit)])
            if (bd.avg_weekly_revenue) rows.push(["Avg. weekly revenue", String(bd.avg_weekly_revenue)])
            if (bd.rent_or_own) rows.push(["Premises ownership", String(bd.rent_or_own)])
            if (bd.monthly_rent) rows.push(["Monthly rent", String(bd.monthly_rent)])
            if (bd.lease_remaining) rows.push(["Lease remaining", String(bd.lease_remaining)])
            if (bd.premises_type) rows.push(["Premises type", String(bd.premises_type)])
            if (bd.sq_ft) rows.push(["Floor area", `${bd.sq_ft} sq ft`])
            if (bd.covers) rows.push(["Covers / seats", String(bd.covers)])
            if (bd.location_type) rows.push(["Location type", String(bd.location_type)])
            if (!confidential && bd.postcode) rows.push(["Postcode", String(bd.postcode)])
            if (bd.staff_count) rows.push(["Staff", String(bd.staff_count)])
            if (bd.opening_hours) rows.push(["Opening hours", String(bd.opening_hours)])
            if (bd.cuisine_type) rows.push(["Cuisine", String(bd.cuisine_type)])
            if (Array.isArray(bd.trading_days) && bd.trading_days.length) rows.push(["Trading days", (bd.trading_days as string[]).join(", ")])
            if (Array.isArray(bd.licensing) && bd.licensing.length) rows.push(["Licences", (bd.licensing as string[]).join(", ")])
            if (bd.equipment_included) rows.push(["Equipment included", String(bd.equipment_included)])
            if (bd.stock_included) rows.push(["Stock included", String(bd.stock_included)])
            if (bd.website_social_included) rows.push(["Website / social", String(bd.website_social_included)])
            if (bd.supplier_contacts) rows.push(["Supplier contacts", String(bd.supplier_contacts)])
            if (bd.training_offered) rows.push(["Handover training", String(bd.training_offered)])
            return (
              <section className="premium-card rounded-3xl p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">
                  Business Details
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {confidential ? "Confidential listing" : (bd.trading_name ? String(bd.trading_name) : "Business for sale")}
                </h2>
                {confidential && (
                  <p className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-white/60">
                    This is a confidential listing. The trading name, address and postcode are shared directly with serious enquirers.
                  </p>
                )}
                {rows.length > 0 && (
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    {rows.map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-[#002E5D]/35 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">{label}</p>
                        <p className="mt-1 font-bold text-white/82">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {Boolean(bd.other_inclusions) && (
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    <span className="font-black text-white/50 uppercase text-[10px] tracking-widest block mb-1">Other inclusions</span>
                    {String(bd.other_inclusions)}
                  </p>
                )}
              </section>
            )
          })()}

          {showVerifiedSpecs && sourceBackedSpec && (
            <section className="premium-card rounded-3xl border-[#FF6B00]/25 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">
                    Verified Equipment Specs
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Shipping specs
                  </h2>
                </div>
                <span className="inline-flex w-fit rounded-full border border-green-400/25 bg-green-500/10 px-3 py-1 text-xs font-black text-green-200">
                  {sourceBackedSpecConfidence}% confidence
                </span>
              </div>

              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {specRows.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-[#002E5D]/35 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">{label}</p>
                    <p className="mt-1 font-bold text-white/82">{value}</p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs leading-relaxed text-white/60">
                Source:{" "}
                {sourceBackedSpecSourceUrl && showCaterBotSource ? (
                  <a
                    href={sourceBackedSpecSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-[#FF9A4A] underline-offset-4 hover:underline"
                  >
                    {sourceBackedSpecSourceName}
                  </a>
                ) : (
                  sourceBackedSpecSourceName
                )}{" "}
                - data confidence: {sourceBackedSpecConfidence}%
              </p>
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-white/55">
                Specs are for guidance only. Buyers should confirm details with the seller before purchase or collection.
              </p>
              {verifiedSpec && (
                <button
                  type="button"
                  onClick={reportIncorrectSpecs}
                  className="mt-3 text-xs font-black text-[#FF9A4A] underline-offset-4 hover:underline"
                >
                  {specReportSent ? "Report sent" : "Report incorrect specs"}
                </button>
              )}
            </section>
          )}

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
                <p className="text-lg font-black text-white">CaterBids Pallet Delivery Available</p>
                <p className="text-sm text-white/65">
                  {listing.delivery_details_confirmed
                    ? "Pallet details confirmed."
                    : "Pallet details need checking."}
                </p>
                <a
                  href="/pallet-delivery-guide"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-2xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-4 py-2 text-xs font-black text-[#FF9A4A]"
                >
                  View pallet preparation guide
                </a>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="font-black uppercase text-white/40">Pallet size</p>
                    <p className="mt-1 font-bold text-white">{formatPalletSize((listing as any).pallet_size)}</p>
                  </div>
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
                    <p className="font-black uppercase text-white/40">Collection area</p>
                    <p className="mt-1 font-bold text-white">
                      {publicCollectionArea}
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
                Product specs supported by CaterBot
              </summary>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-black text-white">Seller-confirmed product source available.</p>
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
                Specs are provided to help buyers check details. Please confirm suitability before purchase.
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
            <button
              type="button"
              onClick={() => {
                quickShareListing()
              }}
              className="soft-button flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold"
            >
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
