"use client"

import { useRouter, useSearchParams } from "next/navigation"
import NextImage from "next/image"
import SiteLogo from "@/components/SiteLogo"
import { useEffect, useState, useTransition, type Dispatch, type SetStateAction } from "react"
import { Bell, CheckCircle2, ClipboardCheck, ImagePlus, Loader2, PackageCheck, ScanSearch, UploadCloud, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createListing } from "./actions"
import type { CaterBidsDeliveryOption } from "@/lib/delivery/options"
import { DELIVERY_PREVIEW_MODE_LABEL } from "@/lib/delivery/options"
import { PAYMENTS_DISABLED_MESSAGE } from "@/lib/pricing"
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
  short_description?: string
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
  ai_dimensions?: string
  ai_weight_kg?: number | null
  shipping_class: string
  delivery_warning: string
  confidence_score: number
  confidence?: string | number
  condition?: "New" | "Used" | "Refurbished" | "Spares or Repair"
  error?: string
  detail?: string
  _diag?: {
    ai_dimensions: string
    source_valid: boolean
    source_url: string
    source_found_dimensions: string
    final_dimensions: string
  }
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

type CaterBotSpecLookupResponse = {
  success?: boolean
  error?: string
  checkedAt?: string
  image_analysis?: {
    main_image?: {
      equipment_type?: string
      visible_brand?: string
      visible_model?: string
      visual_category?: string
      condition_clues?: string[]
      confidence?: number
      raw_text?: string
    }
    spec_plate?: {
      raw_text?: string
      brand?: string
      model?: string
      product_name?: string
      serial?: string
      equipment_type?: string
      gas_type?: string
      voltage?: string
      heat_input_kw?: number | null
      refrigerant?: string
      confidence?: number
    }
  }
  extracted?: {
    raw_text?: string
    brand?: string
    model?: string
    product_name?: string
    serial?: string
    equipment_type?: string
    power?: string
    gas_type?: string
    gas_connection?: string
    heat_input_kw?: number | null
    refrigerant?: string
    frequency?: string
    confidence?: number
  }
  specs?: {
    title?: string
    category?: string
    type?: string
    condition?: string
    brand?: string
    model?: string
    weight_kg?: number | null
    height_cm?: number | null
    width_cm?: number | null
    depth_cm?: number | null
    net_weight_kg?: number | null
    gross_weight_kg?: number | null
    capacity_litres?: number | null
    power_type?: string
    voltage?: string
    phase?: string
    watts?: number | null
    amps?: number | null
    gas_type?: string
    gas_connection?: string
    heat_input_kw?: number | null
    refrigerant?: string
    refrigerant_mass?: string
    frequency?: string
    power_details?: string
    short_description?: string
    safety_note?: string
    pallet_required?: boolean
    suggested_pallet_size?: string
    delivery_notes?: string
  }
  source?: CaterBotSourceValidationResponse["source"]
  matchType?: "exact" | "approximate" | "no_match"
  sources?: Array<{
    title?: string
    url?: string
    source_type?: string
    trust_score?: number
    matched_fields?: string[]
  }>
  search_queries?: string[]
  confidence_score?: number
  warnings?: string[]
  geminiEstimates?: {
    weight_kg?: number
    height_cm?: number
    width_cm?: number
    depth_cm?: number
  } | null
  debug?: {
    raw_text?: string
    model_candidates?: string[]
    brand_candidates?: string[]
    search_queries?: string[]
    selected_source?: string | null
    extracted_specs?: unknown
  }
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

function CaterBotSearchBar({
  label,
  progress,
  tone = "dark",
}: {
  label: string
  progress: number
  tone?: "dark" | "light"
}) {
  const trackClass = tone === "light" ? "bg-[#002E5D]/10" : "bg-white/10"
  const textClass = tone === "light" ? "text-[#002E5D]" : "text-white"
  const helperClass = tone === "light" ? "text-[#002E5D]/60" : "text-white/60"

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone === "light" ? "border-[#002E5D]/10 bg-white" : "border-[#FF6B00]/30 bg-[#FF6B00]/10"}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className={`text-sm font-black ${textClass}`}>{label}</span>
        <span className={`flex items-center gap-1.5 text-xs font-black ${helperClass}`}>
          <Loader2 className="h-3 w-3 animate-spin" />
          Searching...
        </span>
      </div>
      <div className={`h-2 overflow-hidden rounded-full ${trackClass}`}>
        <div
          className="h-full rounded-full bg-[#FF6B00] animate-pulse transition-all duration-500 ease-out"
          style={{ width: `${Math.max(8, Math.min(progress, 94))}%` }}
        />
      </div>
    </div>
  )
}

function formatMetric(value: unknown, suffix: string) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return `${Number(value.toFixed(2)).toString()} ${suffix}`
  }
  if (typeof value === "string" && value.trim()) return `${value.trim()} ${suffix}`.trim()
  return ""
}

function caterBotDimensionsSummary(specs?: CaterBotSpecLookupResponse["specs"] | null) {
  if (!specs?.width_cm || !specs.depth_cm || !specs.height_cm) return "Needs seller check"
  return `${formatMetric(specs.width_cm, "cm")} × ${formatMetric(specs.depth_cm, "cm")} × ${formatMetric(specs.height_cm, "cm")}`
}

function extractDimensionHint(suggestion: QuickListAiResponse | undefined): string | undefined {
  if (!suggestion) return undefined

  // Check useful_details first (where AI puts structured "Dimensions: …" lines)
  const fromDetails = suggestion.manual_source_useful_details?.find(
    (line) => /^dimensions:/i.test(line.trim())
  )
  // Fall back to scanning description line-by-line
  const fromDescription = !fromDetails
    ? suggestion.description?.split(/[\n\r]+/).find((line) => /^\s*[-•]?\s*dimensions:/i.test(line))?.trim()
    : undefined
  // Last resort: structured dimensions field
  const raw = (fromDetails ?? fromDescription ?? suggestion.dimensions ?? "").trim()

  if (!raw) return undefined

  const valueOnly = raw.replace(/^[-•]?\s*dimensions:\s*/i, "").trim()
  if (!valueOnly) return undefined

  // Sanity: every axis must be 100–3500 mm. Convert cm→mm if units say cm.
  const mmVals = [...valueOnly.matchAll(/(\d+(?:\.\d+)?)\s*mm/gi)].map((m) => Number(m[1]))
  const cmVals = [...valueOnly.matchAll(/(\d+(?:\.\d+)?)\s*cm/gi)].map((m) => Number(m[1]) * 10)
  const axesMm = mmVals.length >= 3 ? mmVals.slice(0, 3) : cmVals.length >= 3 ? cmVals.slice(0, 3) : []
  // TODO: axesMm is empty when values arrive as bare numbers ("860 x 967 x 1160" with no per-axis unit) — bounds check is skipped in that case; tighten later
  if (axesMm.length === 3 && axesMm.some((v) => v < 100 || v > 3500)) return undefined

  return valueOnly
}

function caterBotWeightSummary(specs?: CaterBotSpecLookupResponse["specs"] | null) {
  const weight = specs?.gross_weight_kg || specs?.net_weight_kg || specs?.weight_kg
  return weight ? formatMetric(weight, "kg") : "Needs seller check"
}

function caterBotPowerSummary(specs?: CaterBotSpecLookupResponse["specs"] | null, extracted?: CaterBotSpecLookupResponse["extracted"] | null) {
  const parts = [
    specs?.power_type,
    specs?.gas_type || extracted?.gas_type,
    specs?.voltage,
    specs?.phase,
    specs?.frequency,
    specs?.amps ? `${specs.amps}A` : "",
    specs?.watts ? `${specs.watts}W` : "",
    specs?.heat_input_kw ? `${specs.heat_input_kw}kW` : "",
  ].filter(Boolean)
  return parts.join(" · ") || "Needs seller check"
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

function cleanTitlePart(value?: string | number | null) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\bunknown\b|\bnot sure\b|\bneeds seller check\b/gi, "")
    .trim()
}

function displayBrand(value?: string | null) {
  const brand = cleanTitlePart(value)
  if (!brand) return ""
  if (brand === brand.toUpperCase() && brand.length > 3) {
    return brand.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
  }
  return brand
}

function titleFuelType(suggestion: QuickListAiResponse) {
  const text = [
    suggestion.gas_type,
    suggestion.power_type,
    suggestion.gas_or_electric,
    suggestion.voltage,
    suggestion.electrical_phase,
    suggestion.kw_rating,
    suggestion.amps,
    suggestion.suggested_title,
    suggestion.title,
  ].filter(Boolean).join(" ").toLowerCase()

  if (/\blpg\b|\bpropane\b/.test(text)) return "LPG"
  if (/\bnatural gas\b|\bmains gas\b|\bg20\b/.test(text)) return "Natural Gas"
  if (/\b3\s*phase\b|\bthree phase\b|\b400v\b|\b415v\b/.test(text)) return "Three Phase Electric"
  if (/\b13a\b|\b13 amp\b/.test(text)) return "13A Electric"
  if (/\belectric\b|\b230v\b|\b240v\b/.test(text)) return "Electric"
  if (/\bgas\b/.test(text)) return "Gas"
  return ""
}

function titleEquipmentType(suggestion: QuickListAiResponse) {
  const text = [
    suggestion.suggested_title,
    suggestion.title,
    suggestion.subcategory,
    suggestion.category,
    suggestion.description,
  ].filter(Boolean).join(" ").toLowerCase()

  const matches: Array<[RegExp, string]> = [
    [/\bcombi\s*oven\b/, "Combi Oven"],
    [/\bchar\s*grill\b|\bchargrill\b/, "Chargrill"],
    [/\bgriddle\b/, "Griddle"],
    [/\bfryer\b/, "Fryer"],
    [/\bpizza\s*oven\b/, "Pizza Oven"],
    [/\boven\b/, "Oven"],
    [/\bglass\s*washer\b|\bglasswasher\b/, "Glasswasher"],
    [/\bdish\s*washer\b|\bdishwasher\b/, "Dishwasher"],
    [/\bfreezer\b/, "Freezer"],
    [/\bfridge\b|\brefrigerator\b|\brefrigeration\b|\bchiller\b/, "Refrigeration"],
    [/\bmixer\b/, "Mixer"],
    [/\bcoffee\b|\bespresso\b/, "Coffee Machine"],
    [/\bbain\s*marie\b/, "Bain Marie"],
    [/\bslicer\b/, "Slicer"],
    [/\bprep\b|\bpreparation\b|\bprocessor\b/, "Prep Equipment"],
  ]

  return matches.find(([pattern]) => pattern.test(text))?.[1] || cleanTitlePart(suggestion.subcategory) || "Commercial Catering Equipment"
}

function titleModelFamily(suggestion: QuickListAiResponse) {
  const text = [suggestion.suggested_title, suggestion.title, suggestion.description].filter(Boolean).join(" ")
  return (
    text.match(/\bOpus\s*800\b/i)?.[0] ||
    text.match(/\bSilverlink\s*600\b/i)?.[0] ||
    text.match(/\biCombi\b/i)?.[0] ||
    ""
  )
}

function buildSeoListingTitle(suggestion: QuickListAiResponse, fallbackCondition = "Used") {
  const brand = displayBrand(suggestion.brand)
  const model = cleanTitlePart(suggestion.model || suggestion.gc_number).toUpperCase()
  const family = titleModelFamily(suggestion)
  const fuel = titleFuelType(suggestion)
  const equipmentType = titleEquipmentType(suggestion)
  const condition = cleanTitlePart(suggestion.condition || fallbackCondition)

  const coreParts = [brand, model, family, fuel, equipmentType]
    .filter(Boolean)
    .filter((part, index, parts) => parts.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index)

  if (coreParts.length < 2) {
    return cleanTitlePart(suggestion.suggested_title || suggestion.title)
  }

  const title = coreParts.join(" ")
  return condition ? `${title} - ${condition}` : title
}

function buildCaterBotShortDescription(suggestion: QuickListAiResponse, fallbackCondition = "Used") {
  const suppliedDescription = cleanTitlePart(suggestion.short_description || suggestion.description)
  const genericDescription =
    !suppliedDescription ||
    /upload at least one|add clear photos|commercial catering item/i.test(suppliedDescription)

  const dimStr = (suggestion.dimensions ?? "").trim()
  const weightRaw = suggestion.estimated_weight_kg
  const weightNum =
    typeof weightRaw === "number"
      ? weightRaw
      : parseFloat(String(weightRaw ?? "").replace(/[^0-9.]/g, ""))
  const weightLine =
    Number.isFinite(weightNum) && weightNum > 0
      ? `Weight: ${Number.isInteger(weightNum) ? weightNum : weightNum.toFixed(1)} kg.`
      : ""
  const specLine = [dimStr ? `Dimensions: ${dimStr}.` : "", weightLine].filter(Boolean).join(" ")

  if (!genericDescription) {
    return specLine ? `${suppliedDescription} ${specLine}` : suppliedDescription
  }

  const brand = displayBrand(suggestion.brand)
  const model = cleanTitlePart(suggestion.model || suggestion.gc_number).toUpperCase()
  const fuel = titleFuelType(suggestion)
  const equipmentType = titleEquipmentType(suggestion).toLowerCase()
  const conditionText = cleanTitlePart(suggestion.condition || fallbackCondition).toLowerCase() || "used"
  const itemName = [brand, model, fuel, equipmentType]
    .filter(Boolean)
    .filter((part, index, parts) => parts.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

  const suffix = specLine || "Please check photos and confirm condition, dimensions and collection requirements before purchase."

  if (itemName) {
    return `${conditionText.charAt(0).toUpperCase()}${conditionText.slice(1)} ${itemName} suitable for commercial catering use. ${suffix}`
  }

  return `Used catering equipment item. Please review photos carefully and confirm condition. ${suffix}`
}

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

function buildDeliveryOptionSummary(pallet: boolean, collection: boolean, buyerArranges: boolean) {
  const parts: string[] = []
  if (pallet) parts.push("CaterBids Pallet Delivery")
  if (collection) parts.push("Collection")
  if (buyerArranges) parts.push("Buyer arranges delivery")
  return parts.join(" + ") || "Collection only"
}

function positiveNumber(value: string) {
  const numberValue = Number(String(value || "").replace(/[^0-9.]/g, ""))
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

const PALLET_TIERS: Array<{ slug: string; label: string; maxHeightCm: number; maxWeightKg: number }> = [
  { slug: "mini_quarter", label: "Mini Quarter pallet", maxHeightCm: 60,  maxWeightKg: 150  },
  { slug: "quarter",      label: "Quarter pallet",      maxHeightCm: 80,  maxWeightKg: 300  },
  { slug: "half",         label: "Half pallet",          maxHeightCm: 110, maxWeightKg: 500  },
  { slug: "light",        label: "Light pallet",         maxHeightCm: 220, maxWeightKg: 750  },
  { slug: "full",         label: "Full pallet",          maxHeightCm: 220, maxWeightKg: 1000 },
]

const PALLET_CARDS = [
  { slug: "mini_quarter", name: "Mini Quarter",      image: "/images/pallets/pallet_mini_quarter.png", maxH: "0.6m", maxW: "150kg",  example: "Small countertop equipment" },
  { slug: "quarter",      name: "Quarter",           image: "/images/pallets/pallet_quarter.png",      maxH: "0.8m", maxW: "300kg",  example: "Under-counter fridge, small fryer" },
  { slug: "half",         name: "Half",              image: "/images/pallets/pallet_half.png",          maxH: "1.1m", maxW: "500kg",  example: "Single oven, prep table" },
  { slug: "light",        name: "Light",             image: "/images/pallets/pallet_light.png",         maxH: "2.2m", maxW: "750kg",  example: "Tall upright fridge (lighter)" },
  { slug: "full",         name: "Full",              image: "/images/pallets/pallet_full.png",          maxH: "2.2m", maxW: "1000kg", example: "Heavy range cooker, full-size" },
] as const

function computePalletFromItem(
  itemHeightCm: number,
  itemWeightKg: number
): {
  palletLengthCm: number
  palletWidthCm: number
  palletHeightCm: number
  palletWeightKg: number
  tier: { slug: string; label: string } | { tooBig: true } | null
} {
  const palletLengthCm = 120
  const palletWidthCm = 100
  const palletHeightCm = itemHeightCm + 15
  const palletWeightKg = itemWeightKg + 20
  let tier: { slug: string; label: string } | { tooBig: true } | null = null
  if (itemHeightCm > 0 && itemWeightKg > 0) {
    if (palletHeightCm > 220 || palletWeightKg > 1000) {
      tier = { tooBig: true }
    } else {
      for (const t of PALLET_TIERS) {
        if (palletHeightCm <= t.maxHeightCm && palletWeightKg <= t.maxWeightKg) {
          tier = { slug: t.slug, label: t.label }
          break
        }
      }
    }
  }
  return { palletLengthCm, palletWidthCm, palletHeightCm, palletWeightKg, tier }
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
  const needsCare = /(gas|lpg|propane|refriger|fridge|freezer)/.test(equipmentText)

  if (!hasCompleteSpecs) {
    return {
      label: "Seller confirmation needed",
      recommendation: "CaterBot can improve delivery estimates when dimensions and weight are confirmed.",
      palletRecommended: false,
      specialistRecommended: false,
    }
  }

  if (weight > 1000 && maxDimension <= 120) {
    return {
      label: "Seller confirmation needed",
      recommendation: "Weight looks incorrect. Seller must confirm before booking delivery.",
      palletRecommended: false,
      specialistRecommended: false,
    }
  }

  if (weight <= 30 && maxDimension <= 120) {
    return {
      label: hasVerifiedSource ? "CaterBot estimate" : "Seller confirmation needed",
      recommendation: needsCare
        ? "Collection only unless the seller can palletise and shrink-wrap the item."
        : "Collection only may be suitable for small items.",
      palletRecommended: false,
      specialistRecommended: false,
    }
  }

  if (weight > 1000 || maxDimension >= 220) {
    return {
      label: hasVerifiedSource ? "CaterBot estimate" : "Seller confirmation needed",
      recommendation: "Collection only unless a pallet-ready Interparcel service can safely handle the item.",
      palletRecommended: true,
      specialistRecommended: false,
    }
  }

  if (weight <= 150) {
    return {
      label: hasVerifiedSource ? "CaterBot estimate" : "Seller confirmation needed",
      recommendation: "Mini Quarter pallet delivery may be suitable if pallet-ready.",
      palletRecommended: true,
      specialistRecommended: false,
    }
  }

  if (weight <= 300) {
    return {
      label: hasVerifiedSource ? "CaterBot estimate" : "Seller confirmation needed",
      recommendation: "Quarter pallet recommended.",
      palletRecommended: true,
      specialistRecommended: false,
    }
  }

  return {
    label: hasVerifiedSource ? "CaterBot estimate" : "Seller confirmation needed",
    recommendation: "CaterBids Pallet Delivery may be suitable if pallet-ready.",
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

function PostListingPage() {
  const router = useRouter()
  const postListingParams = useSearchParams()
  const [showOverageSuccess, setShowOverageSuccess] = useState(postListingParams.get("overage") === "success")

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
  const [palletEnabled, setPalletEnabled] = useState(false)
  const [palletTooBig, setPalletTooBig] = useState(false)
  const [collectionEnabled, setCollectionEnabled] = useState(true)
  const [buyerArrangesEnabled, setBuyerArrangesEnabled] = useState(false)
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
  const [palletSize, setPalletSize] = useState("full")
  const [palletSizeNote, setPalletSizeNote] = useState("")
  const [palletSizeManuallySet, setPalletSizeManuallySet] = useState(false)
  const [palletImgErrors, setPalletImgErrors] = useState<ReadonlySet<string>>(new Set())
  const [palletCount, setPalletCount] = useState("1")
  const [preferredCollectionDate, setPreferredCollectionDate] = useState("")
  const [featureBoostDays, setFeatureBoostDays] = useState<7 | 30 | null>(null)
  const [boostSettings, setBoostSettings] = useState<{
    featured_boosts_enabled: boolean
    featured_price_7d: number
    featured_price_30d: number
  } | null>(null)
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
  const [palletPreparationConfirmed, setPalletPreparationConfirmed] = useState(false)
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
  const [caterBotProgress, setCaterBotProgress] = useState(0)
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
  const [pendingSpecLookup, setPendingSpecLookup] = useState<CaterBotSpecLookupResponse | null>(null)
  const [pendingGeminiEstimates, setPendingGeminiEstimates] = useState<{
    weight_kg?: number
    height_cm?: number
    width_cm?: number
    depth_cm?: number
  } | null>(null)
  const [quickListApplied, setQuickListApplied] = useState(false)
  const [publishError, setPublishError] = useState("")
  const [overageRequired, setOverageRequired] = useState(false)
  const [isOverageLoading, setIsOverageLoading] = useState(false)
  const [paymentNotice, setPaymentNotice] = useState("")
  const [listingInfoConfirmed, setListingInfoConfirmed] = useState(false)
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isPublishing, startPublishing] = useTransition()
  const imagePreview = imagePreviews[0] || ""
  const caterBotSearching = aiLoading || manualLinkChecking

  useEffect(() => {
    let kickoffTimer: number | undefined

    if (!caterBotSearching) {
      kickoffTimer = window.setTimeout(() => setCaterBotProgress(0), 0)
      return () => {
        if (kickoffTimer) window.clearTimeout(kickoffTimer)
      }
    }

    kickoffTimer = window.setTimeout(() => setCaterBotProgress(12), 0)
    const timer = window.setInterval(() => {
      setCaterBotProgress((current) => {
        if (current >= 92) return 92
        return Math.min(92, current + 8)
      })
    }, 450)

    return () => {
      if (kickoffTimer) window.clearTimeout(kickoffTimer)
      window.clearInterval(timer)
    }
  }, [caterBotSearching])

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
      const isLocalBetaUser = user?.id === "local-beta"
      const realUser = user && !isLocalBetaUser ? user : null

      setUserId(user?.id || null)
      setAuthChecked(true)
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent("/post-listing")}`)
        return
      }

      if (isLocalBetaUser) {
        prefillSellerDetails(readLocalSellerProfile(user.id))
        return
      }

      if (!realUser) return

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
    let isMounted = true

    async function loadPaymentMode() {
      try {
        const response = await fetch("/api/payment-settings")
        if (!response.ok) return
        const payload = (await response.json()) as {
          settings?: {
            payments_enabled?: boolean
            free_listing_mode?: boolean
          }
        }
        if (!isMounted) return
        if (!payload.settings?.payments_enabled) {
          setPaymentNotice(PAYMENTS_DISABLED_MESSAGE)
        } else if (payload.settings.free_listing_mode) {
          setPaymentNotice("Free listing mode is active until your launch allowance is used.")
        }
      } catch (error) {
        console.warn("Payment settings notice unavailable:", error)
      }
    }

    loadPaymentMode()

    return () => {
      isMounted = false
    }
  }, [])

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

  useEffect(() => {
    fetch("/api/payment-settings")
      .then((r) => r.json())
      .then((data: { settings?: Record<string, unknown> }) => {
        const s = data?.settings
        if (s) {
          setBoostSettings({
            featured_boosts_enabled: Boolean(s.featured_boosts_enabled),
            featured_price_7d: Number(s.featured_price_7d) || 4.99,
            featured_price_30d: Number(s.featured_price_30d) || 14.99,
          })
        }
      })
      .catch(() => {})
  }, [])

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
    setPendingSpecLookup(null)
    setQuickListApplied(false)
  }

  function resetScanState() {
    // Clears all state written by a previous scan so a new scan starts clean.
    // Seller-typed fields (title, deliveryNotes, physical measurements) are intentionally excluded.
    // Brand and model ARE cleared here: they come from OCR, not seller input, and stale values
    // from a prior scan would contaminate source-matching for the new item.
    setQuickListResult(null)
    setShippingSpecBrand("")
    setShippingSpecModel("")
    setPendingSpecLookup(null)
    setQuickListApplied(false)
    setDimensions("")
    setWeightKg("")
    setLengthCm("")
    setWidthCm("")
    setHeightCm("")
    setPalletSizeNote("")
    setPalletTooBig(false)
    setManualSourceUrl("")
    setSpecSourceUrl("")
    setManualSourceName("")
    setManualSourceType("")
    setManualSourceValidated(false)
    setManualSourceLastCheckedAt("")
    setManualSourceMatchNotes("")
    setManualSourceUsefulDetails([])
    setSpecConfidence("")
    setSpecsVerifiedBySeller(false)
    setSourceRejectedBySeller(false)
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const allowed = files.filter((file) =>
      ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type) ||
      file.type === ""
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
    if (specPlateFile && userId) {
      void lookupSpecsWithCaterBot({ autoApplyEmpty: true, imageFiles: newFiles })
    }
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
      const seoTitle = buildSeoListingTitle(suggestion, normaliseCondition(suggestion.condition))
      if (seoTitle) {
        setTitle((currentTitle) => currentTitle || seoTitle)
      }
      const aiShortDescription = buildCaterBotShortDescription(suggestion, normaliseCondition(suggestion.condition))
      setDescription((currentDescription) => currentDescription.trim() ? currentDescription : aiShortDescription)
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
      ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"].includes(selectedFile.type) ||
      selectedFile.type === ""
    )
    if (!file) return

    setSpecPlateFile(file)
    setAiError("")
    clearQuickListResult()

    try {
      setSpecPlatePreview(await resizeListingImage(file))
    } catch {
      setSpecPlatePreview(await fileToDataUrl(file))
    }

    try {
      const { width, height } = await inspectImage(file)
      const smallImage = Math.max(width, height) < 700 || Math.min(width, height) < 240
      setSpecPlateValidation(
        smallImage
          ? "Spec plate added. A clearer close-up may improve CaterBot results."
          : height > width * 1.35
          ? "Spec plate added. Rotate or crop if the text is sideways."
          : "Spec plate added."
      )
    } catch {
      setSpecPlateValidation("Spec plate added.")
    }

    e.target.value = ""
    void runSpecPlateOcrPreview(file)
    if (imageFiles.length > 0 && userId) {
      void lookupSpecsWithCaterBot({ autoApplyEmpty: true, specPlateFile: file })
    }
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

  async function buildCaterBotImageInputs(files = imageFiles) {
    return Promise.all(
      files.map(async (file, index) => {
        const dataUrl =
          index === 0
            ? imagePreviews[index] || (await resizeListingImage(file))
            : await resizeSpecPlateForAi(file)
        return {
          imageBase64: getBase64Payload(dataUrl),
          fileType: getDataUrlFileType(dataUrl, file.type),
          fileName: file.name,
        }
      })
    )
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
    const suggestedWeightKg = extractSuggestionWeightKg(suggestion)

    setShippingSpecBrand(suggestion.brand || "")
    setShippingSpecModel(suggestion.model || suggestion.gc_number || "")
    setShippingSpecSerial(suggestion.serial_number || "")
    setShippingSpecGcNumber(suggestion.gc_number || "")
    setShippingSpecCategory(shippingCategoryFrom(suggestion.subcategory || suggestion.category || suggestion.suggested_title))
    setShippingSpecPowerType(shippingPowerTypeFrom(suggestion.power_type || suggestion.gas_or_electric || suggestion.gas_type))
    setShippingSpecVoltage(suggestion.voltage || "")
    setShippingSpecCurrent(extractConfirmedNumber(suggestion.amps) || "")
    setShippingSpecPhase(
      /3|three/i.test(suggestion.electrical_phase || suggestion.power_type || "") ? "3" :
      /1|single/i.test(suggestion.electrical_phase || suggestion.power_type || "") ? "1" :
      ""
    )
    setShippingSpecGasType(suggestion.gas_type || "")
    if (parsedDimensions) {
      setShippingSpecWidth(parsedDimensions[0])
      setShippingSpecDepth(parsedDimensions[1])
      setShippingSpecHeight(parsedDimensions[2])
    }
    setShippingSpecWeight(suggestedWeightKg || "")
    setShippingSpecForkliftRequired(aiBoolean(suggestion.tail_lift_required, false))
    setShippingSpecNotes(suggestion.delivery_notes || "")
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

  function formatMeasurementNumber(value: number) {
    return String(Math.ceil(value))
  }

  function normaliseCmValue(value: unknown, options: { allowBareNumber?: boolean } = {}) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return formatMeasurementNumber(value)
    }

    const text = typeof value === "string" ? value.trim() : ""
    if (!text || /needs seller (?:check|confirmation)|not confirmed|unknown|estimate/i.test(text)) return ""

    const measurement = text.match(/(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metres?|meters?)\b/i)
    if (measurement?.[1]) {
      const numberValue = Number(measurement[1].replace(",", "."))
      if (!Number.isFinite(numberValue) || numberValue <= 0) return ""
      const unit = (measurement[2] || "cm").toLowerCase()
      if (unit === "mm") return formatMeasurementNumber(numberValue / 10)
      if (unit === "m" || unit.startsWith("met")) return formatMeasurementNumber(numberValue * 100)
      return formatMeasurementNumber(numberValue)
    }

    if (options.allowBareNumber && /^\d+(?:[.,]\d+)?$/.test(text)) {
      return formatMeasurementNumber(Number(text.replace(",", ".")))
    }

    return ""
  }

  function extractConfirmedWeightKg(value: unknown, options: { allowBareNumber?: boolean } = {}) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return options.allowBareNumber ? formatMeasurementNumber(value) : ""
    }

    const text = typeof value === "string" ? value.trim() : ""
    if (!text || /needs seller (?:check|confirmation)|not confirmed|unknown|estimate/i.test(text)) return ""

    const kgMatch = text.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)
    if (kgMatch?.[1]) return formatMeasurementNumber(Number(kgMatch[1].replace(",", ".")))

    const gramMatch = text.match(/(\d+(?:[.,]\d+)?)\s*g\b/i)
    if (gramMatch?.[1]) {
      const grams = Number(gramMatch[1].replace(",", "."))
      if (Number.isFinite(grams) && grams > 0) return formatMeasurementNumber(grams / 1000)
    }

    if (options.allowBareNumber && /^\d+(?:[.,]\d+)?$/.test(text)) {
      return formatMeasurementNumber(Number(text.replace(",", ".")))
    }

    return ""
  }

  function extractSuggestionWeightKg(suggestion: QuickListAiResponse) {
    return (
      extractConfirmedWeightKg(suggestion.estimated_weight_kg, { allowBareNumber: true }) ||
      extractConfirmedWeightKg(suggestion.weight)
    )
  }

  function aiBoolean(value: unknown, fallback = false) {
    if (typeof value === "boolean") return value
    if (typeof value !== "string") return fallback
    if (/^(true|yes|required|available)$/i.test(value.trim())) return true
    if (/^(false|no|not required|none)$/i.test(value.trim())) return false
    return fallback
  }

  function parseDeliveryDimensionsToCm(value: unknown) {
    const text = typeof value === "string" ? value.trim() : ""
    if (!text || /needs seller (?:check|confirmation)|not confirmed|unknown/i.test(text)) return null

    const normalised = text.replace(/[×✕]/g, " x ").replace(/\bby\b/gi, " x ")
    const labelledValues: Partial<Record<"length" | "width" | "depth" | "height", string>> = {}

    for (const match of normalised.matchAll(/\b(length|len|l|width|w|depth|d|height|h)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metres?|meters?)?\b/gi)) {
      const label = match[1].toLowerCase()
      const numberText = match[2]
      const unit = match[3] || (/\bmm\b/i.test(normalised) ? "mm" : /\bcm\b/i.test(normalised) ? "cm" : "")
      const cmValue = normaliseCmValue(`${numberText}${unit ? ` ${unit}` : ""}`, { allowBareNumber: true })
      if (!cmValue) continue
      if (label === "length" || label === "len" || label === "l") labelledValues.length = cmValue
      if (label === "width" || label === "w") labelledValues.width = cmValue
      if (label === "depth" || label === "d") labelledValues.depth = cmValue
      if (label === "height" || label === "h") labelledValues.height = cmValue
    }

    for (const match of normalised.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metres?|meters?)?\s*(?:\(\s*)?(length|len|l|width|w|depth|d|height|h)\b(?:\s*\))?/gi)) {
      const unit = match[2] || (/\bmm\b/i.test(normalised) ? "mm" : /\bcm\b/i.test(normalised) ? "cm" : "")
      const label = match[3].toLowerCase()
      const cmValue = normaliseCmValue(`${match[1]}${unit ? ` ${unit}` : ""}`, { allowBareNumber: true })
      if (!cmValue) continue
      if (label === "length" || label === "len" || label === "l") labelledValues.length = cmValue
      if (label === "width" || label === "w") labelledValues.width = cmValue
      if (label === "depth" || label === "d") labelledValues.depth = cmValue
      if (label === "height" || label === "h") labelledValues.height = cmValue
    }

    if ((labelledValues.length || labelledValues.depth) && labelledValues.width && labelledValues.height) {
      return {
        lengthCm: labelledValues.length || labelledValues.depth || "",
        widthCm: labelledValues.width,
        heightCm: labelledValues.height,
      }
    }

    const match = normalised.match(
      /(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metres?|meters?)?\s*x\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metres?|meters?)?\s*x\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metres?|meters?)?/i
    )
    if (!match) return null

    const rawNumbers = [Number(match[1].replace(",", ".")), Number(match[3].replace(",", ".")), Number(match[5].replace(",", "."))]
    const inheritedUnit =
      match[2] || match[4] || match[6] || (/\bmm\b/i.test(normalised) ? "mm" : /\bcm\b/i.test(normalised) ? "cm" : "")
    const shouldTreatAsMm = inheritedUnit.toLowerCase() === "mm" || (!inheritedUnit && rawNumbers.some((numberValue) => numberValue > 300))
    const values = [
      normaliseCmValue(`${match[1]} ${match[2] || inheritedUnit || (shouldTreatAsMm ? "mm" : "cm")}`),
      normaliseCmValue(`${match[3]} ${match[4] || inheritedUnit || (shouldTreatAsMm ? "mm" : "cm")}`),
      normaliseCmValue(`${match[5]} ${match[6] || inheritedUnit || (shouldTreatAsMm ? "mm" : "cm")}`),
    ]

    if (!values.every(Boolean)) return null

    const lower = normalised.toLowerCase()
    if (/\b(?:w|width)\b.*\b(?:d|depth)\b.*\b(?:h|height)\b/.test(lower)) {
      return { lengthCm: values[1], widthCm: values[0], heightCm: values[2] }
    }
    if (/\b(?:h|height)\b.*\b(?:w|width)\b.*\b(?:d|depth|l|length)\b/.test(lower)) {
      return { lengthCm: values[2], widthCm: values[1], heightCm: values[0] }
    }

    return { lengthCm: values[0], widthCm: values[1], heightCm: values[2] }
  }

  function parseDimensionsToCm(value: string) {
    const parsed = parseDeliveryDimensionsToCm(value)
    if (!parsed) return null
    return [parsed.widthCm, parsed.lengthCm, parsed.heightCm]
  }

  function suggestionDeliveryDimensions(suggestion: QuickListAiResponse) {
    const itemDims = parseDeliveryDimensionsToCm(suggestion.dimensions)
    const itemHeightCm = itemDims?.heightCm ? Number(itemDims.heightCm) : 0
    const itemWeightKg = Number(extractSuggestionWeightKg(suggestion) || 0)

    if (itemHeightCm > 0 && itemWeightKg > 0) {
      const pallet = computePalletFromItem(itemHeightCm, itemWeightKg)
      if (pallet.tier && !('tooBig' in pallet.tier)) {
        return {
          lengthCm: String(pallet.palletLengthCm),
          widthCm: String(pallet.palletWidthCm),
          heightCm: String(pallet.palletHeightCm),
        }
      }
    }

    return {
      lengthCm: normaliseCmValue(suggestion.pallet_length_cm, { allowBareNumber: true }) || "",
      widthCm: normaliseCmValue(suggestion.pallet_width_cm, { allowBareNumber: true }) || "",
      heightCm: normaliseCmValue(suggestion.pallet_height_cm, { allowBareNumber: true }) || "",
    }
  }

  function deliveryOptionFromShippingClass(value: string) {
    const lower = value.toLowerCase()
    if (lower.includes("pallet") || lower.includes("large") || lower.includes("freight")) {
      return "CaterBids Pallet Delivery"
    }
    return "Collection only"
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

    const activeImageFiles = [...imageFiles]
    const activeSpecPlateFile = specPlateFile

    if (activeImageFiles.length === 0 && !activeSpecPlateFile) {
      setAiError("Upload an item photo or spec plate first so CaterBot can scan it.")
      return
    }

    resetScanState()
    setAiLoading(true)
    setAiError("")
    setAiNotice("")
    setQuickListApplied(false)

    try {
      // Use 1600px for AI scanning (vs 900px display previews) so Gemini can
      // read spec-plate text in a full-equipment phone camera shot.
      const itemImages = await Promise.all(
        activeImageFiles.map(async (file) => {
          const dataUrl = await resizeImage(file, 1600, 0.88).catch(() => fileToDataUrl(file))
          return {
            imageBase64: getBase64Payload(dataUrl),
            fileType: getDataUrlFileType(dataUrl, file.type),
            fileName: file.name,
          }
        })
      )
      const specPlateDataUrl = activeSpecPlateFile ? await resizeSpecPlateForAi(activeSpecPlateFile) : ""
      const specPlate = activeSpecPlateFile
        ? {
            imageBase64: getBase64Payload(specPlateDataUrl),
            fileType: getDataUrlFileType(specPlateDataUrl, activeSpecPlateFile.type),
            fileName: activeSpecPlateFile.name,
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
      const suggestion = (await res.json()) as QuickListAiResponse & { error?: string; detail?: string }

      if (!res.ok) {
        const detail = suggestion.detail ?? suggestion.error ?? ""
        const isApiError = res.status >= 500 || /denied|contact support|quota|unavailable/i.test(detail)
        throw new Error(
          isApiError
            ? "CaterBot is temporarily unavailable — please fill in details manually or try again later."
            : "CaterBot could not read these photos. Add clearer images or enter details manually."
        )
      }

      setQuickListResult(suggestion)
      applySuggestionToVisibleForm(suggestion)
      await lookupSpecsWithCaterBot({
        suggestion,
        autoApplyEmpty: true,
        imageFiles: activeImageFiles,
        specPlateFile: activeSpecPlateFile || undefined,
      })

      if (suggestion.description?.includes("CaterBot vision is not configured")) {
        setAiError("CaterBot is temporarily unavailable — please fill in details manually or try again later.")
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
    const deliveryDimensions = suggestionDeliveryDimensions(suggestion)
    const aiWeight = extractSuggestionWeightKg(suggestion)
    const aiPalletLength = deliveryDimensions.lengthCm
    const aiPalletWidth = deliveryDimensions.widthCm
    const aiPalletHeight = deliveryDimensions.heightCm
    const aiPalletCount = extractConfirmedNumber(suggestion.pallet_count)
    const preferredSourceUrl = preferredManualSourceUrl(suggestion)
    const seoTitle = buildSeoListingTitle(suggestion, normaliseCondition(suggestion.condition))
    const aiShortDescription = buildCaterBotShortDescription(suggestion, normaliseCondition(suggestion.condition))

    setTitle(seoTitle || suggestion.suggested_title || suggestion.title || "")
    setCategory(nextCategory)
    setSubcategory(nextSubcategory)
    setCondition(normaliseCondition(suggestion.condition))
    setDescription((current) => (current.trim() ? current : aiShortDescription))
    applySuggestionToShippingSpecs(suggestion)
    setPowerType(normalisePowerType(suggestion.power_type || suggestion.gas_or_electric || ""))
    setDimensions(suggestion.dimensions)
    if (/pallet/i.test(nextDeliveryOption)) setPalletEnabled(true)
    const validatedSource = Boolean(suggestion.manual_source_validated)
    console.log("[DIAG applySuggestion]", { validatedSource, preferredSourceUrl, manual_source_validated: suggestion.manual_source_validated })
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
    if (suggestion.delivery_notes) {
      const cleaned = suggestion.delivery_notes.replace(/\s*CaterBot delivery suggestion:[^.]*\.\s*/gi, " ").trim()
      if (cleaned) setDeliveryNotes(cleaned)
    }

    if (aiWeight) {
      setWeightKg(String(Math.ceil(Number(aiWeight) + 20)))
      setDeliverySizeUnknown(false)
    }

    const palletDimsPlausible =
      Number(aiPalletLength) >= 10 && Number(aiPalletWidth) >= 10 && Number(aiPalletHeight) >= 10
    if (aiPalletLength && aiPalletWidth && aiPalletHeight && palletDimsPlausible) {
      setLengthCm(aiPalletLength)
      setWidthCm(aiPalletWidth)
      setHeightCm(aiPalletHeight)
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
    const sourceWeight = source.extractedSpecs?.weight || source.extractedSpecs?.grossWeight || ""
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
    const itemWeightKg = parsedWeight ? positiveNumber(parsedWeight) : 0

    if (deliveryDimensions) {
      const itemHeightCm = positiveNumber(deliveryDimensions[2])
      if (itemHeightCm > 0) {
        const pallet = computePalletFromItem(itemHeightCm, itemWeightKg)
        setLengthCm(String(pallet.palletLengthCm))
        setWidthCm(String(pallet.palletWidthCm))
        setHeightCm(String(pallet.palletHeightCm))
        if (itemWeightKg > 0) setWeightKg(String(Math.ceil(pallet.palletWeightKg)))
        setDeliverySizeUnknown(false)
      }
    }

    if (parsedWeight) {
      setShippingSpecWeight(parsedWeight)
      if (!deliveryDimensions) setWeightKg(String(Math.ceil(itemWeightKg + 20)))
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

    if (shipping?.deliveryType) {
      const nextDelivery = /pallet|large|freight/i.test(shipping.deliveryType)
        ? "CaterBids Pallet Delivery"
        : "Collection only"
      if (nextDelivery === "CaterBids Pallet Delivery") setPalletEnabled(true)
    }
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

  function shouldFillValue(current: string, replace: boolean, defaults: string[] = []) {
    const normalised = current.trim().toLowerCase()
    return replace || !normalised || defaults.some((item) => item.toLowerCase() === normalised)
  }

  function setTextFromCaterBot(
    setter: Dispatch<SetStateAction<string>>,
    value: unknown,
    replace: boolean,
    defaults: string[] = []
  ) {
    const next = typeof value === "number" && Number.isFinite(value) ? String(value) : typeof value === "string" ? value.trim() : ""
    if (!next || /needs seller check|not confirmed/i.test(next)) return
    setter((current) => (shouldFillValue(current, replace, defaults) ? next : current))
  }

  function setSelectFromCaterBot(
    setter: Dispatch<SetStateAction<string>>,
    value: unknown,
    replace: boolean,
    defaults: string[] = []
  ) {
    setTextFromCaterBot(setter, value, replace, defaults)
  }

  function valueForInput(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return String(value)
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (!trimmed || /needs seller check|not confirmed|unknown/i.test(trimmed)) return ""
      return trimmed
    }
    return ""
  }

  function applyCaterBotDeliveryMeasurements(result: CaterBotSpecLookupResponse, replace: boolean) {
    const specs = result.specs
    const weight = valueForInput(specs?.gross_weight_kg || specs?.net_weight_kg || specs?.weight_kg)
    const height = valueForInput(specs?.height_cm)
    const length = valueForInput(specs?.depth_cm)
    const width = valueForInput(specs?.width_cm)

    const itemWeightKg = positiveNumber(weight)
    const itemHeightCm = positiveNumber(height)

    const palletWeight = weight ? String(Math.ceil(Number(weight) + 20)) : ""
    if (weight) setWeightKg((current) => (replace || !current.trim() ? palletWeight : current))

    if (itemHeightCm > 0) {
      const pallet = computePalletFromItem(itemHeightCm, itemWeightKg)
      setLengthCm((current) => (replace || !current.trim() ? String(pallet.palletLengthCm) : current))
      setWidthCm((current) => (replace || !current.trim() ? String(pallet.palletWidthCm) : current))
      setHeightCm((current) => (replace || !current.trim() ? String(pallet.palletHeightCm) : current))
    }

    if (weight) setShippingSpecWeight((current) => (replace || !current.trim() ? weight : current))
    if (length) setShippingSpecDepth((current) => (replace || !current.trim() ? length : current))
    if (width) setShippingSpecWidth((current) => (replace || !current.trim() ? width : current))
    if (height) setShippingSpecHeight((current) => (replace || !current.trim() ? height : current))

    if (weight && height) {
      setDeliverySizeUnknown(false)
    }

    return { weight, length, width, height }
  }

  function applySpecLookupResult(
    result: CaterBotSpecLookupResponse,
    options: { replace?: boolean; keepPanel?: boolean } = {}
  ) {
    const replace = Boolean(options.replace)
    const specs = result.specs
    const extracted = result.extracted
    const source = result.source
    const visual = result.image_analysis?.main_image

    setTextFromCaterBot(setTitle, specs?.title, replace)
    setSelectFromCaterBot(setCategory, specs?.category, replace, ["Catering Equipment"])
    if (specs?.category) {
      const nextSubcategories = subcategoriesForCategory(specs.category)
      if (nextSubcategories.length > 0 && !nextSubcategories.includes(subcategory)) {
        setSubcategory(nextSubcategories[0])
      }
    }
    setSelectFromCaterBot(setSubcategory, specs?.type || visual?.visual_category, replace, ["Cooking Equipment"])
    setSelectFromCaterBot(setCondition, specs?.condition, replace, ["Used"])
    setTextFromCaterBot(
      setDescription,
      specs?.short_description ||
        buildCaterBotShortDescription(
        {
          suggested_title: specs?.title || title,
          description: "",
          short_description: "",
          category: specs?.category || category,
          subcategory: specs?.type || visual?.equipment_type || subcategory,
          brand: specs?.brand || extracted?.brand || "",
          model: specs?.model || extracted?.model || "",
          serial_number: extracted?.serial || "",
          gc_number: "",
          dimensions: "",
          weight: "",
          power_type: specs?.power_type || "",
          gas_type: specs?.gas_type || extracted?.gas_type || "",
          voltage: specs?.voltage || "",
          amps: specs?.amps ? `${specs.amps}A` : "",
          kw_rating: specs?.heat_input_kw ? `${specs.heat_input_kw}kW` : "",
          electrical_phase: specs?.phase || "",
          manual_url: "",
          shipping_class: specs?.suggested_pallet_size || "",
          delivery_warning: "",
          confidence_score: result.confidence_score || 0,
          condition: ((specs?.condition as QuickListAiResponse["condition"]) ||
            (normaliseCondition(condition) as QuickListAiResponse["condition"])),
        },
        condition
        ),
      replace
    )

    setTextFromCaterBot(setShippingSpecBrand, specs?.brand || extracted?.brand || visual?.visible_brand, replace)
    setTextFromCaterBot(setShippingSpecModel, specs?.model || extracted?.model || visual?.visible_model, replace)
    setTextFromCaterBot(setShippingSpecSerial, extracted?.serial, replace)
    if (extracted?.equipment_type || visual?.equipment_type || specs?.type) {
      setShippingSpecCategory(shippingCategoryFrom(extracted?.equipment_type || visual?.equipment_type || specs?.type))
    }
    if (extracted?.power || specs?.power_details || specs?.safety_note) {
      const notes = [
        specs?.power_details ? `Power details: ${specs.power_details}.` : "",
        specs?.safety_note || "",
        extracted?.power ? `Plate details: ${extracted.power}.` : "",
      ].filter(Boolean).join(" ")
      setShippingSpecNotes((current) => (replace || !current ? notes : current))
    }

    if (specs?.width_cm && specs.depth_cm && specs.height_cm) {
      setTextFromCaterBot(setShippingSpecWidth, specs.width_cm, replace)
      setTextFromCaterBot(setShippingSpecDepth, specs.depth_cm, replace)
      setTextFromCaterBot(setShippingSpecHeight, specs.height_cm, replace)
      setDeliverySizeUnknown(false)
    }

    const sourceWeight = specs?.gross_weight_kg || specs?.net_weight_kg || specs?.weight_kg
    if (sourceWeight) {
      setTextFromCaterBot(setShippingSpecWeight, sourceWeight, replace)
      setDeliverySizeUnknown(false)
    }
    const appliedMeasurements = applyCaterBotDeliveryMeasurements(result, replace)

    const itemHeightCm = positiveNumber(appliedMeasurements.height)
    const itemWeightKg = positiveNumber(appliedMeasurements.weight)
    const pallet = computePalletFromItem(itemHeightCm, itemWeightKg)
    if (pallet.tier && 'tooBig' in pallet.tier) {
      setPalletTooBig(true)
      setPalletEnabled(false)
      setPalletSizeNote("")
    } else if (pallet.tier && (replace || !palletSizeManuallySet)) {
      setPalletTooBig(false)
      setPalletSize(pallet.tier.slug)
      const hM = (pallet.palletHeightCm / 100).toFixed(1)
      const wTotal = Math.ceil(pallet.palletWeightKg)
      const wItem = Math.ceil(itemWeightKg)
      setPalletSizeNote(
        `CaterBot suggests ${pallet.tier.label} based on ~${hM}m height and ~${wTotal} kg (${wItem} kg item + 20 kg pallet) — please confirm before publishing.`
      )
    } else {
      setPalletTooBig(false)
      if (itemHeightCm > 0 && itemWeightKg <= 0 && !palletSizeManuallySet) {
        setPalletSizeNote("Item weight needed to confirm pallet tier — add it in Equipment Specifications below.")
      }
    }

    if (specs?.voltage) setTextFromCaterBot(setShippingSpecVoltage, specs.voltage, replace)
    if (specs?.phase) setSelectFromCaterBot(setShippingSpecPhase, /3|three/i.test(specs.phase) ? "3" : "1", replace)
    if (specs?.amps) setTextFromCaterBot(setShippingSpecCurrent, specs.amps, replace)
    if (specs?.power_type) setShippingSpecPowerType(shippingPowerTypeFrom(specs.power_type))
    if (specs?.gas_type || extracted?.gas_type) {
      setTextFromCaterBot(setShippingSpecGasType, specs?.gas_type || extracted?.gas_type, replace)
    }
    if (specs?.gas_connection || extracted?.gas_connection) {
      setTextFromCaterBot(setShippingSpecGasConnection, specs?.gas_connection || extracted?.gas_connection, replace)
    }
    const palletTierLabel = pallet.tier && !('tooBig' in pallet.tier) ? pallet.tier.label : null
    if (
      specs?.refrigerant ||
      specs?.capacity_litres ||
      specs?.delivery_notes ||
      specs?.power_details ||
      specs?.safety_note ||
      palletTierLabel
    ) {
      const notes = [
        specs?.capacity_litres ? `Capacity: ${specs.capacity_litres} litres.` : "",
        specs?.refrigerant ? `Refrigerant: ${specs.refrigerant}${specs.refrigerant_mass ? ` ${specs.refrigerant_mass}` : ""}.` : "",
        specs?.heat_input_kw ? `Heat input: ${specs.heat_input_kw}kW.` : "",
        specs?.power_details ? `Power details: ${specs.power_details}.` : "",
        specs?.safety_note || "",
        specs?.gas_connection ? `Gas connection: ${specs.gas_connection}.` : "",
        palletTierLabel ? `CaterBot delivery suggestion: ${palletTierLabel}.` : "",
        specs?.delivery_notes || "",
      ].filter(Boolean)
      setDeliveryNotes((current) => (replace || !current.trim() ? notes.join(" ") : current))
    }
    if (specs?.pallet_required) setPalletReady(true)

    if (source?.url) {
      setManualSourceUrl(source.url)
      setSpecSourceUrl(source.url)
      setManualSourceName(source.sourceName || "Verified manual/spec source")
      setManualSourceType(source.sourceType || "Verified source")
      setManualSourceValidated(true)
      setManualSourceLastCheckedAt(source.checkedAt || result.checkedAt || new Date().toISOString())
      setManualSourceMatchNotes(source.matchNotes || "CaterBot verified the source against this item's plate details.")
      setManualSourceUsefulDetails(Array.isArray(source.usefulDetails) ? source.usefulDetails : [])
      setSpecConfidence(source.confidence || "medium")
      setSpecsVerifiedBySeller(false)
      setSourceRejectedBySeller(false)
    }

    // Store Gemini estimates only for fields not already filled by a verified web source
    const ge = result.geminiEstimates
    if (ge) {
      const webHasDims = Boolean(specs?.width_cm && specs.depth_cm && specs.height_cm)
      const webHasWeight = Boolean(specs?.gross_weight_kg || specs?.net_weight_kg || specs?.weight_kg)
      const pending: NonNullable<typeof ge> = {}
      if (!webHasDims) {
        if (ge.height_cm != null) pending.height_cm = ge.height_cm
        if (ge.width_cm != null) pending.width_cm = ge.width_cm
        if (ge.depth_cm != null) pending.depth_cm = ge.depth_cm
      }
      if (!webHasWeight && ge.weight_kg != null) pending.weight_kg = ge.weight_kg
      setPendingGeminiEstimates(Object.keys(pending).length ? pending : null)
    } else {
      // No Gemini estimates from spec-lookup — fall back to AI knowledge estimates
      // from the original scan (ai_dimensions / ai_weight_kg) when no web source was found
      const webSourceFound = Boolean(result.source?.url)
      if (!webSourceFound && quickListResult && (quickListResult.ai_dimensions || quickListResult.ai_weight_kg != null)) {
        const dims = quickListResult.dimensions || quickListResult.ai_dimensions
        const dimMatch = dims?.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/)
        const pending: NonNullable<typeof pendingGeminiEstimates> = {}
        if (dimMatch) {
          pending.width_cm = Math.ceil(Number(dimMatch[1]))
          pending.depth_cm = Math.ceil(Number(dimMatch[2]))
          pending.height_cm = Math.ceil(Number(dimMatch[3]))
        }
        if (quickListResult.ai_weight_kg != null && quickListResult.ai_weight_kg > 0) {
          pending.weight_kg = Math.ceil(quickListResult.ai_weight_kg)
        }
        setPendingGeminiEstimates(Object.keys(pending).length ? pending : null)
      } else {
        setPendingGeminiEstimates(null)
      }
    }

    if (!options.keepPanel) setPendingSpecLookup(null)
    const measurementText =
      appliedMeasurements.weight && appliedMeasurements.length && appliedMeasurements.width && appliedMeasurements.height
        ? ` CaterBot applied ${appliedMeasurements.weight}kg, ${appliedMeasurements.length}L x ${appliedMeasurements.width}W x ${appliedMeasurements.height}H cm.`
        : ""
    setAiNotice(`CaterBot specs applied.${measurementText} Please check the measurements before publishing.`)
  }

  async function lookupSpecsWithCaterBot(
    options: { suggestion?: QuickListAiResponse; autoApplyEmpty?: boolean; specPlateFile?: File; imageFiles?: File[] } = {}
  ) {
    if (!userId) {
      requireLogin()
      return
    }

    const { brand, model } = productMatchIdentity()
    const activeSpecPlateFile = options.specPlateFile || specPlateFile
    const activeImageFiles = options.imageFiles || imageFiles
    if (activeImageFiles.length === 0 && !activeSpecPlateFile && !model && !options.suggestion?.model) {
      const uploadMessage = "Upload an item photo or spec plate first so CaterBot can find the correct specs."
      setManualLinkError(uploadMessage)
      setAiError(uploadMessage)
      return
    }

    setManualLinkChecking(true)
    setManualLinkError("")
    setAiNotice("CaterBot is scanning the item photo, reading the spec plate and checking trusted sources...")

    try {
      const itemImages = await buildCaterBotImageInputs(activeImageFiles)
      const mainImageFile = activeImageFiles[0]
      const mainImageDataUrl = itemImages[0]
        ? `data:${itemImages[0].fileType};base64,${itemImages[0].imageBase64}`
        : ""
      const specPlateDataUrl = activeSpecPlateFile ? await resizeSpecPlateForAi(activeSpecPlateFile) : ""
      const res = await fetch("/api/caterbot/spec-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandHint: options.suggestion?.brand || brand,
          modelHint: options.suggestion?.model || options.suggestion?.gc_number || model,
          titleHint: options.suggestion?.suggested_title || options.suggestion?.title || "",
          categoryHint: category,
          conditionHint: condition,
          equipment_type: shippingCategoryFrom(options.suggestion?.subcategory || options.suggestion?.category || options.suggestion?.suggested_title) || shippingSpecCategory || subcategory || category,
          fuel_type: shippingPowerTypeFrom(options.suggestion?.power_type || options.suggestion?.gas_or_electric || options.suggestion?.gas_type) || shippingSpecPowerType || powerType,
          manualText: options.suggestion
            ? [
                options.suggestion.brand,
                options.suggestion.model,
                options.suggestion.gc_number,
                options.suggestion.suggested_title,
                options.suggestion.description,
                options.suggestion.power_type,
                options.suggestion.gas_type,
                options.suggestion.voltage,
                options.suggestion.kw_rating,
              ].filter(Boolean).join(" ")
            : undefined,
          dimensionHint: extractDimensionHint(options.suggestion),
          mainImageBase64: mainImageDataUrl ? getBase64Payload(mainImageDataUrl) : undefined,
          mainImageFileType: mainImageDataUrl ? getDataUrlFileType(mainImageDataUrl, mainImageFile?.type || "image/jpeg") : undefined,
          specPlateImageBase64: specPlateDataUrl ? getBase64Payload(specPlateDataUrl) : undefined,
          specPlateFileType: specPlateDataUrl ? getDataUrlFileType(specPlateDataUrl, activeSpecPlateFile?.type || "image/jpeg") : undefined,
          imageInputs: itemImages,
        }),
      })
      const data = (await res.json()) as CaterBotSpecLookupResponse
      const checkedAt = data.source?.checkedAt || data.checkedAt || new Date().toISOString()
      setManualSourceLastCheckedAt(checkedAt)
      console.log("[DIAG specLookup response]", { httpStatus: res.status, ok: res.ok, success: data.success, matchType: data.matchType, sourceUrl: data.source?.url || "" })

      if (data.extracted?.brand && !shippingSpecBrand) setShippingSpecBrand(data.extracted.brand)
      if (data.extracted?.model && !shippingSpecModel) setShippingSpecModel(data.extracted.model)

      if (!res.ok || data.success === false) {
        const rawMessage = data.error || data.warnings?.[0] || ""
        const isApiError = res.status >= 500 || /denied|contact support|quota/i.test(rawMessage)
        const message = isApiError
          ? "CaterBot is temporarily unavailable — please fill in details manually or try again later."
          : rawMessage || "CaterBot could not complete the spec lookup."
        setManualSourceMatchNotes(message)
        console.log("[DIAG specLookup ERROR PATH] unconditional setManualSourceValidated(false). status:", res.status, "success:", data.success, "error:", rawMessage)
        setManualSourceValidated(false)
        setSpecConfidence("low")
        setManualLinkError(message)
        setAiNotice("")
        return
      }

      setPendingSpecLookup(data)
      setSpecConfidence(data.source?.confidence || "low")

      if (data.matchType === "exact" && data.source?.url) {
        setManualSourceUrl(data.source.url)
        setSpecSourceUrl(data.source.url)
        setManualSourceName(data.source.sourceName || "Verified manual/spec source")
        setManualSourceType(data.source.sourceType || "Verified source")
        setManualSourceValidated(true)
        setManualSourceUsefulDetails(Array.isArray(data.source.usefulDetails) ? data.source.usefulDetails : [])
        setSpecConfidence(data.source.confidence || "high")
        setSpecsVerifiedBySeller(false)
        setSourceRejectedBySeller(false)
        setManualSourceMatchNotes(data.source.matchNotes || "CaterBot found an exact match for this product.")
        setAiNotice("CaterBot found an exact match. Review the specs below and confirm before applying.")
      } else if (data.source?.url) {
        const message = "CaterBot found a partial match only — no exact product record. Check the model number and enter details manually."
        setManualSourceMatchNotes(message)
        setManualSourceValidated(prev => { console.log("[DIAG specLookup updater approximate] prev =", prev); return prev ? prev : false })
        setAiNotice(message)
      } else {
        const currentNotes = manualSourceMatchNotes
        // Don't overwrite an "AI estimate…" message the scan already set — it's more
        // informative than the generic no-source message.
        if (!/^AI estimate/i.test(currentNotes)) {
          const message = "No verified information found — please enter specs from the item's spec plate or manufacturer documentation."
          setManualSourceMatchNotes(message)
          setAiNotice(message)
        }
        setManualSourceValidated(prev => { console.log("[DIAG specLookup updater no_match] prev =", prev); return prev ? prev : false })

        // No spec-lookup source and no geminiEstimates — immediately populate the amber
        // "AI estimate" banner from the original scan result so the seller sees them.
        if (!data.geminiEstimates && quickListResult &&
          (quickListResult.ai_dimensions || quickListResult.ai_weight_kg != null)) {
          const dims = quickListResult.dimensions || quickListResult.ai_dimensions
          const dimMatch = dims?.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/)
          const pending: NonNullable<typeof pendingGeminiEstimates> = {}
          if (dimMatch) {
            pending.width_cm = Math.ceil(Number(dimMatch[1]))
            pending.depth_cm = Math.ceil(Number(dimMatch[2]))
            pending.height_cm = Math.ceil(Number(dimMatch[3]))
          }
          if (quickListResult.ai_weight_kg != null && quickListResult.ai_weight_kg > 0) {
            pending.weight_kg = Math.ceil(quickListResult.ai_weight_kg)
          }
          if (Object.keys(pending).length) setPendingGeminiEstimates(pending)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "CaterBot could not complete the spec lookup."
      setManualLinkError(message)
      setManualSourceMatchNotes(message)
      setAiNotice("")
    } finally {
      setManualLinkChecking(false)
    }
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

  function openManualSource() {
    const rawUrl =
      manualSourceUrl ||
      specSourceUrl ||
      pendingSpecLookup?.source?.url ||
      pendingSpecLookup?.sources?.find((source) => source.url)?.url ||
      ""
    const sourceUrl = rawUrl.trim()

    if (!/^https?:\/\//i.test(sourceUrl)) {
      setManualLinkError("CaterBot has not saved a usable source URL yet. Search again or add the source manually.")
      return
    }

    setManualLinkError("")
    window.open(sourceUrl, "_blank", "noopener,noreferrer")
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
    const usesPalletDelivery = palletEnabled
    const anyDeliveryEnabled = palletEnabled || collectionEnabled || buyerArrangesEnabled
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

    if (!anyDeliveryEnabled) {
      setPublishError("Choose at least one delivery option.")
      return
    }

    if (usesPalletDelivery && !hasRequiredDeliverySize) {
      setPublishError("Add item weight and pallet dimensions to enable delivery quotes.")
      return
    }

    if (usesPalletDelivery) {
      const requiredPalletFields = [
        ["collection_full_address", "Add collection full address."],
        ["collection_postcode", "Add collection postcode."],
        ["collection_city", "Add collection city."],
        ["seller_contact_name", "Add seller contact name."],
        ["seller_phone", "Add seller phone number."],
        ["pallet_size", "Choose pallet size."],
        ["pallet_count", "Add number of pallets."],
      ] as const

      for (const [fieldName, message] of requiredPalletFields) {
        const value = ((formData.get(fieldName) as string) || "").trim()
        if (!value || (fieldName === "pallet_count" && !hasPositiveNumber(formData.get(fieldName)))) {
          setPublishError(message)
          return
        }
      }

      if (!palletSizeNote && formData.get("pallet_size_confirmed") !== "on") {
        setPublishError("Confirm this item fits the chosen pallet size.")
        return
      }

      if (formData.get("pallet_preparation_confirmed") !== "on") {
        setPublishError("Read and confirm the pallet preparation guide.")
        return
      }

      if (formData.get("delivery_details_confirmed") !== "on") {
        setPublishError("Confirm delivery details.")
        return
      }
    }

    if (manualSourceHasVerifiedUrl && formData.get("specs_verified_by_seller") !== "on") {
      setPublishError("Confirm the product source matches your item.")
      return
    }

    if (sizeUnknown && !usesPalletDelivery) {
      formData.set("weight_kg", "")
      formData.set("length_cm", "")
      formData.set("width_cm", "")
      formData.set("height_cm", "")
    }

    // Set legacy delivery_method summary string (read by actions.ts for backward compat)
    const legacyDeliveryMethod = palletEnabled ? "pallet_delivery" : buyerArrangesEnabled ? "buyer_arranges" : "collection_only"
    formData.set("delivery_method", legacyDeliveryMethod)
    formData.set("delivery_option", buildDeliveryOptionSummary(palletEnabled, collectionEnabled, buyerArrangesEnabled))
    formData.set("collection_enabled", collectionEnabled ? "on" : "")
    formData.set("buyer_arranges_enabled", buyerArrangesEnabled ? "on" : "")

    if (!usesPalletDelivery) {
      formData.set("delivery_available", "")
      formData.set("caterbids_delivery_available", "")
      formData.set("collection_full_address", "")
      formData.set("seller_contact_name", "")
      formData.set("seller_phone", "")
      formData.set("pallet_size", "")
      formData.set("pallet_count", "1")
      formData.set("pallet_preparation_confirmed", "")
      formData.set("delivery_details_confirmed", "")
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

      if (result.success) {
        if (featureBoostDays) {
          try {
            const featRes = await fetch("/api/stripe/create-featured-checkout-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ listingId: result.listingId, durationDays: featureBoostDays }),
            })
            const featData = (await featRes.json()) as { url?: string }
            if (featData?.url) {
              window.location.assign(featData.url)
              return
            }
          } catch {
            // Stripe call failed — fall through to success page; boost upsell available there
          }
        }
        router.push(result.redirectTo)
        return
      }

      if (result.redirectTo) {
        router.push(result.redirectTo)
        return
      }

      if (result.code === 'OVERAGE_REQUIRED') {
        setOverageRequired(true)
      }
      setPublishError(result.error)
    })
  }

  async function handleOverageCheckout() {
    setOverageRequired(false)
    setPublishError("")
    setIsOverageLoading(true)
    try {
      const res = await fetch("/api/stripe/create-overage-checkout-session", { method: "POST" })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout.")
      window.location.assign(data.url)
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Could not open checkout.")
      setIsOverageLoading(false)
    }
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
      setInterparcelPreviewError("Add pallet dimensions and item weight before checking Interparcel pricing.")
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
          insuranceValue: price || "500",
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
        : /^AI estimate/i.test(manualSourceMatchNotes)
          ? "AI estimate — confirm"
          : manualSourceLastCheckedAt
            ? "Search completed — no reliable match"
            : "No reliable match"
  console.log("[DIAG render sourceStatus]", { manualSourceValidated, manualSourceUrl, specSourceUrl, sourceRejectedBySeller, manualSourceHasVerifiedUrl, sourceStatusText })
  const showCaterBotProductMatch =
    Boolean(quickListResult) || manualSourceHasVerifiedUrl || Boolean(manualSourceMatchNotes) || sourceRejectedBySeller
  const deliveryMeasurementsReady = Boolean(weightKg && lengthCm && widthCm && heightCm)
  const showGasFields = shippingSpecPowerType === "Gas" || shippingSpecPowerType === "Both"
  const showElectricFields = shippingSpecPowerType === "Electric" || shippingSpecPowerType === "Both"
  const itemDimensionsValue =
    dimensions || (deliveryMeasurementsReady ? `${lengthCm} x ${widthCm} x ${heightCm} cm` : "")
  const reviewLocation = city || location || collectionCity || "Not added"
  const reviewDeliveryOption = buildDeliveryOptionSummary(palletEnabled, collectionEnabled, buyerArrangesEnabled)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,46,93,0.95),rgba(0,18,40,1)_48%,rgba(0,10,25,1)_100%)] px-4 py-5 text-white sm:px-6 lg:px-8">
      {showOverageSuccess && (
        <div className="-mx-4 -mt-5 mb-5 sm:-mx-6 lg:-mx-8 bg-gradient-to-r from-[#FF6B00] to-amber-500 px-4 py-5 shadow-[0_4px_28px_rgba(255,107,0,0.45)] sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            <CheckCircle2 className="h-7 w-7 shrink-0 text-white" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <p className="text-xl font-black text-white">Payment successful — extra listing added</p>
              <p className="mt-0.5 text-sm font-bold text-white/85">You now have an additional listing slot. Fill in your listing below and publish when ready.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowOverageSuccess(false)
                router.replace("/post-listing", { scroll: false })
              }}
              className="shrink-0 rounded-xl p-1.5 text-white/80 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      {!authChecked ? (
        <div className="flex min-h-[70vh] items-center justify-center text-white/60">
          Checking your free account...
        </div>
      ) : (
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => router.push("/account")}
          className="fixed right-4 top-4 z-40 rounded-full border border-white/18 bg-[#062747]/95 px-4 py-2 text-sm font-black text-white shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[#FF6B00]/70 hover:bg-[#0A345C] focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25 sm:right-6 sm:top-6"
          aria-label="Exit list item page and go to account"
        >
          Exit to account
        </button>

        <header className="relative pb-5 text-center">
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="absolute left-0 top-0 flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/7 px-3 text-sm font-black text-white shadow-[0_18px_55px_rgba(0,0,0,0.2)] transition hover:border-[#FF6B00]/60 hover:bg-white/12 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25 sm:h-14 sm:px-4"
            aria-label="Back to account"
          >
            <span className="text-2xl font-light leading-none">‹</span>
            <span className="hidden sm:inline">Account</span>
          </button>

          <SiteLogo size="lg" priority />
          <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">List your item</h1>
          <p className="mt-2 text-base font-semibold text-white/72 sm:text-lg">Upload photos, add details, and publish.</p>
        </header>

        <nav
          aria-label="Listing progress"
          className="mb-5 grid grid-cols-4 gap-2 rounded-[1.4rem] border border-white/12 bg-white/[0.04] p-2 text-center text-[11px] font-black text-white/58 shadow-[0_20px_70px_rgba(0,0,0,0.2)] sm:text-sm"
        >
          {[
            ["Photos", "#photos-step"],
            ["Details", "#item-details-step"],
            ["Delivery", "#delivery-step"],
            ["Review", "#review-step"],
          ].map(([step, href], index) => (
            <a
              key={step}
              href={href}
              className={`rounded-2xl px-2 py-2 transition focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25 ${
                index === 0 ? "bg-[#FF6B00] text-white shadow-[0_12px_30px_rgba(255,107,0,0.25)]" : "hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full border ${
                index === 0 ? "border-white/45 bg-white/16" : "border-white/20 bg-white/5 text-white/80"
              }`}>
                {index + 1}
              </span>
              {step}
            </a>
          ))}
        </nav>

        {paymentNotice && (
          <div className="mb-5 rounded-[1.4rem] border border-[#FF6B00]/30 bg-[#FF6B00]/12 px-4 py-3 text-sm font-black text-orange-50 shadow-[0_16px_50px_rgba(0,0,0,0.22)]">
            {paymentNotice}{" "}
            <a href="/pricing" className="underline decoration-[#FF6B00] decoration-2 underline-offset-4">
              View seller pricing
            </a>
          </div>
        )}

        <section id="photos-step" className="mb-5 rounded-[1.6rem] border border-white/14 bg-[#061f3d]/86 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur sm:p-6">
          <h2 className="text-2xl font-black tracking-[-0.035em] text-white">1. Photos</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#FF6B00]/70 bg-[#FF6B00]/10 px-4 py-5 text-center text-sm font-extrabold text-white transition hover:bg-[#FF6B00]/18 focus-within:ring-4 focus-within:ring-[#FF6B00]/25">
            <ImagePlus size={34} aria-hidden="true" />
            <span className="text-base">Upload item photos</span>
            <span className="text-xs font-semibold text-white/68">Add up to 6 photos</span>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </label>

          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/28 bg-white/7 px-4 py-5 text-center text-sm font-extrabold text-white transition hover:bg-white/12 focus-within:ring-4 focus-within:ring-white/15">
            <UploadCloud size={34} aria-hidden="true" />
            <span className="text-base">Upload spec plate</span>
            <span className="text-xs font-semibold text-white/68">JPG or PNG</span>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
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

        {specPlateValidation && (
          <p className="mt-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">
            {specPlateValidation}
          </p>
        )}

        {(imagePreviews.length > 0 || specPlatePreview) && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

        <p className="flex items-center gap-2 text-sm font-semibold text-white/64">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">i</span>
          Clear photos help buyers trust your listing and sell faster.
        </p>
        </div>

        <aside className="order-first lg:order-none rounded-[1.35rem] border border-white/12 bg-white/[0.055] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B00]/18 text-[#FF6B00]">
            <ScanSearch size={23} aria-hidden="true" />
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#FF6B00]">
              CaterBot
              <span className="rounded-full bg-[#FF6B00] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">BETA</span>
            </p>
            <h3 className="text-xl font-extrabold text-white">Check & auto-fill</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">Scan photos, read the spec plate and find trusted details.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={scanQuickListAi}
            disabled={caterBotSearching}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-5 py-3 text-base font-black text-white shadow-[0_18px_45px_rgba(255,107,0,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {caterBotSearching
              ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
              : <ScanSearch size={18} aria-hidden="true" />}
            {caterBotSearching ? "CaterBot checking..." : "CaterBot check & auto-fill"}
          </button>
          <button
            type="button"
            onClick={() => lookupSpecsWithCaterBot({ autoApplyEmpty: false, suggestion: quickListResult ?? undefined })}
            disabled={caterBotSearching}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/7 px-5 py-3 text-sm font-black text-white transition hover:border-[#FF6B00]/60 hover:bg-white/11 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ScanSearch size={17} aria-hidden="true" />
            Find specs
          </button>
        </div>

        {imageFiles.length === 0 && !specPlateFile && !aiError && (
          <p className="mt-3 rounded-2xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-4 py-3 text-sm font-bold text-orange-100">
            Add a clear item photo or spec plate first. CaterBot must use images before it can auto-fill.
          </p>
        )}

        {caterBotSearching && (
          <div className="mt-3">
            <CaterBotSearchBar
              label={specPlateFile ? "Scanning item photo, reading spec plate and checking sources" : "Scanning item photo and checking sources"}
              progress={caterBotProgress}
            />
          </div>
        )}

        {aiError && (
          <p className="mt-3 rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200">
            {aiError}
          </p>
        )}

        {pendingSpecLookup ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white p-4 text-[#002E5D] shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black text-[#FF6B00]">CaterBot found item details [BETA]</p>
                <h3 className="mt-1 text-lg font-black">
                  {pendingSpecLookup.matchType === "exact"
                    ? "Exact match found — confirm before applying."
                    : pendingSpecLookup.matchType === "approximate"
                    ? "Possible match found — review before applying."
                    : "No exact match found — enter details manually."}
                </h3>
                {pendingSpecLookup.matchType === "approximate" && (
                  <p className="mt-1 text-xs font-bold text-amber-700">
                    CaterBot found a related product source but could not confirm the exact model number. Check the specs against your item&apos;s plate before applying.
                  </p>
                )}
                {pendingSpecLookup.matchType === "no_match" && (
                  <p className="mt-1 text-xs font-bold text-amber-700">
                    CaterBot could not confirm an exact product record for this brand and model. Do not apply specs — please check the model number and enter details from the spec plate.
                  </p>
                )}
              </div>
              {pendingSpecLookup.matchType === "exact" && (
                <div className="flex flex-col items-end gap-1">
                  <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                    ✓ Exact Match
                  </span>
                  <p className="text-right text-[10px] font-semibold text-emerald-700">From a verified product source.</p>
                </div>
              )}
              {pendingSpecLookup.matchType === "approximate" && (
                <div className="flex flex-col items-end gap-1">
                  <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                    ~ Possible Match
                  </span>
                  <p className="text-right text-[10px] font-semibold text-amber-700">Verify before publishing.</p>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {[
                ["Product", pendingSpecLookup!.specs?.title || pendingSpecLookup!.extracted?.product_name || title || "Needs seller check"],
                ["Brand", pendingSpecLookup!.specs?.brand || pendingSpecLookup!.extracted?.brand || shippingSpecBrand || "Needs seller check"],
                ["Model", pendingSpecLookup!.specs?.model || pendingSpecLookup!.extracted?.model || shippingSpecModel || "Needs seller check"],
                ["Type", pendingSpecLookup!.specs?.type || pendingSpecLookup!.image_analysis?.main_image?.equipment_type || shippingSpecCategory || "Needs seller check"],
                ["Dimensions", (() => {
                  const fromSpecs = caterBotDimensionsSummary(pendingSpecLookup!.specs)
                  if (fromSpecs !== "Needs seller check") return fromSpecs
                  // Fall back to AI estimate from scan result
                  const aiDims = quickListResult?.dimensions || quickListResult?.ai_dimensions
                  if (aiDims) {
                    const m = aiDims.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/)
                    if (m) return `${Math.ceil(Number(m[1]))} × ${Math.ceil(Number(m[2]))} × ${Math.ceil(Number(m[3]))} cm (AI estimate — confirm)`
                  }
                  return fromSpecs
                })()],
                ["Weight", (() => {
                  const fromSpecs = caterBotWeightSummary(pendingSpecLookup!.specs)
                  if (fromSpecs !== "Needs seller check") return fromSpecs
                  // Fall back to AI estimate from scan result
                  if (quickListResult?.ai_weight_kg != null && quickListResult.ai_weight_kg > 0) {
                    return `${Math.ceil(quickListResult.ai_weight_kg)} kg (AI estimate — confirm)`
                  }
                  return fromSpecs
                })()],
                ["Power", caterBotPowerSummary(pendingSpecLookup!.specs, pendingSpecLookup!.extracted)],
                ["Delivery", pendingSpecLookup!.specs?.suggested_pallet_size || deliveryRecommendation.recommendation || "Needs seller check"],
                ["Source status", manualSourceHasVerifiedUrl ? "Product source found" : "Manual/spec source not verified yet"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                  <p className="mt-1 font-bold text-[#002E5D]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {pendingSpecLookup.matchType === "exact" || pendingSpecLookup.matchType === "approximate" ? (
                <>
                  <button
                    type="button"
                    onClick={() => applySpecLookupResult(pendingSpecLookup!, { replace: false })}
                    className="rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white"
                  >
                    Apply Empty Fields
                  </button>
                  <button
                    type="button"
                    onClick={() => applySpecLookupResult(pendingSpecLookup!, { replace: true })}
                    className="rounded-xl border border-[#FF6B00]/35 bg-[#FF6B00]/10 px-4 py-3 text-sm font-black text-[#B34700]"
                  >
                    Replace All Details
                  </button>
                </>
              ) : (
                <div className="col-span-2 flex items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                  Specs cannot be applied — no source found. Enter details manually.
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  document.getElementById("item-details-step")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
                className="rounded-xl border border-[#002E5D]/15 bg-white px-4 py-3 text-sm font-black text-[#002E5D]"
              >
                Edit Manually
              </button>
              <button
                type="button"
                onClick={scanQuickListAi}
                disabled={caterBotSearching}
                className="rounded-xl border border-[#002E5D]/15 bg-white px-4 py-3 text-sm font-black text-[#002E5D] disabled:cursor-wait disabled:opacity-60"
              >
                Search Again
              </button>
            </div>

            <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
              manualSourceHasVerifiedUrl
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-orange-200 bg-orange-50 text-[#8A3A00]"
            }`}>
              <p>
                {manualSourceHasVerifiedUrl
                  ? "CaterBot found a product source. Please check it matches your item."
                  : "Manual/spec source not verified yet. You can still list using your own checks."}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {manualSourceHasVerifiedUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={openManualSource}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white"
                    >
                      Open Source
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecsVerifiedBySeller(true)}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-800"
                    >
                      {specsVerifiedBySeller ? "Source Confirmed" : "Confirm Source"}
                    </button>
                    <button
                      type="button"
                      onClick={rejectCaterBotSource}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-700"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setManualLinkPanelOpen((current) => !current)
                      setManualLinkError("")
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-[#002E5D]/15 bg-white px-4 py-3 text-sm font-black text-[#002E5D]"
                  >
                    Add Source Manually
                  </button>
                )}
              </div>
            </div>

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

            {process.env.NODE_ENV === "development" && (
              <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <summary className="cursor-pointer font-black text-[#002E5D]">Advanced CaterBot details</summary>
                <div className="mt-2 space-y-2 break-words">
                  <p><span className="font-black">OCR text:</span> {(pendingSpecLookup!.debug?.raw_text || pendingSpecLookup!.extracted?.raw_text || "None").slice(0, 700)}</p>
                  <p><span className="font-black">Queries:</span> {(pendingSpecLookup!.search_queries || []).slice(0, 10).join(" | ") || "None"}</p>
                  <p><span className="font-black">Selected source:</span> {pendingSpecLookup!.debug?.selected_source || pendingSpecLookup!.source?.url || "None"}</p>
                  {pendingSpecLookup!.warnings?.length ? <p><span className="font-black">Warnings:</span> {pendingSpecLookup!.warnings?.join(" | ")}</p> : null}
                </div>
              </details>
            )}
          </div>
        ) : (
          <>
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
          </>
        )}
        </aside>
      </div>
      </section>

      {/* FORM */}
      <form onSubmit={handlePublish} className="space-y-5">
        <section id="item-details-step" className="rounded-[1.6rem] border border-slate-200 bg-white p-4 text-[#002E5D] shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.035em]">2. Item details</h2>
            </div>
            {quickListApplied && (
              <span className="rounded-full bg-[#FF6B00]/10 px-3 py-1 text-xs font-black text-[#FF6B00]">
                Filled by CaterBot
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-black">Listing title <span className="text-[#FF6B00]">*</span></span>
              <input
                name="title"
                placeholder="e.g. Rational iCombi Pro 6-1/1"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <div className="grid gap-3 lg:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-black">Category <span className="text-[#FF6B00]">*</span></span>
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
                  <span className="mb-1 block text-sm font-black">Type <span className="text-[#FF6B00]">*</span></span>
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

            <div className="grid gap-3 lg:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-black">Condition <span className="text-[#FF6B00]">*</span></span>
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
                <span className="mb-1 block text-sm font-black">Price <span className="text-[#FF6B00]">*</span></span>
                <input
                  name="price"
                  placeholder="£ 0.00"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-black">Brand</span>
                <input
                  name="spec_brand"
                  value={shippingSpecBrand}
                  onChange={(event) => setShippingSpecBrand(event.target.value)}
                  placeholder="e.g. Rational"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Model</span>
                <input
                  name="spec_model"
                  value={shippingSpecModel}
                  onChange={(event) => setShippingSpecModel(event.target.value)}
                  placeholder="e.g. iCombi Pro 6-1/1"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Town or city <span className="text-[#FF6B00]">*</span></span>
                <input
                  name="city"
                  placeholder="e.g. Manchester"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value)
                    setLocation(e.target.value)
                  }}
                />
              </label>
            </div>

            {pendingGeminiEstimates && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                <p className="font-black text-amber-900">AI estimate — please confirm before publishing</p>
                <p className="mt-1 font-semibold text-amber-800">
                  {[
                    pendingGeminiEstimates.width_cm && pendingGeminiEstimates.depth_cm && pendingGeminiEstimates.height_cm
                      ? `Dimensions: ${pendingGeminiEstimates.width_cm}W × ${pendingGeminiEstimates.depth_cm}D × ${pendingGeminiEstimates.height_cm}H cm`
                      : null,
                    pendingGeminiEstimates.weight_kg != null
                      ? `Weight: ${pendingGeminiEstimates.weight_kg} kg`
                      : null,
                  ].filter(Boolean).join(" · ")}{" "}
                  — estimated from CaterBot&apos;s training data, not a verified source. Only confirm if it looks right for your item.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingGeminiEstimates.height_cm != null) setShippingSpecHeight(String(pendingGeminiEstimates.height_cm))
                      if (pendingGeminiEstimates.width_cm != null) setShippingSpecWidth(String(pendingGeminiEstimates.width_cm))
                      if (pendingGeminiEstimates.depth_cm != null) setShippingSpecDepth(String(pendingGeminiEstimates.depth_cm))
                      if (pendingGeminiEstimates.weight_kg != null) setShippingSpecWeight(String(pendingGeminiEstimates.weight_kg))
                      setPendingGeminiEstimates(null)
                    }}
                    className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-black text-white"
                  >
                    Confirm estimate
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingGeminiEstimates(null)}
                    className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-black text-amber-800"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Width (cm)", value: shippingSpecWidth, setValue: setShippingSpecWidth },
                { label: "Depth (cm)", value: shippingSpecDepth, setValue: setShippingSpecDepth },
                { label: "Height (cm)", value: shippingSpecHeight, setValue: setShippingSpecHeight },
                { label: "Weight (kg)", value: shippingSpecWeight, setValue: setShippingSpecWeight },
              ].map((field) => (
                <label key={field.label} className="block">
                  <span className="mb-1 block text-sm font-black">{field.label}</span>
                  <input
                    type="number"
                    min="0"
                    value={field.value}
                    onChange={(e) => field.setValue(e.target.value)}
                    placeholder="Needs seller check"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  />
                </label>
              ))}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-black">Short description <span className="text-[#FF6B00]">*</span></span>
              <textarea
                name="description"
                placeholder="Describe the item, key features, age, and any notes for buyers..."
                maxLength={1000}
                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className="mt-1 block text-right text-xs font-bold text-slate-400">{description.length} / 1000</span>
            </label>
          </div>

          {false && pendingSpecLookup && showCaterBotProductMatch && (
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
                      onClick={() => lookupSpecsWithCaterBot({ autoApplyEmpty: true, suggestion: quickListResult ?? undefined })}
                      disabled={manualLinkChecking}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
                    >
                      {manualLinkChecking ? "Searching sources..." : "Use CaterBot to Find Specs"}
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

              {manualLinkChecking && (
                <div className="mt-3">
                  <CaterBotSearchBar
                    label="Searching trusted manual/spec sources"
                    progress={caterBotProgress}
                    tone="light"
                  />
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

              {pendingSpecLookup && (
                <div className="mt-3 rounded-2xl border border-[#002E5D]/10 bg-white p-3">
                  <p className="text-sm font-black text-[#002E5D]">CaterBot found possible equipment specs</p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    {[
                      ["Brand", pendingSpecLookup!.extracted?.brand || "Needs seller check"],
                      ["Model", pendingSpecLookup!.extracted?.model || "Needs seller check"],
                      ["Product", pendingSpecLookup!.specs?.title || pendingSpecLookup!.extracted?.product_name || "Needs seller check"],
                      ["Type", pendingSpecLookup!.extracted?.equipment_type || pendingSpecLookup!.image_analysis?.main_image?.equipment_type || shippingSpecCategory || "Needs seller check"],
                      [
                      "Dimensions",
                      caterBotDimensionsSummary(pendingSpecLookup!.specs),
                      ],
                      [
                        "Weight",
                        pendingSpecLookup!.specs?.gross_weight_kg || pendingSpecLookup!.specs?.net_weight_kg
                          ? `${pendingSpecLookup!.specs?.gross_weight_kg || pendingSpecLookup!.specs?.net_weight_kg} kg`
                          : "Needs seller check",
                      ],
                      [
                        "Capacity",
                        pendingSpecLookup!.specs?.capacity_litres ? `${pendingSpecLookup!.specs?.capacity_litres} litres` : "Needs seller check",
                      ],
                      [
                        "Power",
                        [
                          pendingSpecLookup!.specs?.power_type,
                          pendingSpecLookup!.specs?.gas_type,
                          pendingSpecLookup!.specs?.voltage,
                          pendingSpecLookup!.specs?.phase,
                          pendingSpecLookup!.specs?.frequency,
                          pendingSpecLookup!.specs?.amps ? `${pendingSpecLookup!.specs?.amps}A` : "",
                          pendingSpecLookup!.specs?.watts ? `${pendingSpecLookup!.specs?.watts}W` : "",
                          pendingSpecLookup!.specs?.heat_input_kw ? `${pendingSpecLookup!.specs?.heat_input_kw}kW` : "",
                        ].filter(Boolean).join(" · ") || "Needs seller check",
                      ],
                      ["Delivery", pendingSpecLookup!.specs?.suggested_pallet_size || "Needs seller check"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="font-black uppercase tracking-[0.1em] text-slate-400">{label}</p>
                        <p className="mt-1 font-bold text-[#002E5D]">{value}</p>
                      </div>
                    ))}
                  </div>
                  {pendingSpecLookup!.source?.url && (
                    <a
                      href={pendingSpecLookup!.source?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-4 py-3 text-sm font-black text-[#B34700]"
                    >
                      Open source
                    </a>
                  )}
                  <p className="mt-3 text-xs font-semibold leading-relaxed text-[#002E5D]/65">
                    Specs are for guidance only. Check the measurements and source before publishing.
                  </p>
                  {process.env.NODE_ENV === "development" && (
                    <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                      <summary className="cursor-pointer font-black text-[#002E5D]">CaterBot debug details</summary>
                      <div className="mt-2 space-y-2 break-words">
                        <p>
                          <span className="font-black">OCR text:</span>{" "}
                          {(pendingSpecLookup!.debug?.raw_text || pendingSpecLookup!.extracted?.raw_text || "None").slice(0, 700)}
                        </p>
                        <p>
                          <span className="font-black">Model candidates:</span>{" "}
                          {(pendingSpecLookup!.debug?.model_candidates || []).join(", ") || pendingSpecLookup!.extracted?.model || "None"}
                        </p>
                        <p>
                          <span className="font-black">Selected source:</span>{" "}
                          {pendingSpecLookup!.debug?.selected_source || pendingSpecLookup!.source?.url || "None"}
                        </p>
                        <p>
                          <span className="font-black">Queries:</span>{" "}
                          {(pendingSpecLookup!.search_queries || []).slice(0, 10).join(" | ") || "None"}
                        </p>
                        {pendingSpecLookup!.warnings?.length ? (
                          <p>
                            <span className="font-black">Warnings:</span> {pendingSpecLookup!.warnings?.join(" | ")}
                          </p>
                        ) : null}
                      </div>
                    </details>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => applySpecLookupResult(pendingSpecLookup!, { replace: false })}
                      className="rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white"
                    >
                      Apply All Empty Fields
                    </button>
                    <button
                      type="button"
                      onClick={() => applySpecLookupResult(pendingSpecLookup!, { replace: true })}
                      className="rounded-xl border border-[#FF6B00]/35 bg-[#FF6B00]/10 px-4 py-3 text-sm font-black text-[#B34700]"
                    >
                      Replace All With CaterBot Specs
                    </button>
                    <button
                      type="button"
                      onClick={() => lookupSpecsWithCaterBot({ autoApplyEmpty: true, suggestion: quickListResult ?? undefined })}
                      className="rounded-xl border border-[#002E5D]/15 bg-white px-4 py-3 text-sm font-black text-[#002E5D]"
                    >
                      Search Again
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingSpecLookup(null)}
                      className="rounded-xl border border-[#002E5D]/15 bg-white px-4 py-3 text-sm font-black text-[#002E5D]"
                    >
                      Edit Manually
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section id="power-step" className="rounded-[1.6rem] border border-slate-200 bg-white p-4 text-[#002E5D] shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.035em]">3. Power & safety</h2>
            </div>
            {quickListApplied && (
              <span className="rounded-full bg-[#FF6B00]/10 px-3 py-1 text-xs font-black text-[#FF6B00]">
                Filled by CaterBot — please check
              </span>
            )}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-black">Power type <span className="text-[#FF6B00]">*</span></p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SHIPPING_POWER_TYPES.map((option) => (
                <label
                  key={option}
                  className={`flex items-center justify-center rounded-2xl border px-3 py-3 text-sm font-black transition ${
                    shippingSpecPowerType === option
                      ? "border-[#FF6B00] bg-[#FF6B00]/10 text-[#B34700]"
                      : "border-slate-200 bg-white text-[#002E5D] hover:border-[#FF6B00]/45"
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

          {showElectricFields && (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-black">Voltage (V)</span>
                <input
                  name="spec_voltage"
                  value={shippingSpecVoltage}
                  onChange={(event) => setShippingSpecVoltage(event.target.value)}
                  placeholder="e.g. 400"
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
              <label className="block">
                <span className="mb-1 block text-sm font-black">Amperage/current</span>
                <input
                  name="spec_current_a"
                  value={shippingSpecCurrent}
                  onChange={(event) => setShippingSpecCurrent(event.target.value)}
                  placeholder="e.g. 13A"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>
            </div>
          )}

          {showGasFields && (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <label className="block">
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
              <label className="block">
                <span className="mb-1 block text-sm font-black">Gas connection</span>
                <input
                  name="spec_gas_connection"
                  value={shippingSpecGasConnection}
                  onChange={(event) => setShippingSpecGasConnection(event.target.value)}
                  placeholder="e.g. 1/2 inch BSP"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>
            </div>
          )}

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-black">Safety/install note</span>
            <textarea
              name="service_history"
              value={shippingSpecNotes}
              onChange={(event) => setShippingSpecNotes(event.target.value)}
              placeholder="Optional"
              className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
            />
          </label>
        </section>

        <section id="delivery-step" className="rounded-[1.6rem] border border-slate-200 bg-white p-4 text-[#002E5D] shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:p-6">
          <h2 className="text-2xl font-black tracking-[-0.035em]">4. Delivery Options</h2>
          <p className="mt-1 text-sm font-semibold text-[#002E5D]/65">
            Choose all that apply — you must enable at least one.
          </p>

          <div className="mt-4 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 has-[:checked]:border-[#FF6B00]/40 has-[:checked]:bg-[#FF6B00]/5">
              <input
                type="checkbox"
                checked={collectionEnabled}
                onChange={(e) => setCollectionEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF6B00]"
              />
              <div>
                <p className="text-sm font-black text-[#002E5D]">Collection</p>
                <p className="mt-0.5 text-xs font-semibold text-[#002E5D]/60">Buyer collects in person from your location.</p>
              </div>
            </label>

            <label className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${palletTooBig ? "cursor-not-allowed border-red-200 bg-red-50 opacity-60" : "cursor-pointer border-slate-200 bg-slate-50 hover:border-slate-300 has-[:checked]:border-[#FF6B00]/40 has-[:checked]:bg-[#FF6B00]/5"}`}>
              <input
                type="checkbox"
                checked={palletEnabled}
                disabled={palletTooBig}
                onChange={(e) => setPalletEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF6B00] disabled:cursor-not-allowed"
              />
              <div>
                <p className="text-sm font-black text-[#002E5D]">CaterBids Pallet Delivery</p>
                {palletTooBig
                  ? <p className="mt-0.5 text-xs font-bold text-red-700">This item is too large for pallet delivery — choose Collection or Buyer-arranged instead.</p>
                  : <p className="mt-0.5 text-xs font-semibold text-[#002E5D]/60">Interparcel pallet courier — requires pallet size and collection details below.</p>
                }
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 has-[:checked]:border-[#FF6B00]/40 has-[:checked]:bg-[#FF6B00]/5">
              <input
                type="checkbox"
                checked={buyerArrangesEnabled}
                onChange={(e) => setBuyerArrangesEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF6B00]"
              />
              <div>
                <p className="text-sm font-black text-[#002E5D]">Buyer Arranges Delivery</p>
                <p className="mt-0.5 text-xs font-semibold text-[#002E5D]/60">Buyer books their own courier or transport.</p>
              </div>
            </label>
          </div>

          {palletEnabled && (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-4">
                <h3 className="text-lg font-black text-[#002E5D]">Need help preparing your item for pallet collection?</h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[#002E5D]/75">
                  Pallet delivery only works if the item is clean, safely disconnected, securely strapped and shrink-wrapped on a pallet before the driver arrives.
                </p>
                <a
                  href="/pallet-delivery-guide"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/20"
                >
                  View pallet preparation guide
                </a>
              </div>

              {!deliveryMeasurementsReady && (
                <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-[#8A3A00]">
                  Add item weight and pallet dimensions to enable delivery quotes.
                </p>
              )}
              {deliveryMeasurementsReady && quickListApplied && (
                <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
                  CaterBot estimate — seller must confirm.
                </p>
              )}

              <div className="grid gap-3 lg:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-black">Collection postcode <span className="text-[#FF6B00]">*</span></span>
              <input
                name="collection_postcode"
                value={collectionPostcode}
                onChange={(event) => setCollectionPostcode(event.target.value.toUpperCase())}
                placeholder="e.g. M1 1AA"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-black">Collection city <span className="text-[#FF6B00]">*</span></span>
              <input
                name="collection_city"
                value={collectionCity}
                onChange={(event) => setCollectionCity(event.target.value)}
                placeholder="e.g. Manchester"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
              />
            </label>
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
          </div>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Collection address <span className="text-[#FF6B00]">*</span></span>
                <textarea
                  name="collection_full_address"
                  value={collectionFullAddress}
                  onChange={(event) => setCollectionFullAddress(event.target.value)}
                  placeholder="Start typing your address"
                  className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>

              <div className="grid gap-3 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-black">Contact name <span className="text-[#FF6B00]">*</span></span>
                  <input
                    name="seller_contact_name"
                    value={sellerContactName}
                    onChange={(event) => setSellerContactName(event.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-black">Phone number <span className="text-[#FF6B00]">*</span></span>
                  <input
                    name="seller_phone"
                    value={sellerPhone}
                    onChange={(event) => setSellerPhone(event.target.value)}
                    placeholder="07 1234 567890"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  />
                </label>
              </div>

              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-[#002E5D]/70">
                All standard pallets sit on the <strong className="text-[#002E5D]">SAME 1.2m &times; 1m base</strong> — you&apos;re choosing by how <strong className="text-[#002E5D]">TALL</strong> and <strong className="text-[#002E5D]">HEAVY</strong> your item is, not the floor size. Measure after wrapping, round up, and if between two sizes pick the bigger one to avoid surcharges.
              </p>

              {/* Pallet size visual picker */}
              <div>
                <p className="mb-3 text-sm font-black text-[#002E5D]">
                  Pallet size <span className="text-[#FF6B00]">*</span>
                </p>
                {/* Big card — always the currently selected pallet */}
                {(() => {
                  const card = PALLET_CARDS.find((c) => c.slug === palletSize) ?? PALLET_CARDS[PALLET_CARDS.length - 1]
                  const imgFailed = palletImgErrors.has(card.slug)
                  return (
                    <div className="relative overflow-hidden rounded-2xl border-2 border-[#FF6B00] bg-white shadow-[0_0_0_4px_rgba(255,107,0,0.12)] shadow-sm">
                      {Boolean(palletSizeNote) && (
                        <span className="absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-[#FF6B00] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                          ✓ CaterBot
                        </span>
                      )}
                      <div className="relative aspect-[4/3] bg-white">
                        {card.image && !imgFailed ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={card.image}
                            alt={card.name}
                            className="absolute inset-0 h-full w-full object-contain"
                            onError={() =>
                              setPalletImgErrors((prev) => new Set([...prev, card.slug]))
                            }
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-slate-50">
                            <PackageCheck className="h-10 w-10 text-slate-300" strokeWidth={1.2} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
                {/* Small cards — the other 4; tapping promotes to big slot */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {PALLET_CARDS.filter((c) => c.slug !== palletSize).map((card) => {
                    const imgFailed = palletImgErrors.has(card.slug)
                    return (
                      <button
                        key={card.slug}
                        type="button"
                        onClick={() => {
                          setPalletSize(card.slug)
                          setPalletSizeManuallySet(true)
                          setPalletSizeNote("")
                        }}
                        className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                      >
                        <div className="relative aspect-[4/3] bg-white">
                          {card.image && !imgFailed ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={card.image}
                              alt={card.name}
                              className="absolute inset-0 h-full w-full object-contain"
                              onError={() =>
                                setPalletImgErrors((prev) => new Set([...prev, card.slug]))
                              }
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-slate-50">
                              <PackageCheck className="h-10 w-10 text-slate-300" strokeWidth={1.2} />
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <input type="hidden" name="pallet_size" value={palletSize} readOnly />
                {palletSizeNote && (
                  <p className="mt-2 text-xs font-semibold text-[#FF6B00]/90">{palletSizeNote}</p>
                )}
                <p className="mt-2 text-xs font-semibold text-[#002E5D]/40">
                  Custom pallet sizes coming soon — for oversized items, choose Collection Only or Buyer Arranges Delivery above.
                </p>
                {!palletSizeNote && (
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
                    <input
                      type="checkbox"
                      name="pallet_size_confirmed"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
                    />
                    <span className="text-sm font-bold text-amber-900">
                      I confirm this item fits this pallet size.
                    </span>
                  </label>
                )}
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Number of pallets <span className="text-[#FF6B00]">*</span></span>
                <input
                  name="pallet_count"
                  value={palletCount}
                  onChange={(event) => setPalletCount(event.target.value)}
                  type="number"
                  min="1"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>

              <input type="hidden" name="weight_kg" value={weightKg} />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="font-black text-[#002E5D]">Total shipping weight: </span>
                {weightKg ? (
                  <span className="font-semibold text-[#002E5D]">
                    {weightKg} kg ({Math.round(Number(weightKg) - 20)} kg item + 20 kg pallet)
                  </span>
                ) : (
                  <span className="font-semibold text-slate-400">Not yet set — confirm item weight in Equipment Specifications below.</span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Pallet length cm", name: "length_cm", value: lengthCm, setValue: setLengthCm },
                  { label: "Pallet width cm", name: "width_cm", value: widthCm, setValue: setWidthCm },
                  { label: "Pallet height cm", name: "height_cm", value: heightCm, setValue: setHeightCm },
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
                  { name: "commercial_premises", checked: commercialPremises, setChecked: setCommercialPremises, label: "Commercial premises" },
                  { name: "ground_floor_collection", checked: groundFloorCollection, setChecked: setGroundFloorCollection, label: "Ground-floor collection" },
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

              <label className="flex items-start gap-3 rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-4 py-3 text-sm font-bold text-[#8A3A00]">
                <input
                  name="pallet_preparation_confirmed"
                  type="checkbox"
                  checked={palletPreparationConfirmed}
                  onChange={(event) => setPalletPreparationConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#FF6B00]"
                />
                I have read the pallet preparation guide and confirm this item will be cleaned, safely disconnected, palletised, strapped and shrink-wrapped before collection.
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-black">Access restrictions</span>
                <textarea
                  name="access_restrictions"
                  value={accessRestrictions}
                  onChange={(event) => setAccessRestrictions(event.target.value)}
                  placeholder="Narrow access, loading bay, opening hours, parking, stairs or height limits."
                  className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-slate-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </label>
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
        </section>

        {process.env.NODE_ENV === "development" && (
        <details className="rounded-3xl bg-white p-5 text-[#002E5D] shadow-sm">
          <summary className="cursor-pointer list-none text-lg font-black">Advanced CaterBot details</summary>
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
          {quickListResult?._diag && (
            <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 font-mono text-xs text-red-900">
              <p className="mb-2 font-black text-red-600">TEMP DIAGNOSTIC — remove later</p>
              <p><span className="font-bold">ai_dimensions:</span> {quickListResult._diag.ai_dimensions || "(empty)"}</p>
              <p><span className="font-bold">source_valid:</span> {String(quickListResult._diag.source_valid)}</p>
              <p><span className="font-bold">source_url:</span> {quickListResult._diag.source_url || "(none)"}</p>
              <p><span className="font-bold">source_found_dimensions:</span> {quickListResult._diag.source_found_dimensions || "(empty)"}</p>
              <p><span className="font-bold">final_dimensions:</span> {quickListResult._diag.final_dimensions || "(empty)"}</p>
            </div>
          )}
        </details>
        )}

        <section id="review-step" className="rounded-[1.6rem] border border-slate-200 bg-white p-4 text-[#002E5D] shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-6">
          <h2 className="text-2xl font-black tracking-[-0.035em]">5. Review & publish</h2>

          <div className="mt-4 grid gap-5 lg:grid-cols-[1.2fr_0.9fr]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="grid gap-4 p-3 sm:grid-cols-[150px_1fr]">
                <div className="overflow-hidden rounded-xl bg-slate-200">
                  {imagePreview ? (
                    <NextImage
                      src={imagePreview}
                      alt="Main listing preview"
                      width={300}
                      height={220}
                      unoptimized
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center text-sm font-black text-slate-400">
                      No photo yet
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm font-bold">
                  <h3 className="text-lg font-black leading-tight">{title || "Listing title not added"}</h3>
                  <p className="text-slate-500">{subcategory || category} • {condition}</p>
                  <p className="text-slate-500">{reviewLocation}</p>
                  <p className="text-slate-500">{shippingSpecPowerType !== "Not sure" ? shippingSpecPowerType : "Power not confirmed"}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-2xl font-black text-[#FF6B00]">{price ? formatPrice(price) : "Price not added"}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-[#002E5D]">{condition}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">{reviewDeliveryOption}</p>
                </div>
              </div>
            </div>

          <div className="space-y-3">
            {(() => {
              const allRoutineConfirmed =
                listingInfoConfirmed &&
                ownershipConfirmed &&
                (!palletEnabled || deliveryDetailsConfirmed) &&
                (!manualSourceHasVerifiedUrl || specsVerifiedBySeller)
              return (
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#FF6B00]/30 bg-[#FF6B00]/5 px-4 py-3 text-sm font-black text-[#FF6B00]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#FF6B00]"
                    checked={allRoutineConfirmed}
                    onChange={(e) => {
                      const v = e.target.checked
                      setDeliveryDetailsConfirmed(v)
                      setSpecsVerifiedBySeller(v)
                      setListingInfoConfirmed(v)
                      setOwnershipConfirmed(v)
                    }}
                  />
                  Confirm all
                </label>
              )
            })()}

            {palletEnabled && (
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
            <label className="flex items-start gap-3 rounded-2xl border border-[#002E5D]/15 bg-slate-50 px-4 py-3 text-sm font-bold">
              <input
                name="seller_owns_item_confirmed"
                type="checkbox"
                required
                checked={ownershipConfirmed}
                onChange={(e) => setOwnershipConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#FF6B00]"
              />
              I own the item and have the right to sell it.
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-[#002E5D]/15 bg-slate-50 px-4 py-3 text-sm font-bold">
              <input
                name="terms_confirmed"
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 accent-[#FF6B00]"
              />
              <span>
                I agree to the CaterBidsUK{" "}
                <a href="/terms" className="text-[#FF6B00] underline">Terms & Conditions</a>.
              </span>
            </label>
          </div>
          </div>

          {boostSettings?.featured_boosts_enabled && (
            <div className="mt-6 rounded-2xl border border-[#FF6B00]/20 bg-[#0a2a4a] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#FF6B00]" />
                <p className="text-sm font-black text-white">
                  Feature this listing?{" "}
                  <span className="font-semibold text-white/45">(optional add-on)</span>
                </p>
              </div>
              <p className="mb-4 text-xs font-semibold text-white/55">
                Appear on the homepage &amp; top of search results. Your listing publishes free — payment is taken after.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([null, 7, 30] as const).map((days) => {
                  const selected = featureBoostDays === days
                  const priceLabel =
                    days === 7
                      ? `£${boostSettings.featured_price_7d.toFixed(2)}`
                      : days === 30
                        ? `£${boostSettings.featured_price_30d.toFixed(2)}`
                        : null
                  return (
                    <button
                      key={String(days)}
                      type="button"
                      onClick={() => setFeatureBoostDays(days)}
                      className={`rounded-xl border px-3 py-3 text-center transition ${
                        selected
                          ? days === null
                            ? "border-white/35 bg-white/10 text-white"
                            : "border-[#FF6B00] bg-[#FF6B00]/15 text-white"
                          : "border-white/12 bg-white/5 text-white/45 hover:border-white/25 hover:text-white/70"
                      }`}
                    >
                      <p className="text-[11px] font-black">
                        {days === null ? "No thanks" : `${days} days`}
                      </p>
                      <p
                        className={`text-[10px] font-semibold ${selected && days !== null ? "text-[#FF6B00]" : "text-white/40"}`}
                      >
                        {priceLabel ?? "Free"}
                      </p>
                      {days === 30 && (
                        <p className="text-[9px] font-black text-[#FF6B00]/70">Best value</p>
                      )}
                    </button>
                  )
                })}
              </div>
              {featureBoostDays && (
                <p className="mt-3 text-center text-[10px] font-semibold text-white/40">
                  Listing goes live either way — payment is only for the feature.
                </p>
              )}
            </div>
          )}

          {publishError && (
            <p className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">
              {publishError}
            </p>
          )}

          {overageRequired && (
            <button
              type="button"
              disabled={isOverageLoading}
              onClick={handleOverageCheckout}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/12 px-4 py-3 text-sm font-black text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-60"
            >
              {isOverageLoading ? "Opening checkout…" : "Add extra listing →"}
            </button>
          )}

          <button
            type="submit"
            disabled={isPublishing}
            className="mt-4 w-full rounded-2xl bg-[#FF6B00] px-4 py-4 text-lg font-black text-white shadow-lg shadow-[#FF6B00]/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPublishing ? "Publishing..." : "Publish listing"}
          </button>
          <p className="mt-3 text-center text-sm font-semibold text-slate-500">
            Your listing will be published to buyers once submitted successfully.
          </p>
        </section>

        <input type="hidden" name="location" value={location || city} />
        <input type="hidden" name="power_type" value={shippingSpecPowerType === "Not sure" ? "Unknown" : shippingSpecPowerType} />
        <input type="hidden" name="dimensions" value={itemDimensionsValue} />
        <input type="hidden" name="warranty_type" value="No warranty" />
        <input type="hidden" name="tested_status" value="Untested" />
        <input type="hidden" name="delivery_option" value={reviewDeliveryOption} />
        <input type="hidden" name="delivery_provider" value={palletEnabled ? "Interparcel" : ""} />
        <input type="hidden" name="manuals_available" value={manualSourceHasVerifiedUrl ? "on" : ""} />
        <input type="hidden" name="delivery_available" value={palletEnabled ? "on" : ""} />
        <input type="hidden" name="collection_city" value={collectionCity || city || location} />
        <input type="hidden" name="delivery_size_unknown" value="" />
        <input type="hidden" name="pallet_count" value={palletCount || "1"} />
        <input type="hidden" name="insurance_value" value={price.replace(/[^0-9.]/g, "") || "500"} />
        <input type="hidden" name="access_restrictions" value={accessRestrictions} />
        <input type="hidden" name="estimated_weight" value={weightKg ? `${weightKg} kg` : ""} />
        <input type="hidden" name="delivery_type" value={deliveryRecommendation.recommendation} />
        <input
          type="hidden"
          name="shipping_class"
          value={
            deliveryRecommendation.palletRecommended
              ? "Pallet delivery"
              : weightKg
                ? "Collection only"
                : ""
          }
        />
        <input
          type="hidden"
          name="shipping_confidence"
          value={deliveryRecommendation.label === "CaterBot estimate" ? "High" : weightKg || (lengthCm && widthCm && heightCm) ? "Medium" : "Low"}
        />
        <input type="hidden" name="shipping_details_confirmed_by_seller" value={deliveryDetailsConfirmed ? "true" : "false"} />
        <input type="hidden" name="pallet_delivery_recommended" value={deliveryRecommendation.palletRecommended ? "true" : "false"} />
        <input type="hidden" name="specialist_delivery_recommended" value="false" />
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
        <input type="hidden" name="spec_height_cm" value={shippingSpecHeight} />
        <input type="hidden" name="spec_width_cm" value={shippingSpecWidth} />
        <input type="hidden" name="spec_depth_cm" value={shippingSpecDepth} />
        <input type="hidden" name="spec_weight_kg" value={shippingSpecWeight} />
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
      <p className="mt-4 pb-4 text-center text-sm font-semibold text-white/58">
        We protect your data and link to our privacy policy before sharing any personal details publicly.
      </p>
      </div>
      )}
    </main>
  )
}

export default PostListingPage
