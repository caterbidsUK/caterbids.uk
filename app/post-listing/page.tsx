"use client"

import { useRouter } from "next/navigation"
import NextImage from "next/image"
import { useEffect, useState, useTransition } from "react"
import { ClipboardCheck, ImagePlus, ScanSearch, UploadCloud, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createListing } from "./actions"
import type { CaterBidsDeliveryOption } from "@/lib/delivery/options"
import { DELIVERY_PREVIEW_MODE_LABEL } from "@/lib/delivery/options"
import {
  BUYER_WARNING,
  CONDITION_OPTIONS,
  DELIVERY_OPTION_OPTIONS,
  POWER_TYPE_OPTIONS,
  SAFETY_DISCLAIMER,
  TESTED_STATUS_OPTIONS,
  WARRANTY_TYPE_OPTIONS,
} from "@/lib/listing-trust"
import { CATEGORY_OPTIONS, subcategoriesForCategory } from "@/lib/categories"

type QuickListAiResponse = {
  suggested_title: string
  title?: string
  description: string
  category: string
  subcategory?: string
  brand: string
  model: string
  serial_number: string
  gc_number: string
  dimensions: string
  weight: string
  estimated_weight_kg?: string | number
  pallet_length_cm?: string | number
  pallet_width_cm?: string | number
  pallet_height_cm?: string | number
  pallet_count?: string | number
  tail_lift_required?: boolean | string
  forklift_available?: boolean | string
  commercial_premises?: boolean | string
  delivery_notes?: string
  power_type: string
  gas_or_electric?: string
  gas_type: string
  voltage: string
  amps: string
  kw_rating: string
  electrical_phase: string
  manual_url: string
  manual_source_url?: string
  spec_source_url?: string
  manual_source_name?: string
  manual_source_type?: string
  manual_source_validated?: boolean
  manual_source_last_checked_at?: string
  manual_source_match_notes?: string
  manual_source_useful_details?: string[]
  ai_spec_confidence?: string | number
  source_rejected_by_seller?: boolean
  shipping_class: string
  delivery_warning: string
  confidence_score: number
  confidence?: string | number
  condition?: "New" | "Used" | "Refurbished" | "Spares or Repair"
  error?: string
  detail?: string
}

type CaterBotSourceValidationResponse = {
  success?: boolean
  sourceFound?: boolean
  error?: string
  searchProvider?: string | null
  checkedAt?: string
  sourceStatus?: string
  shipping?: {
    deliveryType?: string
    shippingClass?: string
    palletDeliveryRecommended?: boolean
    specialistDeliveryRecommended?: boolean
    forkliftRequired?: boolean
    tailLiftRequired?: boolean
    twoPersonLiftRecommended?: boolean
    shippingConfidence?: string
    deliveryNotes?: string
  }
  source?: {
    url?: string
    sourceName?: string
    sourceType?: string
    confidence?: string
    score?: number
    sourceTitle?: string
    sourceDomain?: string
    confidenceScore?: number
    matchedFields?: string[]
    sourcePriorityRank?: number
    checkedAt?: string
    matchNotes?: string
    usefulDetails?: string[]
    extractedSpecs?: {
      dimensions?: string
      packedDimensions?: string
      weight?: string
      grossWeight?: string
      voltage?: string
      phase?: string
      amps?: string
      kwRating?: string
      gasType?: string
      capacity?: string
    }
  } | null
}

type DeliveryPreviewQuote = CaterBidsDeliveryOption
type SellerProfileDetails = {
  name?: string | null
  business?: string | null
  location?: string | null
  phone?: string | null
  seller_contact_name?: string | null
  collection_full_address?: string | null
  collection_city?: string | null
  collection_postcode?: string | null
}
type DeliveryRecommendation = {
  label: string
  recommendation: string
  palletRecommended: boolean
  specialistRecommended: boolean
}

const LISTING_IMAGES_BUCKET = "listing-images"
const LOCAL_PROFILE_KEY = "caterbids_profile"
const QUICKLIST_AI_WARNING =
  "Seller checked details required. Not a safety certificate."
const SHIPPING_SPEC_CATEGORIES = [
  "Oven",
  "Fryer",
  "Refrigerator",
  "Dishwasher",
  "Mixer",
  "Griddle",
  "Freezer",
  "Coffee Machine",
  "Prep Equipment",
  "Other",
] as const
const SHIPPING_POWER_TYPES = ["Electric", "Gas", "Both", "Not sure"] as const

function isManualsLibUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").endsWith("manualslib.com")
  } catch {
    return false
  }
}

function isManualsLibSearchUrl(url: string) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.toLowerCase()
    return isManualsLibUrl(url) && (path.includes("/search") || parsed.searchParams.get("action") === "search")
  } catch {
    return false
  }
}

function preferredManualSourceUrl(suggestion: QuickListAiResponse) {
  const candidateUrls = [
    suggestion.manual_source_url,
    suggestion.spec_source_url,
    suggestion.manual_url,
  ].filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url)))
  const manualsLibUrl = candidateUrls.find((url) => isManualsLibUrl(url) && !isManualsLibSearchUrl(url))
  const directSourceUrl = candidateUrls.find((url) => !isManualsLibSearchUrl(url))

  return manualsLibUrl || directSourceUrl || ""
}

function compactSearchModel(value: string) {
  return value.replace(/[^a-z0-9]/gi, "")
}

function trustedSearchModelTerms(model: string) {
  const raw = model.trim()
  if (!raw) return []
  const parts = raw.split(/[\/_\-\s]+/).filter(Boolean)
  const base = parts.find((part) => /[a-z]/i.test(part) && /\d/.test(part)) || parts[0] || raw
  const suffix = parts.filter((part) => part !== base).join("")
  return Array.from(new Set([
    raw,
    raw.replace(/[\/_\-]+/g, " "),
    compactSearchModel(raw),
    base,
    suffix ? `${base} ${suffix}` : "",
  ].map((term) => term.trim()).filter(Boolean)))
}

function manufacturerDomainForTrustedSearch(brand: string) {
  const brandKey = brand.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  const knownDomains: Record<string, string> = {
    lincat: "lincat.co.uk",
    falcon: "falconfoodservice.com",
    rational: "rational-online.com",
    hobart: "hobartuk.com",
    foster: "fosterrefrigerator.com",
    imperial: "imperialrange.com",
  }
  return knownDomains[brandKey] || `${brandKey.replace(/\s+/g, "")}.co.uk`
}

function externalSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

function trustedSourceSearchLinks({
  brand,
  model,
  title,
  equipmentType,
}: {
  brand: string
  model: string
  title: string
  equipmentType: string
}) {
  if (!brand.trim() || !model.trim()) return []

  const modelTerms = trustedSearchModelTerms(model)
  const primaryModel = modelTerms.find((term) => /[a-z]/i.test(term) && /\d/.test(term)) || model
  const readableModel = modelTerms.find((term) => term.includes(" ")) || primaryModel
  const titleText = `${title} ${equipmentType}`.toLowerCase()
  const family = titleText.match(/\bopus\s*800\b/)?.[0] || ""
  const categoryTerm =
    /\bfryer\b/.test(titleText) ? "fryer" :
    /\bgriddle|grill\b/.test(titleText) ? "griddle" :
    /\boven\b/.test(titleText) ? "oven" :
    /\bfridge|freezer|refrigerat/.test(titleText) ? "refrigeration" :
    equipmentType
  const searchTail = [brand, readableModel, family, categoryTerm].filter(Boolean).join(" ")
  const manufacturerDomain = manufacturerDomainForTrustedSearch(brand)

  return [
    {
      label: "Search Catering Appliance",
      url: externalSearchUrl(`site:catering-appliance.com ${searchTail}`),
    },
    {
      label: "Search ManualsLib",
      url: externalSearchUrl(`site:manualslib.com ${brand} ${primaryModel} manual`),
    },
    {
      label: "Search manufacturer site",
      url: externalSearchUrl(`site:${manufacturerDomain} ${brand} ${primaryModel}`),
    },
    {
      label: "Search Nisbets",
      url: externalSearchUrl(`site:nisbets.co.uk ${brand} ${primaryModel}`),
    },
  ]
}

function deliveryOptionForDeliveryMethod(value: string) {
  if (value === "collection_only") return "Collection only"
  if (value === "buyer_courier") return "Seller arranged delivery"
  return "Delivery available through CaterBids"
}

function positiveNumber(value: string) {
  const numberValue = Number(String(value || "").replace(/[^0-9.]/g, ""))
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

function deliveryRecommendationFromSpecs({
  weightKg,
  lengthCm,
  widthCm,
  heightCm,
  category,
  subcategory,
  powerType,
  hasVerifiedSource,
}: {
  weightKg: string
  lengthCm: string
  widthCm: string
  heightCm: string
  category: string
  subcategory: string
  powerType: string
  hasVerifiedSource: boolean
}): DeliveryRecommendation {
  const weight = positiveNumber(weightKg)
  const dimensions = [positiveNumber(lengthCm), positiveNumber(widthCm), positiveNumber(heightCm)]
  const maxDimension = Math.max(...dimensions, 0)
  const hasCompleteSpecs = weight > 0 && dimensions.every((value) => value > 0)
  const equipmentText = `${category} ${subcategory} ${powerType}`.toLowerCase()
  const specialCase = /(gas|lpg|propane|refriger|fridge|freezer|extraction|canopy|trailer|van)/.test(equipmentText)

  if (!hasCompleteSpecs) {
    return {
      label: "Seller confirmation needed",
      recommendation: "CaterBot can improve delivery estimates when dimensions and weight are confirmed.",
      palletRecommended: false,
      specialistRecommended: false,
    }
  }

  if (specialCase || weight >= 250 || maxDimension >= 220) {
    return {
      label: hasVerifiedSource ? "Source-based delivery estimate" : "Seller confirmation needed",
      recommendation: "Specialist delivery or collection recommended.",
      palletRecommended: true,
      specialistRecommended: true,
    }
  }

  if (weight <= 30 && maxDimension <= 120) {
    return {
      label: hasVerifiedSource ? "Source-based delivery estimate" : "Seller confirmation needed",
      recommendation: "Parcel courier may be suitable.",
      palletRecommended: false,
      specialistRecommended: false,
    }
  }

  if (weight <= 80 && maxDimension <= 160) {
    return {
      label: hasVerifiedSource ? "Source-based delivery estimate" : "Seller confirmation needed",
      recommendation: "Heavy parcel or small pallet recommended.",
      palletRecommended: true,
      specialistRecommended: false,
    }
  }

  return {
    label: hasVerifiedSource ? "Source-based delivery estimate" : "Seller confirmation needed",
    recommendation: "Pallet courier or specialist van recommended.",
    palletRecommended: true,
    specialistRecommended: false,
  }
}

function formatPrice(price: string) {
  const value = price.trim()
  if (!value) return ""
  return value.startsWith("£") ? value : `£${value}`
}

function isMissingStorageBucketError(error: unknown) {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return message.includes("bucket not found") || message.includes("storage bucket")
}

function hasPositiveNumber(value: FormDataEntryValue | null) {
  const numberValue = Number(value || "")
  return Number.isFinite(numberValue) && numberValue > 0
}

function localProfileKey(userId: string) {
  return `${LOCAL_PROFILE_KEY}:${userId}`
}

function readLocalSellerProfile(userId: string): SellerProfileDetails | null {
  if (typeof window === "undefined") return null

  try {
    const saved =
      localStorage.getItem(localProfileKey(userId)) ||
      localStorage.getItem(LOCAL_PROFILE_KEY)
    return saved ? (JSON.parse(saved) as SellerProfileDetails) : null
  } catch {
    return null
  }
}

function upperPostcode(value?: string | null) {
  return String(value || "").trim().toUpperCase()
}

export default function PostListingPage() {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [location, setLocation] = useState("")
  const [city, setCity] = useState("")
  const [category, setCategory] = useState("Catering Equipment")
  const [subcategory, setSubcategory] = useState("Cooking Equipment")
  const [condition, setCondition] = useState("Used")
  const [powerType, setPowerType] = useState("Unknown")
  const [description, setDescription] = useState("")
  const [dimensions, setDimensions] = useState("")
  const [deliveryMethod, setDeliveryMethod] = useState("caterbids_delivery")
  const [deliveryOption, setDeliveryOption] = useState(deliveryOptionForDeliveryMethod("caterbids_delivery"))
  const deliveryAvailable = deliveryMethod === "caterbids_delivery"
  const [manualsAvailable, setManualsAvailable] = useState(false)
  const [weightKg, setWeightKg] = useState("")
  const [lengthCm, setLengthCm] = useState("")
  const [widthCm, setWidthCm] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [deliverySizeUnknown, setDeliverySizeUnknown] = useState(false)
  const [collectionPostcode, setCollectionPostcode] = useState("")
  const [collectionFullAddress, setCollectionFullAddress] = useState("")
  const [collectionCity, setCollectionCity] = useState("")
  const [sellerContactName, setSellerContactName] = useState("")
  const [sellerPhone, setSellerPhone] = useState("")
  const [palletCount, setPalletCount] = useState("1")
  const [preferredCollectionDate, setPreferredCollectionDate] = useState("")
  const [insuranceValue, setInsuranceValue] = useState("")
  const [accessRestrictions, setAccessRestrictions] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [deliveryDetailsConfirmed, setDeliveryDetailsConfirmed] = useState(false)
  const [interparcelPreviewPostcode, setInterparcelPreviewPostcode] = useState("")
  const [interparcelPreviewQuotes, setInterparcelPreviewQuotes] = useState<DeliveryPreviewQuote[]>([])
  const [selectedInterparcelPreviewQuote, setSelectedInterparcelPreviewQuote] =
    useState<DeliveryPreviewQuote | null>(null)
  const [interparcelPreviewProvider, setInterparcelPreviewProvider] = useState("")
  const [interparcelPreviewError, setInterparcelPreviewError] = useState("")
  const [interparcelPreviewLoading, setInterparcelPreviewLoading] = useState(false)
  const [palletReady, setPalletReady] = useState(false)
  const [tailLiftRequired, setTailLiftRequired] = useState(true)
  const [forkliftAvailable, setForkliftAvailable] = useState(false)
  const [groundFloorCollection, setGroundFloorCollection] = useState(true)
  const [commercialPremises, setCommercialPremises] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [specPlateFile, setSpecPlateFile] = useState<File | null>(null)
  const [specPlatePreview, setSpecPlatePreview] = useState("")
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiNotice, setAiNotice] = useState("")
  const [manualSourceUrl, setManualSourceUrl] = useState("")
  const [specSourceUrl, setSpecSourceUrl] = useState("")
  const [manualSourceName, setManualSourceName] = useState("")
  const [manualSourceType, setManualSourceType] = useState("")
  const [manualSourceValidated, setManualSourceValidated] = useState(false)
  const [manualSourceLastCheckedAt, setManualSourceLastCheckedAt] = useState("")
  const [manualSourceMatchNotes, setManualSourceMatchNotes] = useState("")
  const [manualSourceUsefulDetails, setManualSourceUsefulDetails] = useState<string[]>([])
  const [specConfidence, setSpecConfidence] = useState("")
  const [specsVerifiedBySeller, setSpecsVerifiedBySeller] = useState(false)
  const [sourceRejectedBySeller, setSourceRejectedBySeller] = useState(false)
  const [manualLinkPanelOpen, setManualLinkPanelOpen] = useState(false)
  const [manualLinkInput, setManualLinkInput] = useState("")
  const [manualLinkError, setManualLinkError] = useState("")
  const [manualLinkChecking, setManualLinkChecking] = useState(false)
  const [specPlateValidation, setSpecPlateValidation] = useState("")
  const [shippingSpecBrand, setShippingSpecBrand] = useState("")
  const [shippingSpecModel, setShippingSpecModel] = useState("")
  const [shippingSpecSerial, setShippingSpecSerial] = useState("")
  const [shippingSpecGcNumber, setShippingSpecGcNumber] = useState("")
  const [shippingSpecCategory, setShippingSpecCategory] = useState<(typeof SHIPPING_SPEC_CATEGORIES)[number]>("Griddle")
  const [shippingSpecPowerType, setShippingSpecPowerType] =
    useState<(typeof SHIPPING_POWER_TYPES)[number]>("Electric")
  const [shippingSpecPhase, setShippingSpecPhase] = useState("")
  const [shippingSpecVoltage, setShippingSpecVoltage] = useState("")
  const [shippingSpecCurrent, setShippingSpecCurrent] = useState("")
  const [shippingSpecGasType, setShippingSpecGasType] = useState("")
  const [shippingSpecGasConnection, setShippingSpecGasConnection] = useState("")
  const [shippingSpecHeight, setShippingSpecHeight] = useState("")
  const [shippingSpecWidth, setShippingSpecWidth] = useState("")
  const [shippingSpecDepth, setShippingSpecDepth] = useState("")
  const [shippingSpecWeight, setShippingSpecWeight] = useState("")
  const [shippingSpecForkliftRequired, setShippingSpecForkliftRequired] = useState(false)
  const [shippingSpecNotes, setShippingSpecNotes] = useState("")
  const [quickListResult, setQuickListResult] = useState<QuickListAiResponse | null>(null)
  const [quickListApplied, setQuickListApplied] = useState(false)
  const [publishError, setPublishError] = useState("")
  const [listingInfoConfirmed, setListingInfoConfirmed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isPublishing, startPublishing] = useTransition()
  const imagePreview = imagePreviews[0] || ""

  function prefillSellerDetails(profile: SellerProfileDetails | null | undefined) {
    if (!profile) return

    const contactName = profile.seller_contact_name || profile.name || profile.business || ""
    const sellerLocation = profile.collection_city || profile.location || ""
    const sellerPostcode = upperPostcode(profile.collection_postcode)

    setSellerContactName((current) => current || contactName)
    setSellerPhone((current) => current || profile.phone || "")
    setCollectionFullAddress((current) => current || profile.collection_full_address || "")
    setCollectionCity((current) => current || sellerLocation)
    setCollectionPostcode((current) => current || sellerPostcode)
    setCity((current) => current || sellerLocation)
    setLocation((current) => current || sellerLocation)
  }

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const user = await getCurrentUser(supabase)
      const realUser = user?.id === "local-beta" ? null : user

      setUserId(realUser?.id || null)
      setAuthChecked(true)
      if (!realUser) {
        router.replace(`/login?next=${encodeURIComponent("/post-listing")}`)
        return
      }

      prefillSellerDetails(readLocalSellerProfile(realUser.id))

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", realUser.id)
        .maybeSingle()

      if (profile) {
        prefillSellerDetails(profile)
      }
    }

    loadUser()
  }, [router])

  useEffect(() => {
    const subcategories = subcategoriesForCategory(category)
    const nextSubcategory =
      subcategories.length > 0 && !subcategories.includes(subcategory)
        ? subcategories[0]
        : subcategories.length === 0 && subcategory
          ? ""
          : null

    if (nextSubcategory === null) return

    const timer = window.setTimeout(() => {
      setSubcategory(nextSubcategory)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [category, subcategory])

  function requireLogin() {
    router.push(`/login?next=${encodeURIComponent("/post-listing")}`)
  }

  function resizeImage(file: File, maxSize = 900, quality = 0.82) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => {
        const image = new Image()
        image.onerror = () => reject(new Error("Could not load image"))
        image.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
          const canvas = document.createElement("canvas")
          canvas.width = Math.max(1, Math.round(image.width * scale))
          canvas.height = Math.max(1, Math.round(image.height * scale))

          const context = canvas.getContext("2d")
          if (!context) {
            reject(new Error("Could not prepare image"))
            return
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL("image/jpeg", quality))
        }
        image.src = reader.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  function resizeListingImage(file: File) {
    return resizeImage(file, 900, 0.82)
  }

  function resizeSpecPlateForAi(file: File) {
    return resizeImage(file, 1600, 0.9)
  }

  async function buildImagePreviews(files: File[]) {
    return Promise.all(
      files.map(async (file) => {
        try {
          return await resizeListingImage(file)
        } catch {
          return fileToDataUrl(file)
        }
      })
    )
  }

  function inspectImage(file: File) {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => {
        const image = new Image()
        image.onerror = () => reject(new Error("Could not load image"))
        image.onload = () => resolve({ width: image.width, height: image.height })
        image.src = reader.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  function clearQuickListResult() {
    setQuickListResult(null)
    setQuickListApplied(false)
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const allowed = files.filter((file) =>
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)
    )
    const remainingSlots = 6 - imageFiles.length
    const selected = allowed.slice(0, remainingSlots)
    if (selected.length === 0) return

    const newFiles = [...imageFiles, ...selected]
    setImageFiles(newFiles)
    setUploadedImageUrls([])
    setAiError("")
    clearQuickListResult()
    setImagePreviews(await buildImagePreviews(newFiles))
    e.target.value = ""
  }

  async function removeSelectedImage(index: number) {
    const newFiles = imageFiles.filter((_, fileIndex) => fileIndex !== index)
    setImageFiles(newFiles)
    setUploadedImageUrls([])
    clearQuickListResult()
    setImagePreviews(await buildImagePreviews(newFiles))
  }

  async function runSpecPlateOcrPreview(file: File) {
    if (!userId) return

    setAiLoading(true)
    setAiError("")
    setAiNotice("Reading spec plate...")

    try {
      const specPlateDataUrl = await resizeSpecPlateForAi(file)
      const res = await fetch("/api/ai-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          specPlate: {
            imageBase64: getBase64Payload(specPlateDataUrl),
            fileType: getDataUrlFileType(specPlateDataUrl, file.type),
            fileName: file.name,
          },
        }),
      })
      const suggestion = (await res.json()) as QuickListAiResponse

      if (!res.ok) {
        setAiNotice("")
        return
      }

      setQuickListResult(suggestion)
      applySuggestionToShippingSpecs(suggestion)
      setAiNotice("Spec plate read. Check brand, model and shipping specs.")
    } catch (error) {
      console.warn("Spec plate OCR preview failed:", error)
      setAiNotice("")
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSpecPlateSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = Array.from(e.target.files || []).find((selectedFile) =>
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(selectedFile.type)
    )
    if (!file) return

    try {
      const { width, height } = await inspectImage(file)
      if (Math.max(width, height) < 700 || Math.min(width, height) < 300) {
        setAiError("Use a clearer spec plate photo so the brand and model can be read.")
        e.target.value = ""
        return
      }
      setSpecPlateValidation(
        height > width * 1.35
          ? "Spec plate added. Rotate or crop if the text is sideways."
          : "Spec plate added."
      )
    } catch {
      setSpecPlateValidation("Spec plate added.")
    }

    setSpecPlateFile(file)
    setAiError("")
    clearQuickListResult()

    try {
      setSpecPlatePreview(await resizeListingImage(file))
    } catch {
      setSpecPlatePreview(await fileToDataUrl(file))
    }

    e.target.value = ""
    void runSpecPlateOcrPreview(file)
  }

  function removeSpecPlate() {
    setSpecPlateFile(null)
    setSpecPlatePreview("")
    setSpecPlateValidation("")
    setAiError("")
    clearQuickListResult()
  }

  function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  function getBase64Payload(dataUrl: string) {
    return dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl
  }

  function getDataUrlFileType(dataUrl: string, fallback: string) {
    const match = dataUrl.match(/^data:([^;,]+)[;,]/)
    if (match?.[1]) return match[1]
    return fallback || "image/jpeg"
  }

  function normaliseCondition(value?: string) {
    if (!value) return condition
    if (/spares/i.test(value)) return "Spares or repairs"
    return CONDITION_OPTIONS.includes(value) ? value : condition
  }

  function normalisePowerType(value?: string) {
    if (!value) return powerType
    if (POWER_TYPE_OPTIONS.includes(value)) return value

    const lower = value.toLowerCase()
    if (lower.includes("lpg") || lower.includes("propane")) return "LPG / Propane"
    if (lower.includes("natural gas") || lower.includes("mains gas")) return "Natural Gas"
    if (lower.includes("three phase") || lower.includes("3 phase") || lower.includes("415v") || lower.includes("400v")) {
      return "Three Phase"
    }
    if (lower.includes("13a")) return "Plug & Play 13A"
    if (lower.includes("electric") || lower.includes("230v") || lower.includes("240v")) return "Electric"
    if (lower.includes("dual fuel")) return "Dual Fuel"

    return "Unknown"
  }

  function shippingPowerTypeFrom(value?: string) {
    const lower = (value || "").toLowerCase()
    if (!lower || lower.includes("unknown") || lower.includes("not sure")) return "Not sure"
    if (lower.includes("dual") || lower.includes("both")) return "Both"
    if (lower.includes("gas") || lower.includes("lpg") || lower.includes("propane")) return "Gas"
    return "Electric"
  }

  function shippingCategoryFrom(value?: string) {
    const lower = (value || "").toLowerCase()
    if (lower.includes("fryer")) return "Fryer"
    if (lower.includes("fridge") || lower.includes("refriger")) return "Refrigerator"
    if (lower.includes("freezer")) return "Freezer"
    if (lower.includes("dish") || lower.includes("glass") || lower.includes("ware")) return "Dishwasher"
    if (lower.includes("mixer")) return "Mixer"
    if (lower.includes("griddle") || lower.includes("grill")) return "Griddle"
    if (lower.includes("coffee") || lower.includes("espresso")) return "Coffee Machine"
    if (lower.includes("prep") || lower.includes("processor") || lower.includes("slicer")) return "Prep Equipment"
    if (lower.includes("oven") || lower.includes("range")) return "Oven"
    return "Other"
  }

  function applySuggestionToShippingSpecs(suggestion: QuickListAiResponse) {
    const parsedDimensions = parseDimensionsToCm(suggestion.dimensions)

    setShippingSpecBrand(suggestion.brand || shippingSpecBrand)
    setShippingSpecModel(suggestion.model || suggestion.gc_number || shippingSpecModel)
    setShippingSpecSerial(suggestion.serial_number || shippingSpecSerial)
    setShippingSpecGcNumber(suggestion.gc_number || shippingSpecGcNumber)
    setShippingSpecCategory(shippingCategoryFrom(suggestion.subcategory || suggestion.category || suggestion.suggested_title))
    setShippingSpecPowerType(shippingPowerTypeFrom(suggestion.power_type || suggestion.gas_or_electric || suggestion.gas_type))
    setShippingSpecVoltage(suggestion.voltage || shippingSpecVoltage)
    setShippingSpecCurrent(extractConfirmedNumber(suggestion.amps) || shippingSpecCurrent)
    setShippingSpecPhase(
      /3|three/i.test(suggestion.electrical_phase || suggestion.power_type || "") ? "3" :
      /1|single/i.test(suggestion.electrical_phase || suggestion.power_type || "") ? "1" :
      shippingSpecPhase
    )
    setShippingSpecGasType(suggestion.gas_type || shippingSpecGasType)
    if (parsedDimensions) {
      setShippingSpecWidth(parsedDimensions[0])
      setShippingSpecDepth(parsedDimensions[1])
      setShippingSpecHeight(parsedDimensions[2])
    }
    setShippingSpecWeight(extractConfirmedNumber(suggestion.estimated_weight_kg ?? suggestion.weight) || shippingSpecWeight)
    setShippingSpecForkliftRequired(aiBoolean(suggestion.tail_lift_required, shippingSpecForkliftRequired))
    setShippingSpecNotes(suggestion.delivery_notes || shippingSpecNotes)
  }

  function extractNumber(value: string) {
    const match = value.match(/\d+(?:\.\d+)?/)
    return match ? match[0] : ""
  }

  function extractConfirmedNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return String(value)
    const text = typeof value === "string" ? value : ""
    if (!text || /needs seller confirmation|unknown|estimate/i.test(text)) return ""
    return extractNumber(text)
  }

  function aiBoolean(value: unknown, fallback = false) {
    if (typeof value === "boolean") return value
    if (typeof value !== "string") return fallback
    if (/^(true|yes|required|available)$/i.test(value.trim())) return true
    if (/^(false|no|not required|none)$/i.test(value.trim())) return false
    return fallback
  }

  function parseDimensionsToCm(value: string) {
    const match = value.match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/)
    if (!match) return null

    const unitLooksLikeMm = /mm/i.test(value)
    const numbers = [Number(match[1]), Number(match[2]), Number(match[3])]
    const shouldConvertFromMm = unitLooksLikeMm || numbers.some((numberValue) => numberValue > 300)

    return numbers.map((numberValue) => {
      const cmValue = shouldConvertFromMm ? numberValue / 10 : numberValue
      return Number.isFinite(cmValue) && cmValue > 0 ? String(Math.round(cmValue)) : ""
    })
  }

  function deliveryOptionFromShippingClass(value: string) {
    const lower = value.toLowerCase()
    if (lower.includes("courier")) return "Courier delivery available"
    if (lower.includes("pallet")) return "Pallet delivery available"
    if (lower.includes("local")) return "Local delivery available"
    if (lower.includes("specialist") || lower.includes("quote")) return "Delivery quote required"
    return "Delivery quote required"
  }

  function formatConfidence(value: number) {
    if (value >= 0.72) return "High"
    if (value >= 0.42) return "Medium"
    return "Low"
  }

  function suggestionDetails(suggestion: QuickListAiResponse) {
    return [
      suggestion.brand && `Brand: ${suggestion.brand}`,
      suggestion.model && `Model: ${suggestion.model}`,
      suggestion.serial_number && `Serial number: ${suggestion.serial_number}`,
      suggestion.gc_number && `GC number: ${suggestion.gc_number}`,
      suggestion.dimensions && `Dimensions: ${suggestion.dimensions}`,
      suggestion.weight && `Weight: ${suggestion.weight}`,
      suggestion.power_type && !/unknown/i.test(suggestion.power_type) && `Power type: ${suggestion.power_type}`,
      suggestion.gas_type && `Gas type: ${suggestion.gas_type}`,
      suggestion.voltage && `Voltage: ${suggestion.voltage}`,
      suggestion.amps && `Amps: ${suggestion.amps}`,
      suggestion.kw_rating && `kW rating: ${suggestion.kw_rating}`,
      suggestion.electrical_phase && `Electrical phase: ${suggestion.electrical_phase}`,
      suggestion.manual_url && `Manual/spec link: ${suggestion.manual_url}`,
      suggestion.shipping_class && `Suggested delivery: ${suggestion.shipping_class}`,
    ].filter(Boolean) as string[]
  }

  function buildDescriptionFromSuggestion(suggestion: QuickListAiResponse) {
    const details = suggestionDetails(suggestion)
    const sections = [suggestion.description.trim()]

    if (details.length > 0) {
      sections.push(`Key details from CaterBot:\n${details.map((detail) => `- ${detail}`).join("\n")}`)
    }

    sections.push(QUICKLIST_AI_WARNING)
    return sections.filter(Boolean).join("\n\n")
  }

  async function uploadListingImages(ownerId: string) {
    const supabase = createClient()
    const urls: string[] = []

    for (const file of imageFiles) {
      const fileExt = file.name.split(".").pop() || "jpg"
      const fileName = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(fileName)
      if (data?.publicUrl) {
        urls.push(data.publicUrl)
      }
    }

    return urls
  }

  async function uploadSpecPlateImage(ownerId: string) {
    if (!specPlateFile) return ""

    const supabase = createClient()
    const fileExt = specPlateFile.name.split(".").pop() || "jpg"
    const fileName = `${ownerId}/spec-plates/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(fileName, specPlateFile, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(fileName)
    return data?.publicUrl || ""
  }

  async function scanQuickListAi() {
    if (!userId) {
      requireLogin()
      return
    }

    if (imageFiles.length === 0 && !specPlateFile) {
      setAiError("Upload item photos or a spec plate first.")
      return
    }

    setAiLoading(true)
    setAiError("")
    setAiNotice("")
    setQuickListApplied(false)

    try {
      const itemImages = await Promise.all(
        imageFiles.map(async (file, index) => {
          const dataUrl = imagePreviews[index] || (await fileToDataUrl(file))
          return {
            imageBase64: getBase64Payload(dataUrl),
            fileType: getDataUrlFileType(dataUrl, file.type),
            fileName: file.name,
          }
        })
      )
      const specPlateDataUrl = specPlateFile ? await resizeSpecPlateForAi(specPlateFile) : ""
      const specPlate = specPlateFile
        ? {
            imageBase64: getBase64Payload(specPlateDataUrl),
            fileType: getDataUrlFileType(specPlateDataUrl, specPlateFile.type),
            fileName: specPlateFile.name,
          }
        : null
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 90000)
      const res = await fetch("/api/ai-listing", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemImages,
          specPlate,
        }),
      }).finally(() => window.clearTimeout(timeout))
      const suggestion = (await res.json()) as QuickListAiResponse

      if (!res.ok) {
        throw new Error("CaterBot could not read these photos. Add clearer images or enter details manually.")
      }

      setQuickListResult(suggestion)
      applySuggestionToVisibleForm(suggestion)

      if (suggestion.description?.includes("CaterBot vision is not configured")) {
        setAiError("CaterBot needs clearer photos. You can still enter the details manually.")
      } else {
        setAiNotice("CaterBot filled what it could. Please check the details.")
      }
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "CaterBot timed out while reading these images. Try a clearer crop of the spec plate, then scan again."
          : error instanceof Error
            ? error.message
            : "CaterBot could not read these photos. Add details manually."
      setAiError(message)
    } finally {
      setAiLoading(false)
    }
  }

  function applySuggestionToVisibleForm(suggestion: QuickListAiResponse) {
    const nextCategory = suggestion.category || "Catering Equipment"
    const subcategories = subcategoriesForCategory(nextCategory)
    const nextSubcategory =
      suggestion.subcategory && subcategories.includes(suggestion.subcategory)
        ? suggestion.subcategory
        : subcategories[0] || ""
    const nextDeliveryOption = deliveryOptionFromShippingClass(suggestion.shipping_class)
    const parsedDimensions = parseDimensionsToCm(suggestion.dimensions)
    const aiWeight = extractConfirmedNumber(suggestion.estimated_weight_kg ?? suggestion.weight)
    const aiPalletLength = extractConfirmedNumber(suggestion.pallet_length_cm)
    const aiPalletWidth = extractConfirmedNumber(suggestion.pallet_width_cm)
    const aiPalletHeight = extractConfirmedNumber(suggestion.pallet_height_cm)
    const aiPalletCount = extractConfirmedNumber(suggestion.pallet_count)
    const preferredSourceUrl = preferredManualSourceUrl(suggestion)

    setTitle(suggestion.suggested_title || suggestion.title || title)
    setCategory(nextCategory)
    setSubcategory(nextSubcategory)
    setCondition(normaliseCondition(suggestion.condition))
    setDescription(suggestion.description || description)
    applySuggestionToShippingSpecs(suggestion)
    setPowerType(normalisePowerType(suggestion.power_type || suggestion.gas_or_electric || ""))
    setDimensions(suggestion.dimensions)
    setDeliveryOption(nextDeliveryOption)
    setDeliveryMethod(/courier|pallet|delivery/i.test(nextDeliveryOption) ? "caterbids_delivery" : "buyer_courier")
    const validatedSource = Boolean(suggestion.manual_source_validated)
    setManualsAvailable(validatedSource)
    setManualSourceUrl(validatedSource ? preferredSourceUrl : "")
    setSpecSourceUrl(validatedSource ? preferredSourceUrl : "")
    setManualSourceName(suggestion.manual_source_name || "Verified manual/spec source")
    setManualSourceType(suggestion.manual_source_type || "")
    setManualSourceValidated(validatedSource)
    setManualSourceLastCheckedAt(suggestion.manual_source_last_checked_at || "")
    setManualSourceMatchNotes(
      suggestion.manual_source_match_notes ||
        "CaterBot could not verify a reliable manual/spec source for this item."
    )
    setManualSourceUsefulDetails(
      Array.isArray(suggestion.manual_source_useful_details)
        ? suggestion.manual_source_useful_details
        : []
    )
    setSpecConfidence(
      String(suggestion.ai_spec_confidence || suggestion.confidence || formatConfidence(suggestion.confidence_score))
    )
    setSpecsVerifiedBySeller(false)
    setSourceRejectedBySeller(false)
    setPalletCount(aiPalletCount || "1")
    setInsuranceValue(price ? String(Number(price.replace(/[^0-9.]/g, "")) || "") : "")
    if (suggestion.delivery_notes) {
      setDeliveryNotes(suggestion.delivery_notes)
    }

    if (aiWeight) {
      setWeightKg(aiWeight)
      setDeliverySizeUnknown(false)
    }

    if (aiPalletLength && aiPalletWidth && aiPalletHeight) {
      setLengthCm(aiPalletLength)
      setWidthCm(aiPalletWidth)
      setHeightCm(aiPalletHeight)
      setDeliverySizeUnknown(false)
    } else if (parsedDimensions) {
      setLengthCm(parsedDimensions[0])
      setWidthCm(parsedDimensions[1])
      setHeightCm(parsedDimensions[2])
      setDeliverySizeUnknown(false)
    }

    if (/pallet/i.test(suggestion.shipping_class)) {
      setPalletReady(true)
      setTailLiftRequired(true)
    } else if (/specialist|quote/i.test(suggestion.shipping_class)) {
      setTailLiftRequired(true)
    }
    setTailLiftRequired(aiBoolean(suggestion.tail_lift_required, /pallet|specialist|quote/i.test(suggestion.shipping_class)))
    setForkliftAvailable(aiBoolean(suggestion.forklift_available, forkliftAvailable))
    setCommercialPremises(aiBoolean(suggestion.commercial_premises, commercialPremises))

    setQuickListApplied(true)
  }

  function applyQuickListToListing() {
    if (!userId) {
      requireLogin()
      return
    }

    if (!quickListResult) {
      setAiError("Scan photos first, then review the CaterBot suggestions.")
      return
    }

    applySuggestionToVisibleForm(quickListResult)
    const validatedSource = Boolean(quickListResult.manual_source_validated)
    setAiNotice(
      validatedSource
        ? "CaterBot suggestions applied. Check the source before publishing."
        : "CaterBot suggestions applied. Check the data plate manually."
    )
  }

  function rejectCaterBotSource() {
    setManualSourceUrl("")
    setSpecSourceUrl("")
    setManualSourceName("")
    setManualSourceType("")
    setManualSourceValidated(false)
    setManualSourceLastCheckedAt("")
    setManualSourceMatchNotes("Seller rejected the CaterBot product source.")
    setManualSourceUsefulDetails([])
    setSpecConfidence("source rejected")
    setSpecsVerifiedBySeller(false)
    setSourceRejectedBySeller(true)
  }

  function productMatchIdentity() {
    const brand = shippingSpecBrand || quickListResult?.brand || ""
    const model = shippingSpecModel || quickListResult?.model || quickListResult?.gc_number || ""
    return { brand: brand.trim(), model: model.trim() }
  }

  function applyValidatedManualSource(
    source: NonNullable<CaterBotSourceValidationResponse["source"]>,
    shipping?: CaterBotSourceValidationResponse["shipping"]
  ) {
    const sourceDimensions = source.extractedSpecs?.dimensions || ""
    const sourcePackedDimensions = source.extractedSpecs?.packedDimensions || ""
    const sourceWeight = source.extractedSpecs?.grossWeight || source.extractedSpecs?.weight || ""
    const parsedDimensions = !/needs seller check/i.test(sourceDimensions) ? parseDimensionsToCm(sourceDimensions) : null
    const parsedPackedDimensions = !/needs seller check/i.test(sourcePackedDimensions)
      ? parseDimensionsToCm(sourcePackedDimensions)
      : null
    const parsedWeight = !/needs seller check/i.test(sourceWeight) ? extractConfirmedNumber(sourceWeight) : ""

    if (parsedDimensions) {
      setShippingSpecWidth(parsedDimensions[0])
      setShippingSpecDepth(parsedDimensions[1])
      setShippingSpecHeight(parsedDimensions[2])
      setDeliverySizeUnknown(false)
    }

    const deliveryDimensions = parsedPackedDimensions || parsedDimensions
    if (deliveryDimensions) {
      setLengthCm(deliveryDimensions[1])
      setWidthCm(deliveryDimensions[0])
      setHeightCm(deliveryDimensions[2])
      setDeliverySizeUnknown(false)
    }

    if (parsedWeight) {
      setShippingSpecWeight(parsedWeight)
      setWeightKg(parsedWeight)
      setDeliverySizeUnknown(false)
    }

    if (source.extractedSpecs?.voltage && !/needs seller check/i.test(source.extractedSpecs.voltage)) {
      setShippingSpecVoltage(source.extractedSpecs.voltage)
    }
    if (source.extractedSpecs?.phase && !/needs seller check/i.test(source.extractedSpecs.phase)) {
      setShippingSpecPhase(/3|three/i.test(source.extractedSpecs.phase) ? "3" : "1")
    }
    if (source.extractedSpecs?.amps && !/needs seller check/i.test(source.extractedSpecs.amps)) {
      setShippingSpecCurrent(extractConfirmedNumber(source.extractedSpecs.amps))
    }
    if (source.extractedSpecs?.gasType && !/needs seller check/i.test(source.extractedSpecs.gasType)) {
      setShippingSpecGasType(source.extractedSpecs.gasType)
    }

    if (shipping?.deliveryType) setDeliveryOption(shipping.deliveryType)
    if (shipping?.deliveryNotes) setDeliveryNotes(shipping.deliveryNotes)
    if (shipping?.palletDeliveryRecommended) setPalletReady(true)
    if (shipping?.tailLiftRequired) setTailLiftRequired(true)
    if (shipping?.forkliftRequired) setShippingSpecForkliftRequired(true)

    setManualSourceUrl(source.url || "")
    setSpecSourceUrl(source.url || "")
    setManualSourceName(source.sourceName || "Verified manual/spec source")
    setManualSourceType(source.sourceType || "Verified source")
    setManualSourceValidated(Boolean(source.url))
    setManualSourceLastCheckedAt(source.checkedAt || new Date().toISOString())
    setManualSourceMatchNotes(source.matchNotes || "CaterBot verified the source against this item's plate details.")
    setManualSourceUsefulDetails(Array.isArray(source.usefulDetails) ? source.usefulDetails : [])
    setSpecConfidence(source.confidence || "medium")
    setSpecsVerifiedBySeller(false)
    setSourceRejectedBySeller(false)
    setManualLinkPanelOpen(false)
    setManualLinkError("")
    setAiNotice("Verified source found. Confirm it matches your item before publishing.")
  }

  async function validateManualSourceUrl(sourceUrl?: string) {
    const { brand, model } = productMatchIdentity()

    if (!brand || !model) {
      setManualLinkError("Add the brand and model from the spec plate first.")
      return
    }

    setManualLinkChecking(true)
    setManualLinkError("")
    setAiNotice("")

    try {
      const searchingWithoutManualUrl = !sourceUrl
      const res = await fetch(
        searchingWithoutManualUrl ? "/api/caterbot/source-search" : "/api/caterbot/validate-source",
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          model,
          product_title: title || quickListResult?.suggested_title || quickListResult?.title || "",
          category,
          equipmentType: shippingSpecCategory || subcategory || category,
          equipment_type: shippingSpecCategory || subcategory || category,
          fuel_type: shippingSpecPowerType || powerType,
          voltage: shippingSpecVoltage,
          phase: shippingSpecPhase,
          amps: shippingSpecCurrent,
          power_rating: quickListResult?.kw_rating || "",
          gas_rating: shippingSpecGasType,
          sourceUrl: sourceUrl || undefined,
        }),
      })
      const data = (await res.json()) as CaterBotSourceValidationResponse
      const checkedAt = data.source?.checkedAt || data.checkedAt || new Date().toISOString()
      setManualSourceLastCheckedAt(checkedAt)

      if (!res.ok || data.sourceFound === false || !data.source?.url) {
        const message = data.error || `CaterBot could not verify a reliable manual/spec source for ${brand} ${model}.`
        setManualSourceUrl("")
        setSpecSourceUrl("")
        setManualSourceName("")
        setManualSourceType("")
        setManualSourceValidated(false)
        setSpecsVerifiedBySeller(false)
        setSourceRejectedBySeller(false)
        setSpecConfidence("low")
        setManualSourceUsefulDetails([])
        setManualSourceMatchNotes(message)
        setManualLinkError(res.ok ? "" : message)
        return
      }

      applyValidatedManualSource(data.source, data.shipping)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not verify that manual/spec source."
      setManualLinkError(message)
      setManualSourceValidated(false)
      setSpecsVerifiedBySeller(false)
      setManualSourceMatchNotes(message)
    } finally {
      setManualLinkChecking(false)
    }
  }

  function handlePublish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPublishError("")

    if (!userId) {
      requireLogin()
      return
    }

    const formData = new FormData(event.currentTarget)
    const requiredTitle = ((formData.get("title") as string) || "").trim()
    const requiredPrice = ((formData.get("price") as string) || "").trim()
    const requiredLocation = ((formData.get("location") as string) || "").trim()
    const requiredCity = ((formData.get("city") as string) || "").trim()
    const sizeUnknown = formData.get("delivery_size_unknown") === "on"
    const selectedDeliveryMethod = (formData.get("delivery_method") as string) || "collection_only"
    const usesCaterBidsDelivery = selectedDeliveryMethod === "caterbids_delivery"
    const usesAnyDelivery = selectedDeliveryMethod !== "collection_only"
    const hasRequiredDeliverySize =
      hasPositiveNumber(formData.get("weight_kg")) &&
      hasPositiveNumber(formData.get("length_cm")) &&
      hasPositiveNumber(formData.get("width_cm")) &&
      hasPositiveNumber(formData.get("height_cm"))
    const hasListingPhoto = imageFiles.length > 0 || imagePreviews.length > 0 || uploadedImageUrls.length > 0

    if (!requiredTitle || !requiredPrice || (!requiredLocation && !requiredCity)) {
      setPublishError("Add title, price and location.")
      return
    }

    if (!hasListingPhoto) {
      setPublishError("Add at least one item photo.")
      return
    }

    if (formData.get("listing_info_confirmed") !== "on") {
      setPublishError("Confirm the listing information is accurate.")
      return
    }

    if (usesCaterBidsDelivery && !hasRequiredDeliverySize) {
      setPublishError("Add kg and cm to enable delivery quotes.")
      return
    }

    if (usesCaterBidsDelivery && !((formData.get("collection_postcode") as string) || "").trim()) {
      setPublishError("Add collection postcode.")
      return
    }

    if (usesCaterBidsDelivery && !((formData.get("seller_phone") as string) || "").trim()) {
      setPublishError("Add seller phone number.")
      return
    }

    if (usesCaterBidsDelivery && !((formData.get("preferred_collection_date") as string) || "").trim()) {
      setPublishError("Add preferred collection date.")
      return
    }

    if (usesCaterBidsDelivery && !hasPositiveNumber(formData.get("pallet_count"))) {
      setPublishError("Add number of pallets.")
      return
    }

    if (usesAnyDelivery && formData.get("delivery_details_confirmed") !== "on") {
      setPublishError("Confirm delivery details.")
      return
    }

    if (selectedDeliveryMethod === "collection_only" && !((formData.get("collection_postcode") as string) || "").trim()) {
      setPublishError("Add collection postcode.")
      return
    }

    if (manualSourceHasVerifiedUrl && formData.get("specs_verified_by_seller") !== "on") {
      setPublishError("Confirm the product source matches your item.")
      return
    }

    if (sizeUnknown && !usesCaterBidsDelivery) {
      formData.set("weight_kg", "")
      formData.set("length_cm", "")
      formData.set("width_cm", "")
      formData.set("height_cm", "")
    }

    formData.set("price", formatPrice(requiredPrice))
    if (!requiredLocation && requiredCity) {
      formData.set("location", requiredCity)
    }

    startPublishing(async () => {
      try {
        const newImageUrls =
          imageFiles.length > 0
            ? await uploadListingImages(userId)
            : uploadedImageUrls

        setUploadedImageUrls(newImageUrls)
        formData.set("image", newImageUrls[0] || "")
        formData.set("images", JSON.stringify(newImageUrls))
        const specPlateUrl = specPlateFile ? await uploadSpecPlateImage(userId) : ""
        formData.set("spec_plate_image_url", specPlateUrl || specPlatePreview)
      } catch (error) {
        if (isMissingStorageBucketError(error) && (imagePreviews.length > 0 || specPlatePreview)) {
          console.warn(
            `${LISTING_IMAGES_BUCKET} bucket is missing. Publishing the Supabase listing with temporary image previews.`
          )
          setUploadedImageUrls(imagePreviews)
          formData.set("image", imagePreviews[0] || "")
          formData.set("images", JSON.stringify(imagePreviews))
          formData.set("spec_plate_image_url", specPlatePreview)
        } else {
          setPublishError(error instanceof Error ? error.message : "Could not upload listing images.")
          return
        }
      }

      const result = await createListing(formData)
      if (!result) return

      setPublishError(result.error)
    })
  }

  async function checkInterparcelPreview() {
    setInterparcelPreviewError("")
    setInterparcelPreviewQuotes([])
    setSelectedInterparcelPreviewQuote(null)
    setInterparcelPreviewProvider("")

    if (!collectionPostcode.trim()) {
      setInterparcelPreviewError("Add the collection postcode first.")
      return
    }

    if (!interparcelPreviewPostcode.trim()) {
      setInterparcelPreviewError("Add a sample buyer delivery postcode.")
      return
    }

    if (deliverySizeUnknown || !weightKg || !lengthCm || !widthCm || !heightCm) {
      setInterparcelPreviewError("Add checked pallet weight and dimensions before checking Interparcel pricing.")
      return
    }

    setInterparcelPreviewLoading(true)

    try {
      const res = await fetch("/api/delivery/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectionPostcode,
          deliveryPostcode: interparcelPreviewPostcode,
          weightKg,
          lengthCm,
          widthCm,
          heightCm,
          palletReady,
          tailLiftRequired,
          forkliftAvailable,
          commercialPremises,
          palletCount,
          insuranceValue: insuranceValue || price,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not check Interparcel pricing.")
      }

      setInterparcelPreviewProvider(data.provider || "Interparcel-ready CaterBids Delivery")
      setInterparcelPreviewQuotes(Array.isArray(data.quotes) ? data.quotes : [])
    } catch (error) {
      setInterparcelPreviewError(error instanceof Error ? error.message : "Could not check Interparcel pricing.")
    } finally {
      setInterparcelPreviewLoading(false)
    }
  }

  const quickListManualSourceIsVerified = Boolean(quickListResult?.manual_source_validated)
  const quickListManualSourceUrl =
    quickListResult && quickListManualSourceIsVerified ? preferredManualSourceUrl(quickListResult) : ""
  const manualSourceHasVerifiedUrl =
    Boolean(manualSourceValidated) &&
    Boolean(manualSourceUrl || specSourceUrl) &&
    !sourceRejectedBySeller
  const deliveryRecommendation = deliveryRecommendationFromSpecs({
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    category,
    subcategory,
    powerType,
    hasVerifiedSource: manualSourceHasVerifiedUrl,
  })
  const productMatch = productMatchIdentity()
  const productMatchName = [productMatch.brand, productMatch.model].filter(Boolean).join(" ")
  const productMatchFailureText = productMatchName
    ? `CaterBot could not verify an exact manual/spec source for ${productMatchName}. Please add a link manually.`
    : "CaterBot could not verify an exact manual/spec source. Please add a link manually."
  const sourceStatusText = manualSourceHasVerifiedUrl
    ? "Verified source found"
    : /not connected/i.test(manualSourceMatchNotes)
      ? "Not connected"
      : /failed|could not complete/i.test(manualSourceMatchNotes)
        ? "Search failed"
        : manualSourceLastCheckedAt
          ? "Search completed — no reliable match"
          : "No reliable match"
  const showCaterBotProductMatch =
    Boolean(quickListResult) || manualSourceHasVerifiedUrl || Boolean(manualSourceMatchNotes) || sourceRejectedBySeller
  const trustedSearchLinks = trustedSourceSearchLinks({
    brand: productMatch.brand,
    model: productMatch.model,
    title: title || quickListResult?.suggested_title || quickListResult?.title || "",
    equipmentType: [shippingSpecCategory, subcategory, category, shippingSpecPowerType, shippingSpecGasType]
      .filter(Boolean)
      .join(" "),
  })
  const deliveryMeasurementsReady = Boolean(weightKg && lengthCm && widthCm && heightCm)
  const showGasFields = shippingSpecPowerType === "Gas" || shippingSpecPowerType === "Both"
  const showElectricFields = shippingSpecPowerType === "Electric" || shippingSpecPowerType === "Both"
  const itemDimensionsValue =
    dimensions || (deliveryMeasurementsReady ? `${lengthCm} x ${widthCm} x ${heightCm} cm` : "")
  const reviewLocation = city || location || collectionCity || "Not added"
  const reviewDeliveryOption = deliveryOptionForDeliveryMethod(deliveryMethod)

  return (
    <main className="app-bg min-h-screen px-4 py-6 text-white">
      {!authChecked ? (
        <div className="flex min-h-[70vh] items-center justify-center text-white/60">
          Checking your free account...
        </div>
      ) : (
      <div className="mx-auto max-w-md">
      
      {/* BACK BUTTON */}
      <button
        onClick={() => router.back()}
        className="soft-button mb-4 rounded-2xl px-3 py-2 text-sm"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-center">
        Cater<span className="text-[#FF6B00]">Bids</span>.UK
      </h1>

      <p className="text-center text-[#FF6B00] text-sm mb-6">
        BUY • SELL • SAVE
      </p>

      <div className="premium-card mb-4 rounded-3xl p-4">
        <h2 className="text-xl font-black text-white">Sell your item</h2>
        <p className="mt-1 text-sm text-white/60">Upload photos, check the details, publish.</p>
      </div>

      <div className="premium-card mb-4 rounded-3xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B00]/18 text-[#FF6B00]">
            <ImagePlus size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FF6B00]">Add photos</p>
            <h2 className="text-xl font-extrabold text-white">Photos</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">Add item photos and the spec plate if you have it.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#FF6B00]/50 bg-[#FF6B00]/12 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#FF6B00]/18">
            <ImagePlus size={18} aria-hidden="true" />
            Upload item photos
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-white/12">
            <UploadCloud size={18} aria-hidden="true" />
            Upload spec plate
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleSpecPlateSelect}
              className="hidden"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/70">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {imageFiles.length}/6 item photos
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {specPlateFile ? "Spec plate added" : "No spec plate yet"}
          </span>
        </div>

        {(imagePreviews.length > 0 || specPlatePreview) && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {imagePreviews.map((src, index) => (
              <div
                key={`${src}-${index}`}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20"
              >
                <NextImage
                  src={src}
                  alt={`Listing preview ${index + 1}`}
                  width={180}
                  height={112}
                  unoptimized
                  className="h-28 w-full object-cover"
                />

                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-[#FF6B00] px-2 py-1 text-[10px] font-bold text-white">
                    Main image
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => removeSelectedImage(index)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white"
                  aria-label={`Remove listing image ${index + 1}`}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))}

            {specPlatePreview && (
              <div className="relative overflow-hidden rounded-xl border border-[#FF6B00]/45 bg-black/20">
                <NextImage
                  src={specPlatePreview}
                  alt="Spec plate preview"
                  width={180}
                  height={112}
                  unoptimized
                  className="h-28 w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#002E5D]">
                  Spec plate
                </span>
                <button
                  type="button"
                  onClick={removeSpecPlate}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white"
                  aria-label="Remove spec plate"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={scanQuickListAi}
            disabled={aiLoading || (imageFiles.length === 0 && !specPlateFile)}
            className="premium-button flex items-center justify-center gap-2 rounded-2xl py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            <ScanSearch size={18} aria-hidden="true" />
            {aiLoading ? "CaterBot checking..." : "CaterBot check & auto-fill"}
          </button>
        </div>

        {aiError && (
          <p className="mt-3 rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200">
            {aiError}
          </p>
        )}

        {aiNotice && !aiError && (
          <p className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">
            {aiNotice}
          </p>
        )}

        {quickListApplied && !aiError && (
          <p className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">
            Filled by CaterBot. Please check before publishing.
          </p>
        )}
      </div>

      {/* FORM */}
      <form onSubmit={handlePublish} className="space-y-4">
        <section className="rounded-3xl bg-white p-5 text-[#002E5D] shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FF6B00]">Check item details</p>
              <h2 className="mt-1 text-xl font-black">Item details</h2>
            </div>
            {quickListApplied && (
              <span className="rounded-full bg-[#FF6B00]/10 px-3 py-1 text-xs font-black text-[#FF6B00]">
                Filled by CaterBot
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-black">Listing title</span>
              <input
                name="title"
                placeholder="e.g. Lincat electric griddle"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-black">Category</span>
                <select
                  name="category"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  value={category}
                  onChange={(e) => {
                    const nextCategory = e.target.value
                    setCategory(nextCategory)
                    setSubcategory(subcategoriesForCategory(nextCategory)[0] || "")
                  }}
                >
                  {CATEGORY_OPTIONS.filter((item) => item !== "All Categories").map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              {subcategoriesForCategory(category).length > 0 && (
                <label className="block">
                  <span className="mb-1 block text-sm font-black">Type</span>
                  <select
                    name="subcategory"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                  >
                    {subcategoriesForCategory(category).map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-black">Condition</span>
                <select
                  name="condition"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  {CONDITION_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Price</span>
                <input
                  name="price"
                  placeholder="e.g. 250"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-black">Brand</span>
                <input
                  name="spec_brand"
                  value={shippingSpecBrand}
                  onChange={(event) => setShippingSpecBrand(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Model</span>
                <input
                  name="spec_model"
                  value={shippingSpecModel}
                  onChange={(event) => setShippingSpecModel(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-black">Town or city</span>
              <input
                name="city"
                placeholder="e.g. Birmingham"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value)
                  setLocation(e.target.value)
                }}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-black">Short description</span>
              <textarea
                name="description"
                placeholder="Briefly describe condition, use and what is included."
                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>

          {showCaterBotProductMatch && (
            <div className="mt-4 rounded-2xl border border-[#FF6B00]/20 bg-[#FF6B00]/10 p-3">
              <p className="text-sm font-black">
                {manualSourceHasVerifiedUrl ? "CaterBot found a product source." : "Manual/spec source not verified yet."}
              </p>
              {!manualSourceHasVerifiedUrl && (
                <p className="mt-1 text-sm font-semibold text-[#002E5D]/70">
                  CaterBot could not verify an exact manual/spec source. You can still list using your own checks.
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {manualSourceHasVerifiedUrl ? (
                  <>
                    <a
                      href={manualSourceUrl || specSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white"
                    >
                      Open source
                    </a>
                    <button
                      type="button"
                      onClick={() => setSpecsVerifiedBySeller(true)}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-800"
                    >
                      {specsVerifiedBySeller ? "Source confirmed" : "Confirm source"}
                    </button>
                    <button
                      type="button"
                      onClick={rejectCaterBotSource}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-700"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => validateManualSourceUrl()}
                      disabled={manualLinkChecking}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
                    >
                      {manualLinkChecking ? "Searching sources..." : "Try again"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManualLinkPanelOpen((current) => !current)
                        setManualLinkError("")
                      }}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl border border-[#002E5D]/15 bg-white px-4 py-3 text-sm font-black text-[#002E5D]"
                    >
                      Add link manually
                    </button>
                  </>
                )}
              </div>

              {!manualSourceHasVerifiedUrl && trustedSearchLinks.length > 0 && (
                <div className="mt-3 rounded-2xl border border-[#002E5D]/10 bg-white p-3">
                  <p className="text-sm font-black">Search trusted sources</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {trustedSearchLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-xl border border-[#002E5D]/15 bg-slate-50 px-3 py-2 text-xs font-black text-[#002E5D]"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {manualLinkPanelOpen && (
                <div className="mt-3 rounded-2xl border border-[#002E5D]/10 bg-white p-3">
                  <label className="mb-1 block text-sm font-black">Manual/spec URL</label>
                  <input
                    value={manualLinkInput}
                    onChange={(event) => setManualLinkInput(event.target.value)}
                    placeholder="https://manufacturer.co.uk/model-spec-sheet"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  />
                  <button
                    type="button"
                    onClick={() => validateManualSourceUrl(manualLinkInput)}
                    disabled={manualLinkChecking || !manualLinkInput.trim()}
                    className="mt-2 w-full rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manualLinkChecking ? "Validating..." : "Validate source link"}
                  </button>
                </div>
              )}

              {manualLinkError && (
                <p className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
                  {manualLinkError}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 text-[#002E5D] shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FF6B00]">Power & safety</p>
          <h2 className="mt-1 text-xl font-black">Power and safety</h2>

          <div className="mt-4">
            <p className="mb-2 text-sm font-black">Power/fuel type</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SHIPPING_POWER_TYPES.map((option) => (
                <label
                  key={option}
                  className={`flex items-center justify-center rounded-2xl border px-3 py-3 text-sm font-black ${
                    shippingSpecPowerType === option
                      ? "border-[#FF6B00] bg-[#FF6B00] text-white"
                      : "border-slate-200 bg-white text-[#002E5D]"
                  }`}
                >
                  <input
                    type="radio"
                    name="spec_power_type"
                    value={option}
                    checked={shippingSpecPowerType === option}
                    onChange={() => setShippingSpecPowerType(option)}
                    className="sr-only"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          {showGasFields && (
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-black">Gas type</span>
              <select
                name="spec_gas_type"
                value={shippingSpecGasType}
                onChange={(event) => setShippingSpecGasType(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
              >
                <option value="">Not sure</option>
                <option value="Natural Gas">Natural Gas</option>
                <option value="LPG">LPG</option>
                <option value="Propane">LPG / Propane</option>
              </select>
            </label>
          )}

          {showElectricFields && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-black">Voltage</span>
                <input
                  name="spec_voltage"
                  value={shippingSpecVoltage}
                  onChange={(event) => setShippingSpecVoltage(event.target.value)}
                  placeholder="Seller to confirm"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-black">Phase</span>
                <select
                  name="spec_phase"
                  value={shippingSpecPhase}
                  onChange={(event) => setShippingSpecPhase(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                >
                  <option value="">Not sure</option>
                  <option value="1">1 phase</option>
                  <option value="3">3 phase</option>
                </select>
              </label>
            </div>
          )}

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-black">Safety note / install note</span>
            <textarea
              name="service_history"
              value={shippingSpecNotes}
              onChange={(event) => setShippingSpecNotes(event.target.value)}
              placeholder="Optional"
              className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
            />
          </label>
        </section>

        <section className="rounded-3xl bg-white p-5 text-[#002E5D] shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FF6B00]">Delivery setup</p>
          <h2 className="mt-1 text-xl font-black">Delivery setup</h2>

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-black">Delivery option</span>
            <select
              name="delivery_method"
              value={deliveryMethod}
              onChange={(event) => {
                const nextMethod = event.target.value
                setDeliveryMethod(nextMethod)
                setDeliveryOption(deliveryOptionForDeliveryMethod(nextMethod))
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
            >
              <option value="collection_only">Collection only</option>
              <option value="caterbids_delivery">Delivery available through CaterBids</option>
              <option value="buyer_courier">Seller arranged delivery</option>
            </select>
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-black">Collection postcode</span>
              <input
                name="collection_postcode"
                value={collectionPostcode}
                onChange={(event) => setCollectionPostcode(event.target.value.toUpperCase())}
                placeholder="e.g. B12 0AB"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
              />
            </label>
          </div>

          {deliveryMethod === "caterbids_delivery" && (
            <div className="mt-4 space-y-3">
              {!deliveryMeasurementsReady && (
                <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-[#8A3A00]">
                  Add kg and cm to enable delivery quotes.
                </p>
              )}
              {deliveryMeasurementsReady && quickListApplied && (
                <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
                  Please check these measurements.
                </p>
              )}

              <label className="block">
                <span className="mb-1 block text-sm font-black">Collection full address</span>
                <textarea
                  name="collection_full_address"
                  value={collectionFullAddress}
                  onChange={(event) => setCollectionFullAddress(event.target.value)}
                  placeholder="Exact pickup address"
                  className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-black">Collection contact name</span>
                  <input
                    name="seller_contact_name"
                    value={sellerContactName}
                    onChange={(event) => setSellerContactName(event.target.value)}
                    placeholder="Seller to confirm"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-black">Collection phone number</span>
                  <input
                    name="seller_phone"
                    value={sellerPhone}
                    onChange={(event) => setSellerPhone(event.target.value)}
                    placeholder="Seller to confirm"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Preferred collection date</span>
                <input
                  name="preferred_collection_date"
                  value={preferredCollectionDate}
                  onChange={(event) => setPreferredCollectionDate(event.target.value)}
                  type="date"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Weight kg", name: "weight_kg", value: weightKg, setValue: setWeightKg },
                  { label: "Length cm", name: "length_cm", value: lengthCm, setValue: setLengthCm },
                  { label: "Width cm", name: "width_cm", value: widthCm, setValue: setWidthCm },
                  { label: "Height cm", name: "height_cm", value: heightCm, setValue: setHeightCm },
                ].map((field) => (
                  <label key={field.name} className="block">
                    <span className="mb-1 block text-sm font-black">{field.label}</span>
                    <input
                      name={field.name}
                      value={field.value}
                      onChange={(event) => field.setValue(event.target.value)}
                      type="number"
                      min="0"
                      placeholder="Seller to confirm"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                    />
                  </label>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { name: "tail_lift_required", checked: tailLiftRequired, setChecked: setTailLiftRequired, label: "Tail-lift required" },
                  { name: "forklift_available", checked: forkliftAvailable, setChecked: setForkliftAvailable, label: "Forklift available" },
                  { name: "ground_floor_collection", checked: groundFloorCollection, setChecked: setGroundFloorCollection, label: "Ground-floor collection" },
                  { name: "commercial_premises", checked: commercialPremises, setChecked: setCommercialPremises, label: "Commercial premises" },
                  { name: "pallet_ready", checked: palletReady, setChecked: setPalletReady, label: "Pallet ready" },
                ].map((field) => (
                  <label key={field.name} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold">
                    <input
                      name={field.name}
                      type="checkbox"
                      checked={field.checked}
                      onChange={(event) => field.setChecked(event.target.checked)}
                      className="h-4 w-4 accent-[#FF6B00]"
                    />
                    {field.label}
                  </label>
                ))}
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Delivery notes</span>
                <textarea
                  name="delivery_notes"
                  value={deliveryNotes}
                  onChange={(event) => setDeliveryNotes(event.target.value)}
                  placeholder="Optional"
                  className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>
            </div>
          )}

          {deliveryMethod === "buyer_courier" && (
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-black">Delivery notes</span>
              <textarea
                name="delivery_notes"
                value={deliveryNotes}
                onChange={(event) => setDeliveryNotes(event.target.value)}
                placeholder="Tell buyers how you can deliver."
                className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
              />
            </label>
          )}
        </section>

        <details className="rounded-3xl bg-white p-5 text-[#002E5D] shadow-sm">
          <summary className="cursor-pointer list-none text-lg font-black">CaterBot details</summary>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {[
              ["Brand found", productMatch.brand || "Not found"],
              ["Model found", productMatch.model || "Not found"],
              ["Serial number", shippingSpecSerial || "Not found"],
              ["Power details", [shippingSpecPowerType, shippingSpecVoltage, shippingSpecPhase ? `${shippingSpecPhase} phase` : ""].filter(Boolean).join(", ") || "Not found"],
              ["CaterBot confidence", specConfidence || (quickListResult ? formatConfidence(quickListResult.confidence_score) : "Not checked")],
              ["Source status", sourceStatusText],
              ["Manual/spec source result", manualSourceHasVerifiedUrl ? manualSourceName || "Source found" : "None found"],
              ["Last checked", manualSourceLastCheckedAt ? new Date(manualSourceLastCheckedAt).toLocaleString("en-GB") : "Not checked"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                <p className="mt-1 font-bold">{value}</p>
              </div>
            ))}
          </div>
          {quickListResult && (
            <div className="mt-3 rounded-2xl bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Raw extracted notes</p>
              <p className="mt-1 whitespace-pre-line text-sm font-semibold leading-relaxed text-[#002E5D]">
                {buildDescriptionFromSuggestion(quickListResult)}
              </p>
            </div>
          )}
        </details>

        <section className="rounded-3xl bg-white p-5 text-[#002E5D] shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FF6B00]">Review listing</p>
          <h2 className="mt-1 text-xl font-black">Review and publish</h2>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {imagePreview && (
              <NextImage
                src={imagePreview}
                alt="Main listing preview"
                width={640}
                height={360}
                unoptimized
                className="h-44 w-full object-cover"
              />
            )}
            <div className="space-y-2 p-4 text-sm font-bold">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Item</span>
                <span className="text-right">{title || "Not added"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Price</span>
                <span>{price ? formatPrice(price) : "Not added"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Location</span>
                <span>{reviewLocation}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Delivery</span>
                <span className="text-right">{reviewDeliveryOption}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {deliveryMethod !== "collection_only" && (
              <label className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
                <input
                  name="delivery_details_confirmed"
                  type="checkbox"
                  checked={deliveryDetailsConfirmed}
                  onChange={(event) => setDeliveryDetailsConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#FF6B00]"
                />
                I confirm the delivery details are accurate.
              </label>
            )}

            {manualSourceHasVerifiedUrl && (
              <label className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
                <input
                  name="specs_verified_by_seller"
                  type="checkbox"
                  checked={specsVerifiedBySeller}
                  onChange={(event) => setSpecsVerifiedBySeller(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#FF6B00]"
                />
                I confirm the specs and product source match my item.
              </label>
            )}

            <label className="flex items-start gap-3 rounded-2xl border border-[#002E5D]/15 bg-slate-50 px-4 py-3 text-sm font-bold">
              <input
                name="listing_info_confirmed"
                type="checkbox"
                checked={listingInfoConfirmed}
                onChange={(event) => setListingInfoConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#FF6B00]"
              />
              I confirm this listing information is accurate.
            </label>
          </div>

          {publishError && (
            <p className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
              {publishError}
            </p>
          )}

          <button
            type="submit"
            disabled={isPublishing}
            className="mt-4 w-full rounded-2xl bg-[#FF6B00] px-4 py-4 text-lg font-black text-white shadow-lg shadow-[#FF6B00]/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPublishing ? "Publishing..." : "Publish listing"}
          </button>
        </section>

        <input type="hidden" name="location" value={location || city} />
        <input type="hidden" name="power_type" value={shippingSpecPowerType === "Not sure" ? "Unknown" : shippingSpecPowerType} />
        <input type="hidden" name="dimensions" value={itemDimensionsValue} />
        <input type="hidden" name="warranty_type" value="No warranty" />
        <input type="hidden" name="tested_status" value="Untested" />
        <input type="hidden" name="delivery_option" value={reviewDeliveryOption} />
        <input type="hidden" name="manuals_available" value={manualSourceHasVerifiedUrl ? "on" : ""} />
        <input type="hidden" name="delivery_available" value={deliveryMethod === "caterbids_delivery" ? "on" : ""} />
        <input type="hidden" name="collection_city" value={collectionCity || city || location} />
        <input type="hidden" name="delivery_size_unknown" value="" />
        <input type="hidden" name="pallet_count" value={palletCount || "1"} />
        <input type="hidden" name="insurance_value" value={insuranceValue || price.replace(/[^0-9.]/g, "")} />
        <input type="hidden" name="access_restrictions" value={accessRestrictions} />
        <input type="hidden" name="estimated_weight" value={weightKg ? `${weightKg} kg` : ""} />
        <input type="hidden" name="delivery_type" value={deliveryRecommendation.recommendation} />
        <input
          type="hidden"
          name="shipping_class"
          value={deliveryRecommendation.palletRecommended ? "Large item" : deliveryRecommendation.specialistRecommended ? "Specialist item" : weightKg ? "Medium item" : ""}
        />
        <input
          type="hidden"
          name="shipping_confidence"
          value={deliveryRecommendation.label === "Source-based delivery estimate" ? "High" : weightKg || (lengthCm && widthCm && heightCm) ? "Medium" : "Low"}
        />
        <input type="hidden" name="shipping_details_confirmed_by_seller" value={deliveryDetailsConfirmed ? "true" : "false"} />
        <input type="hidden" name="pallet_delivery_recommended" value={deliveryRecommendation.palletRecommended ? "true" : "false"} />
        <input type="hidden" name="specialist_delivery_recommended" value={deliveryRecommendation.specialistRecommended ? "true" : "false"} />
        <input type="hidden" name="spec_plate_image_url" value={specPlatePreview} />
        <input type="hidden" name="spec_serial_number" value={shippingSpecSerial} />
        <input type="hidden" name="spec_gc_number" value={shippingSpecGcNumber} />
        <input type="hidden" name="spec_category" value={shippingSpecCategory || subcategory || category} />
        {!showElectricFields && (
          <>
            <input type="hidden" name="spec_voltage" value="" />
            <input type="hidden" name="spec_phase" value="" />
          </>
        )}
        <input type="hidden" name="spec_current_a" value={shippingSpecCurrent} />
        {!showGasFields && <input type="hidden" name="spec_gas_type" value="" />}
        <input type="hidden" name="spec_gas_connection" value={shippingSpecGasConnection} />
        <input type="hidden" name="spec_height_cm" value={heightCm || shippingSpecHeight} />
        <input type="hidden" name="spec_width_cm" value={widthCm || shippingSpecWidth} />
        <input type="hidden" name="spec_depth_cm" value={lengthCm || shippingSpecDepth} />
        <input type="hidden" name="spec_weight_kg" value={weightKg || shippingSpecWeight} />
        <input type="hidden" name="spec_condition_notes" value={shippingSpecNotes} />
        <input type="hidden" name="spec_forklift_required" value={shippingSpecForkliftRequired ? "on" : ""} />
        <input type="hidden" name="manual_source_name" value={manualSourceHasVerifiedUrl ? manualSourceName : ""} />
        <input type="hidden" name="manual_source_type" value={manualSourceHasVerifiedUrl ? manualSourceType : ""} />
        <input type="hidden" name="manual_source_url" value={manualSourceHasVerifiedUrl ? manualSourceUrl : ""} />
        <input type="hidden" name="spec_source_url" value={manualSourceHasVerifiedUrl ? specSourceUrl : ""} />
        <input type="hidden" name="manual_source_validated" value={manualSourceHasVerifiedUrl ? "true" : "false"} />
        <input type="hidden" name="manual_source_last_checked_at" value={manualSourceLastCheckedAt} />
        <input type="hidden" name="manual_source_match_notes" value={manualSourceHasVerifiedUrl ? manualSourceMatchNotes : productMatchFailureText} />
        <input type="hidden" name="ai_spec_confidence" value={specConfidence} />
        <input type="hidden" name="source_rejected_by_seller" value={sourceRejectedBySeller ? "true" : "false"} />
        {!manualSourceHasVerifiedUrl && <input type="hidden" name="specs_verified_by_seller" value="off" />}
        <input type="hidden" name="image" value={imagePreview} />
        <input type="hidden" name="images" value={JSON.stringify(imagePreviews)} />
      </form>
      </div>
      )}
    </main>
  )
}
