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
}

type DeliveryPreviewQuote = CaterBidsDeliveryOption

const LISTING_IMAGES_BUCKET = "listing-images"
const LOCAL_LISTINGS_KEY = "caterbids_listings"
const LOCAL_CURRENT_LISTING_KEY = "caterbids_current_listing"
const LOCAL_PUBLIC_LISTINGS_KEY = "caterbids_public_listings"
const QUICKLIST_AI_WARNING =
  "CaterBot helps find product information from photos, plates and manuals. Sellers must check all details before publishing. This does not certify safety, condition, installation suitability or legal compliance."

function formatPrice(price: string) {
  const value = price.trim()
  if (!value) return ""
  return value.startsWith("£") ? value : `£${value}`
}

function readLocalListings() {
  if (typeof window === "undefined") return []

  try {
    const savedListings = localStorage.getItem(LOCAL_LISTINGS_KEY)
    if (!savedListings) return []
    const listings = JSON.parse(savedListings)
    return Array.isArray(listings) ? listings : []
  } catch (error) {
    console.warn(`Could not read ${LOCAL_LISTINGS_KEY}:`, error)
    localStorage.removeItem(LOCAL_LISTINGS_KEY)
    return []
  }
}

function writeLocalListing(listing: Record<string, unknown>, existingListings: Record<string, unknown>[]) {
  const nextListings = [listing, ...existingListings.filter((item) => String(item?.id ?? "") !== String(listing.id))]

  localStorage.setItem(LOCAL_LISTINGS_KEY, JSON.stringify(nextListings))
  localStorage.setItem(LOCAL_PUBLIC_LISTINGS_KEY, JSON.stringify(nextListings))
  localStorage.setItem(LOCAL_CURRENT_LISTING_KEY, JSON.stringify(listing))
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
  const [deliveryAvailable, setDeliveryAvailable] = useState(true)
  const [deliveryMethod, setDeliveryMethod] = useState("caterbids_delivery")
  const [deliveryOption, setDeliveryOption] = useState("Delivery available through CaterBids")
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
  const [quickListResult, setQuickListResult] = useState<QuickListAiResponse | null>(null)
  const [quickListApplied, setQuickListApplied] = useState(false)
  const [publishError, setPublishError] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isPublishing, startPublishing] = useTransition()
  const imagePreview = imagePreviews[0] || ""

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const user = await getCurrentUser(supabase)
      const realUser = user?.id === "local-beta" ? null : user

      setUserId(realUser?.id || null)
      setAuthChecked(true)
      if (!realUser) {
        router.replace(`/login?next=${encodeURIComponent("/post-listing")}`)
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

  useEffect(() => {
    const isCaterBidsDelivery = deliveryMethod === "caterbids_delivery"
    setDeliveryAvailable(isCaterBidsDelivery)

    if (deliveryMethod === "collection_only") {
      setDeliveryOption("Collection only")
    } else if (deliveryMethod === "buyer_courier") {
      setDeliveryOption("Buyer arranges transport")
    } else {
      setDeliveryOption("Delivery available through CaterBids")
    }
  }, [deliveryMethod])

  function requireLogin() {
    router.push(`/login?next=${encodeURIComponent("/post-listing")}`)
  }

  function resizeListingImage(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => {
        const image = new Image()
        image.onerror = () => reject(new Error("Could not load image"))
        image.onload = () => {
          const maxSize = 900
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
          resolve(canvas.toDataURL("image/jpeg", 0.82))
        }
        image.src = reader.result as string
      }
      reader.readAsDataURL(file)
    })
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

  async function handleSpecPlateSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = Array.from(e.target.files || []).find((selectedFile) =>
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(selectedFile.type)
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

    e.target.value = ""
  }

  function removeSpecPlate() {
    setSpecPlateFile(null)
    setSpecPlatePreview("")
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
            fileType: file.type || "image/jpeg",
            fileName: file.name,
          }
        })
      )
      const specPlate = specPlateFile
        ? {
            imageBase64: getBase64Payload(specPlatePreview || (await fileToDataUrl(specPlateFile))),
            fileType: specPlateFile.type || "image/jpeg",
            fileName: specPlateFile.name,
          }
        : null
      const res = await fetch("/api/ai-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemImages,
          specPlate,
        }),
      })
      const suggestion = (await res.json()) as QuickListAiResponse

      if (!res.ok) {
        throw new Error(suggestion.error || "CaterBot could not analyse these images.")
      }

      setQuickListResult(suggestion)

      if (suggestion.description?.includes("CaterBot vision is not configured")) {
        setAiError("CaterBot used file names only. Add AI_VISION_API_KEY or OPENAI_API_KEY in .env.local for real photo and spec-plate analysis.")
      } else {
        setAiNotice("CaterBot scan completed. Please confirm all delivery details before publishing.")
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "CaterBot could not analyse these images.")
    } finally {
      setAiLoading(false)
    }
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

    const nextCategory = quickListResult.category || "Catering Equipment"
    const subcategories = subcategoriesForCategory(nextCategory)
    const nextSubcategory =
      quickListResult.subcategory && subcategories.includes(quickListResult.subcategory)
        ? quickListResult.subcategory
        : subcategories[0] || ""
    const nextDeliveryOption = deliveryOptionFromShippingClass(quickListResult.shipping_class)
    const parsedDimensions = parseDimensionsToCm(quickListResult.dimensions)
    const aiWeight = extractConfirmedNumber(quickListResult.estimated_weight_kg ?? quickListResult.weight)
    const aiPalletLength = extractConfirmedNumber(quickListResult.pallet_length_cm)
    const aiPalletWidth = extractConfirmedNumber(quickListResult.pallet_width_cm)
    const aiPalletHeight = extractConfirmedNumber(quickListResult.pallet_height_cm)
    const aiPalletCount = extractConfirmedNumber(quickListResult.pallet_count)

    setTitle(quickListResult.suggested_title || quickListResult.title || title)
    setCategory(nextCategory)
    setSubcategory(nextSubcategory)
    setCondition(normaliseCondition(quickListResult.condition))
    setDescription(buildDescriptionFromSuggestion(quickListResult))
    setPowerType(normalisePowerType(quickListResult.power_type || quickListResult.gas_or_electric || ""))
    setDimensions(quickListResult.dimensions)
    setDeliveryOption(nextDeliveryOption)
    setDeliveryMethod(/courier|pallet|delivery/i.test(nextDeliveryOption) ? "caterbids_delivery" : "buyer_courier")
    setDeliveryAvailable(/courier|pallet|delivery/i.test(nextDeliveryOption))
    const validatedSource = Boolean(quickListResult.manual_source_validated)
    setManualsAvailable(validatedSource)
    setManualSourceUrl(validatedSource ? quickListResult.manual_source_url || "" : "")
    setSpecSourceUrl(validatedSource ? quickListResult.spec_source_url || "" : "")
    setManualSourceName(quickListResult.manual_source_name || "Manual / spec source")
    setManualSourceType(quickListResult.manual_source_type || "")
    setManualSourceValidated(validatedSource)
    setManualSourceLastCheckedAt(quickListResult.manual_source_last_checked_at || "")
    setManualSourceMatchNotes(
      quickListResult.manual_source_match_notes ||
        "CaterBot could not verify a reliable manual/spec source for this item."
    )
    setManualSourceUsefulDetails(
      Array.isArray(quickListResult.manual_source_useful_details)
        ? quickListResult.manual_source_useful_details
        : []
    )
    setSpecConfidence(
      String(quickListResult.ai_spec_confidence || quickListResult.confidence || formatConfidence(quickListResult.confidence_score))
    )
    setSpecsVerifiedBySeller(false)
    setSourceRejectedBySeller(false)
    setPalletCount(aiPalletCount || "1")
    setInsuranceValue(price ? String(Number(price.replace(/[^0-9.]/g, "")) || "") : "")
    if (quickListResult.delivery_notes) {
      setDeliveryNotes(quickListResult.delivery_notes)
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

    if (/pallet/i.test(quickListResult.shipping_class)) {
      setPalletReady(true)
      setTailLiftRequired(true)
    } else if (/specialist|quote/i.test(quickListResult.shipping_class)) {
      setTailLiftRequired(true)
    }
    setTailLiftRequired(aiBoolean(quickListResult.tail_lift_required, /pallet|specialist|quote/i.test(quickListResult.shipping_class)))
    setForkliftAvailable(aiBoolean(quickListResult.forklift_available, forkliftAvailable))
    setCommercialPremises(aiBoolean(quickListResult.commercial_premises, commercialPremises))

    setQuickListApplied(true)
    setAiNotice(
      validatedSource
        ? "CaterBot suggestions applied. Open and confirm the product source before publishing."
        : "CaterBot suggestions applied. CaterBot could not verify a reliable manual/spec source, so please check the plate details manually."
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

  function saveLocalListing(formData: FormData) {
    const id = `local-${Date.now()}`
    let images: string[] = []

    try {
      const parsedImages = JSON.parse((formData.get("images") as string) || "[]")
      images = Array.isArray(parsedImages)
        ? parsedImages.filter((url): url is string => typeof url === "string" && Boolean(url))
        : []
    } catch {
      images = []
    }

    const mainImageUrl = images[0] || (formData.get("image") as string) || ""
    const listing = {
      id,
      title: ((formData.get("title") as string) || "").trim(),
      price: formatPrice((formData.get("price") as string) || ""),
      location: ((formData.get("location") as string) || "").trim(),
      city: ((formData.get("city") as string) || "").trim() || null,
      category: (formData.get("category") as string) || "Catering Equipment",
      subcategory: (formData.get("subcategory") as string) || null,
      condition: (formData.get("condition") as string) || "Used",
      power_type: powerType,
      dimensions: ((formData.get("dimensions") as string) || "").trim() || null,
      service_history: ((formData.get("service_history") as string) || "").trim() || null,
      warranty_type: (formData.get("warranty_type") as string) || "No warranty",
      manuals_available: formData.get("manuals_available") === "on",
      tested_status: (formData.get("tested_status") as string) || "Untested",
      delivery_option: (formData.get("delivery_option") as string) || "Collection only",
      collection_postcode: ((formData.get("collection_postcode") as string) || "").trim() || null,
      vat_included: formData.get("vat_included") === "on",
      weight_kg: formData.get("weight_kg") ? Number(formData.get("weight_kg")) : null,
      length_cm: formData.get("length_cm") ? Number(formData.get("length_cm")) : null,
      width_cm: formData.get("width_cm") ? Number(formData.get("width_cm")) : null,
      height_cm: formData.get("height_cm") ? Number(formData.get("height_cm")) : null,
      pallet_ready: formData.get("pallet_ready") === "on",
      tail_lift_required: formData.get("tail_lift_required") === "on",
      forklift_available: formData.get("forklift_available") === "on",
      ground_floor_collection: formData.get("ground_floor_collection") === "on",
      commercial_premises: formData.get("commercial_premises") === "on",
      delivery_available: formData.get("delivery_available") === "on",
      description: ((formData.get("description") as string) || "").trim(),
      image_url: mainImageUrl,
      images,
      user_id: userId || "local-beta",
      status: "live",
      created_at: new Date().toISOString(),
    }

    const existing = readLocalListings()
    writeLocalListing(listing, existing)
    return id
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
    const hasRequiredDeliverySize =
      hasPositiveNumber(formData.get("weight_kg")) &&
      hasPositiveNumber(formData.get("length_cm")) &&
      hasPositiveNumber(formData.get("width_cm")) &&
      hasPositiveNumber(formData.get("height_cm"))

    if (!requiredTitle || !requiredPrice || (!requiredLocation && !requiredCity)) {
      setPublishError("Please add title, price and location before publishing.")
      return
    }

    if (usesCaterBidsDelivery && !hasRequiredDeliverySize) {
      setPublishError("Please add confirmed pallet weight plus length, width and height before publishing with CaterBids delivery.")
      return
    }

    if (usesCaterBidsDelivery && !((formData.get("collection_postcode") as string) || "").trim()) {
      setPublishError("Please add the collection postcode before publishing with CaterBids delivery.")
      return
    }

    if (usesCaterBidsDelivery && !((formData.get("seller_phone") as string) || "").trim()) {
      setPublishError("Please add the seller phone number before publishing with CaterBids delivery.")
      return
    }

    if (usesCaterBidsDelivery && !hasPositiveNumber(formData.get("pallet_count"))) {
      setPublishError("Please add the number of pallets before publishing with CaterBids delivery.")
      return
    }

    if (usesCaterBidsDelivery && formData.get("delivery_details_confirmed") !== "on") {
      setPublishError("Please confirm the delivery details are accurate before publishing with CaterBids delivery.")
      return
    }

    if (!usesCaterBidsDelivery && !sizeUnknown && !hasRequiredDeliverySize) {
      setPublishError("Please add the checked weight and size, or tick weight and size unknown.")
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
      } catch (error) {
        if (isMissingStorageBucketError(error) && imagePreviews.length > 0) {
          console.warn(
            `${LISTING_IMAGES_BUCKET} bucket is missing. Publishing the Supabase listing with temporary image previews.`
          )
          setUploadedImageUrls(imagePreviews)
          formData.set("image", imagePreviews[0] || "")
          formData.set("images", JSON.stringify(imagePreviews))
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

      {/* HEADER BOX */}
      <div className="premium-card mb-4 rounded-3xl p-4">
        <h2 className="font-bold text-lg">Sell your item</h2>
        <p className="text-sm text-white/60">
          Add commercial catering equipment for UK buyers
        </p>
      </div>

      {/* CaterBot */}
      <div className="premium-card mb-4 rounded-3xl border-[#FF6B00]/35 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B00]/18 text-[#FF6B00]">
            <ScanSearch size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">
              List faster with CaterBot
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              Upload equipment photos and a spec plate photo. CaterBot, your smart CaterBids listing assistant, helps create your listing and find key specs for delivery.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/55">
              For gas and electric equipment, CaterBot uses the brand, model or GC number to open the manual/spec lookup for exact weight, dimensions and power details.
            </p>
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
            className="premium-button flex items-center justify-center gap-2 rounded-2xl py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ScanSearch size={18} aria-hidden="true" />
            {aiLoading ? "CaterBot checking..." : "CaterBot check & auto-fill"}
          </button>

          <button
            type="button"
            onClick={applyQuickListToListing}
            disabled={!quickListResult}
            className="soft-button flex items-center justify-center gap-2 rounded-2xl py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ClipboardCheck size={18} aria-hidden="true" />
            {quickListApplied ? "Applied to listing" : "Apply to listing"}
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

        {quickListResult && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/18 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-[#FF6B00]">
                  Review CaterBot Suggestions
                </p>
                <p className="mt-1 text-xs font-semibold text-white/55">
                  CaterBot has helped fill your listing using your photos, data plate, and trusted product sources. Please check everything before publishing.
                </p>
                <h3 className="mt-1 text-lg font-black text-white">
                  {quickListResult.suggested_title}
                </h3>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-bold text-white/75">
                CaterBot confidence: {formatConfidence(quickListResult.confidence_score)}
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              {[
                ["category", quickListResult.subcategory || quickListResult.category],
                ["brand", quickListResult.brand],
                ["model", quickListResult.model],
                ["serial_number", quickListResult.serial_number],
                ["gc_number", quickListResult.gc_number],
                ["dimensions", quickListResult.dimensions],
                ["weight", quickListResult.weight],
                ["estimated_weight_kg", quickListResult.estimated_weight_kg],
                ["pallet_length_cm", quickListResult.pallet_length_cm],
                ["pallet_width_cm", quickListResult.pallet_width_cm],
                ["pallet_height_cm", quickListResult.pallet_height_cm],
                ["pallet_count", quickListResult.pallet_count],
                ["power_type", quickListResult.power_type],
                ["gas_or_electric", quickListResult.gas_or_electric],
                ["gas_type", quickListResult.gas_type],
                ["voltage", quickListResult.voltage],
                ["amps", quickListResult.amps],
                ["kw_rating", quickListResult.kw_rating],
                ["electrical_phase", quickListResult.electrical_phase],
                ["shipping_class", quickListResult.shipping_class],
                ["delivery_notes", quickListResult.delivery_notes],
                ["manual/spec source", quickListResult.manual_url ? "CaterBot found a possible product match" : ""],
              ]
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/8 bg-white/5 px-3 py-2">
                    <p className="font-black uppercase tracking-wide text-white/45">
                      {label}
                    </p>
                    <p className="mt-1 font-bold text-white">
                      {value}
                    </p>
                  </div>
                ))}
            </div>

            <p className="mt-3 text-sm leading-relaxed text-white/70">
              {quickListResult.description}
            </p>

            {quickListResult.manual_url && (
              <div className="mt-3 rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-3">
                <p className="text-sm font-bold text-orange-100">
                  CaterBot found a possible product match. Please review the specs before publishing.
                </p>
                <a
                  href={quickListResult.manual_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-sm font-bold text-[#FF9A4A] underline-offset-4 hover:underline"
                >
                  Open manual/spec source
                </a>
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-xs leading-relaxed text-white/55">
          CaterBot helps find product information from photos, plates and manuals. Sellers must check all details before publishing. This does not certify safety, condition, installation suitability or legal compliance.
        </p>
      </div>

      {/* FORM */}
      <form onSubmit={handlePublish} className="premium-card rounded-3xl p-4">
        <input
          name="title"
          placeholder="Title"
          className="premium-input mb-3 w-full rounded-2xl p-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          name="price"
          placeholder="Price"
          className="premium-input mb-3 w-full rounded-2xl p-3"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <input
          name="location"
          placeholder="Location"
          className="premium-input mb-3 w-full rounded-2xl p-3"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <label className="mb-2 block text-sm font-semibold text-white/80">
          City / Location
        </label>
        <input
          name="city"
          placeholder="e.g. Birmingham"
          className="premium-input mb-3 w-full rounded-2xl p-3"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <select
          name="category"
          className="premium-input mb-3 w-full rounded-2xl p-3"
          value={category}
          onChange={(e) => {
            const nextCategory = e.target.value
            setCategory(nextCategory)
            setSubcategory(subcategoriesForCategory(nextCategory)[0] || "")
          }}
        >
          {CATEGORY_OPTIONS.filter((item) => item !== "All Categories").map((item) => (
            <option key={item} className="text-black">
              {item}
            </option>
          ))}
        </select>

        {subcategoriesForCategory(category).length > 0 && (
          <select
            name="subcategory"
            className="premium-input mb-3 w-full rounded-2xl p-3"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
          >
            {subcategoriesForCategory(category).map((item) => (
              <option key={item} className="text-black">
                {item}
              </option>
            ))}
          </select>
        )}

        <select
          name="condition"
          className="premium-input mb-3 w-full rounded-2xl p-3"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          {CONDITION_OPTIONS.map((option) => (
            <option key={option} className="text-black">
              {option}
            </option>
          ))}
        </select>

        <div className="mb-4 rounded-3xl border border-[#FF6B00]/20 bg-[#002E5D]/35 p-4">
          <p className="mb-1 text-sm font-black text-[#FF6B00]">Trade trust details</p>
          <p className="mb-4 text-xs leading-relaxed text-white/60">
            These details help catering buyers check installation, safety and delivery before they travel.
          </p>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-bold text-[#002E5D]">
              Power / Fuel Type
            </label>

            <select
              name="power_type"
              value={powerType}
              onChange={(event) => setPowerType(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-[#243B63] px-4 py-3 text-sm font-semibold text-white focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
            >
              {POWER_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <input
            name="dimensions"
            placeholder="Dimensions e.g. 900w x 700d x 900h mm"
            className="premium-input my-3 w-full rounded-2xl p-3"
            value={dimensions}
            onChange={(event) => setDimensions(event.target.value)}
          />

          <textarea
            name="service_history"
            placeholder="Service history, engineer checks, PAT/gas-safe notes"
            className="premium-input mb-3 min-h-24 w-full rounded-2xl p-3"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select name="warranty_type" defaultValue="No warranty" className="premium-input w-full rounded-2xl p-3">
              {WARRANTY_TYPE_OPTIONS.map((option) => (
                <option key={option} className="text-black">
                  {option}
                </option>
              ))}
            </select>

            <select name="tested_status" defaultValue="Untested" className="premium-input w-full rounded-2xl p-3">
              {TESTED_STATUS_OPTIONS.map((option) => (
                <option key={option} className="text-black">
                  {option}
                </option>
              ))}
            </select>
          </div>

          <select
            name="delivery_option"
            value={deliveryOption}
            onChange={(event) => setDeliveryOption(event.target.value)}
            className="premium-input my-3 w-full rounded-2xl p-3"
          >
            {DELIVERY_OPTION_OPTIONS.map((option) => (
              <option key={option} className="text-black">
                {option}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80">
              <input
                name="manuals_available"
                type="checkbox"
                checked={manualsAvailable}
                onChange={(event) => setManualsAvailable(event.target.checked)}
                className="h-4 w-4 accent-[#FF6B00]"
              />
              Manuals available
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80">
              <input name="vat_included" type="checkbox" className="h-4 w-4 accent-[#FF6B00]" />
              VAT included
            </label>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-white/60">{BUYER_WARNING}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-white/45">{SAFETY_DISCLAIMER}</p>
        </div>

        <div className="mb-4 rounded-3xl border border-[#FF6B00]/20 bg-white p-5 text-[#002E5D] shadow-sm">
          <h3 className="text-xl font-black">
            CaterBids Delivery
          </h3>

          <p className="mt-1 text-sm text-slate-600">
            Choose how buyers can collect or receive this item. CaterBids delivery needs confirmed pallet details before publishing.
          </p>

          <p className="mt-3 rounded-2xl bg-[#FF6B00]/10 px-4 py-3 text-sm font-bold leading-relaxed text-[#8A3A00]">
            Weight and size are required. Use the manufacturer manual/spec sheet, scales and a tape measure where possible; CaterBot suggestions must be checked before publishing.
          </p>

          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-[#002E5D]/70">
            Delivery option
          </label>
          <select
            name="delivery_method"
            value={deliveryMethod}
            onChange={(event) => setDeliveryMethod(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-[#002E5D] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
          >
            <option value="collection_only">Collection only</option>
            <option value="caterbids_delivery">Delivery available through CaterBids</option>
            <option value="buyer_courier">Buyer can arrange courier</option>
          </select>

          {deliveryMethod === "caterbids_delivery" && (
            <p className="mt-3 rounded-2xl border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-4 py-3 text-xs font-bold leading-relaxed text-[#8A3A00]">
              CaterBot has estimated these delivery details where possible. Please check and confirm before publishing.
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-2xl bg-[#002E5D]/5 px-3 py-2 text-sm font-bold">
              <input
                name="delivery_available"
                type="checkbox"
                checked={deliveryAvailable}
                onChange={(event) => {
                  const checked = event.target.checked
                  setDeliveryAvailable(checked)
                  setDeliveryMethod(checked ? "caterbids_delivery" : "collection_only")
                }}
                className="h-4 w-4 accent-[#FF6B00]"
              />
              Delivery available
            </label>

            <label className="flex items-center gap-2 rounded-2xl bg-[#002E5D]/5 px-3 py-2 text-sm font-bold">
              <input
                name="pallet_ready"
                type="checkbox"
                checked={palletReady}
                onChange={(event) => setPalletReady(event.target.checked)}
                className="h-4 w-4 accent-[#FF6B00]"
              />
              Pallet ready
            </label>

            <label className="flex items-center gap-2 rounded-2xl bg-[#002E5D]/5 px-3 py-2 text-sm font-bold">
              <input
                name="tail_lift_required"
                type="checkbox"
                checked={tailLiftRequired}
                onChange={(event) => setTailLiftRequired(event.target.checked)}
                className="h-4 w-4 accent-[#FF6B00]"
              />
              Tail-lift required
            </label>

            <label className="flex items-center gap-2 rounded-2xl bg-[#002E5D]/5 px-3 py-2 text-sm font-bold">
              <input
                name="forklift_available"
                type="checkbox"
                checked={forkliftAvailable}
                onChange={(event) => setForkliftAvailable(event.target.checked)}
                className="h-4 w-4 accent-[#FF6B00]"
              />
              Forklift available
            </label>

            <label className="flex items-center gap-2 rounded-2xl bg-[#002E5D]/5 px-3 py-2 text-sm font-bold">
              <input
                name="ground_floor_collection"
                type="checkbox"
                checked={groundFloorCollection}
                onChange={(event) => setGroundFloorCollection(event.target.checked)}
                className="h-4 w-4 accent-[#FF6B00]"
              />
              Ground-floor collection
            </label>

            <label className="flex items-center gap-2 rounded-2xl bg-[#002E5D]/5 px-3 py-2 text-sm font-bold">
              <input
                name="commercial_premises"
                type="checkbox"
                checked={commercialPremises}
                onChange={(event) => setCommercialPremises(event.target.checked)}
                className="h-4 w-4 accent-[#FF6B00]"
              />
              Commercial premises
            </label>
          </div>

          <div className="mt-4">
            <p className="mb-3 text-xs font-semibold text-slate-500">
              Enter seller-checked delivery measurements in cm and kg when known. Do not rely on CaterBot estimates if unsure.
            </p>

            <label className="mb-4 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-[#8A3A00]">
              <input
                name="delivery_size_unknown"
                type="checkbox"
                checked={deliverySizeUnknown}
                onChange={(event) => {
                  const checked = event.target.checked
                  setDeliverySizeUnknown(checked)
                  if (checked) {
                    setWeightKg("")
                    setLengthCm("")
                    setWidthCm("")
                    setHeightCm("")
                  }
                }}
                className="mt-0.5 h-4 w-4 accent-[#FF6B00]"
              />
              <span>
                Weight and size unknown
                <span className="mt-1 block text-xs font-semibold text-[#8A3A00]/75">
                  Buyers can still message or buy, but instant delivery quotes need confirmed kg and cm.
                </span>
              </span>
            </label>

            {deliveryMethod === "caterbids_delivery" && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <textarea
                  name="collection_full_address"
                  value={collectionFullAddress}
                  onChange={(event) => setCollectionFullAddress(event.target.value)}
                  placeholder="Collection full address"
                  className="min-h-24 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 sm:col-span-2"
                />
                <input
                  name="collection_city"
                  value={collectionCity}
                  onChange={(event) => setCollectionCity(event.target.value)}
                  placeholder="Collection city"
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
                <input
                  name="seller_contact_name"
                  value={sellerContactName}
                  onChange={(event) => setSellerContactName(event.target.value)}
                  placeholder="Seller contact name"
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
                <input
                  name="seller_phone"
                  value={sellerPhone}
                  onChange={(event) => setSellerPhone(event.target.value)}
                  placeholder="Seller phone number"
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
                <input
                  name="preferred_collection_date"
                  value={preferredCollectionDate}
                  onChange={(event) => setPreferredCollectionDate(event.target.value)}
                  type="date"
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#002E5D]">
                  Collection postcode
                </label>
                <input
                  name="collection_postcode"
                  value={collectionPostcode}
                  onChange={(event) => setCollectionPostcode(event.target.value.toUpperCase())}
                  placeholder="e.g. B12 0AB"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#002E5D]">
                  Weight kg {deliverySizeUnknown ? "unknown" : "required"}
                </label>
                <input
                  name="weight_kg"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  placeholder="e.g. 120"
                  type="number"
                  min="0"
                  required={!deliverySizeUnknown}
                  disabled={deliverySizeUnknown}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#002E5D]">
                  Length cm {deliverySizeUnknown ? "unknown" : "required"}
                </label>
                <input
                  name="length_cm"
                  value={lengthCm}
                  onChange={(event) => setLengthCm(event.target.value)}
                  placeholder="e.g. 120"
                  type="number"
                  min="0"
                  required={!deliverySizeUnknown}
                  disabled={deliverySizeUnknown}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#002E5D]">
                  Width cm {deliverySizeUnknown ? "unknown" : "required"}
                </label>
                <input
                  name="width_cm"
                  value={widthCm}
                  onChange={(event) => setWidthCm(event.target.value)}
                  placeholder="e.g. 100"
                  type="number"
                  min="0"
                  required={!deliverySizeUnknown}
                  disabled={deliverySizeUnknown}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#002E5D]">
                  Height cm {deliverySizeUnknown ? "unknown" : "required"}
                </label>
                <input
                  name="height_cm"
                  value={heightCm}
                  onChange={(event) => setHeightCm(event.target.value)}
                  placeholder="e.g. 160"
                  type="number"
                  min="0"
                  required={!deliverySizeUnknown}
                  disabled={deliverySizeUnknown}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
              </div>

              {deliveryMethod === "caterbids_delivery" && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#002E5D]">
                      Number of pallets
                    </label>
                    <input
                      name="pallet_count"
                      value={palletCount}
                      onChange={(event) => setPalletCount(event.target.value)}
                      placeholder="1"
                      type="number"
                      min="1"
                      required
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#002E5D]">
                      Insurance value
                    </label>
                    <input
                      name="insurance_value"
                      value={insuranceValue}
                      onChange={(event) => setInsuranceValue(event.target.value)}
                      placeholder="e.g. 550"
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                    />
                  </div>
                </>
              )}
            </div>

            {deliveryMethod === "caterbids_delivery" && (
              <div className="mt-4 space-y-3">
                <textarea
                  name="access_restrictions"
                  value={accessRestrictions}
                  onChange={(event) => setAccessRestrictions(event.target.value)}
                  placeholder="Access restrictions, loading bay notes, stairs, opening times"
                  className="min-h-20 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />
                <textarea
                  name="delivery_notes"
                  value={deliveryNotes}
                  onChange={(event) => setDeliveryNotes(event.target.value)}
                  placeholder="Delivery notes for CaterBids or courier"
                  className="min-h-20 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                />

                <div className="rounded-3xl border border-[#FF6B00]/25 bg-[#002E5D]/5 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-[#002E5D]">Interparcel pricing check</h3>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
                        Enter a sample buyer postcode to preview automatic pallet pricing. Buyers still get the final quote at checkout.
                      </p>
                    </div>
                    <span className="rounded-full bg-[#FF6B00]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#FF6B00]">
                      Test ready
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={interparcelPreviewPostcode}
                      onChange={(event) => setInterparcelPreviewPostcode(event.target.value.toUpperCase())}
                      placeholder="Sample buyer postcode"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#002E5D] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                    />
                    <button
                      type="button"
                      onClick={checkInterparcelPreview}
                      disabled={interparcelPreviewLoading}
                      className="rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
                    >
                      {interparcelPreviewLoading ? "Checking..." : "Check price"}
                    </button>
                  </div>

                  {interparcelPreviewError && (
                    <p className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-[#8A3A00]">
                      {interparcelPreviewError}
                    </p>
                  )}

                  {interparcelPreviewQuotes.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#FF6B00]">
                          {interparcelPreviewProvider}
                        </p>
                        <p className="text-xs font-bold text-slate-500">{DELIVERY_PREVIEW_MODE_LABEL}</p>
                      </div>
                      {interparcelPreviewQuotes.map((quote) => {
                        const isSelected = selectedInterparcelPreviewQuote?.id === quote.id

                        return (
                        <button
                          key={quote.id}
                          type="button"
                          onClick={() => setSelectedInterparcelPreviewQuote(quote)}
                          className={`w-full rounded-2xl border p-3 text-left text-sm transition-all ${
                            isSelected
                              ? "border-[#FF6B00] bg-[#002E5D] text-white shadow-lg shadow-[#FF6B00]/15"
                              : "border-slate-200 bg-white text-[#002E5D] hover:border-[#FF6B00]/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={isSelected ? "font-black text-white" : "font-black text-[#002E5D]"}>
                                {quote.name}
                              </p>
                              <p className={`mt-1 text-xs font-semibold ${isSelected ? "text-white/70" : "text-slate-500"}`}>
                                {quote.eta}
                              </p>
                              {quote.description && (
                                <p className={`mt-1 text-xs ${isSelected ? "text-white/65" : "text-slate-500"}`}>
                                  {quote.description}
                                </p>
                              )}
                              {isSelected && (
                                <span className="mt-2 inline-flex rounded-full bg-[#FF6B00] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="shrink-0 text-xl font-black text-[#FF6B00]">£{quote.price}</p>
                          </div>
                        </button>
                      )})}

                      {selectedInterparcelPreviewQuote && (
                        <div className="rounded-2xl border border-[#FF6B00]/30 bg-orange-50 p-3">
                          <p className="text-sm font-black text-[#002E5D]">
                            Selected preview: {selectedInterparcelPreviewQuote.name} - £{selectedInterparcelPreviewQuote.price}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-600">
                            ETA: {selectedInterparcelPreviewQuote.eta}. Preview quote subject to courier confirmation.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Automatic booking uses these seller details plus the buyer delivery address after Stripe payment.
                  </p>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
                  <input
                    name="delivery_details_confirmed"
                    type="checkbox"
                    checked={deliveryDetailsConfirmed}
                    onChange={(event) => setDeliveryDetailsConfirmed(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#FF6B00]"
                  />
                  I confirm these delivery details are accurate.
                </label>
              </div>
            )}
          </div>
        </div>

        {(manualSourceValidated || manualSourceMatchNotes || sourceRejectedBySeller) && (
          <div className="mb-4 rounded-3xl border border-[#FF6B00]/25 bg-[#002E5D]/5 p-4 text-[#002E5D]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FF6B00]">
                  CaterBot product match
                </p>
                <h3 className="mt-1 text-lg font-black">Review CaterBot Suggestions</h3>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  manualSourceValidated
                    ? "bg-green-100 text-green-800"
                    : "bg-orange-100 text-orange-800"
                }`}
              >
                {manualSourceValidated ? "Source checked" : "Needs seller check"}
              </span>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {manualSourceValidated
                ? specConfidence === "high"
                  ? "CaterBot found a strong product match for this item. Please check and confirm before publishing."
                  : "CaterBot found a likely product match. Please check carefully before publishing."
                : "CaterBot could not verify a reliable manual/spec source for this item. Continue using the plate and photo details only."}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Brand found</p>
                <p className="mt-1 font-black">{quickListResult?.brand || "Needs seller check"}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Model found</p>
                <p className="mt-1 font-black">{quickListResult?.model || "Needs seller check"}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Source</p>
                <p className="mt-1 font-black">{manualSourceName || "No verified source"}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Source type</p>
                <p className="mt-1 font-black">{manualSourceType || "Not verified"}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">CaterBot spec confidence</p>
                <p className="mt-1 font-black capitalize">{specConfidence || "Low"}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Last checked</p>
                <p className="mt-1 font-black">
                  {manualSourceLastCheckedAt
                    ? new Date(manualSourceLastCheckedAt).toLocaleString("en-GB")
                    : "Not checked"}
                </p>
              </div>
            </div>

            {manualSourceUsefulDetails.length > 0 && (
              <div className="mt-3 rounded-2xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Useful details found
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {manualSourceUsefulDetails.map((detail) => (
                    <span key={detail} className="rounded-full bg-[#FF6B00]/10 px-3 py-1 text-xs font-black text-[#FF6B00]">
                      {detail}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {manualSourceMatchNotes && (
              <p className="mt-3 rounded-2xl bg-orange-50 p-3 text-sm font-bold text-orange-800">
                {manualSourceMatchNotes}
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {manualSourceValidated && manualSourceUrl && (
                <a
                  href={manualSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white"
                >
                  Open manual/spec source
                </a>
              )}
              {manualSourceValidated && (
                <button
                  type="button"
                  onClick={rejectCaterBotSource}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700"
                >
                  Reject source
                </button>
              )}
            </div>

            <label className={`mt-3 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
              manualSourceValidated
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}>
              <input
                name="specs_verified_by_seller"
                type="checkbox"
                checked={specsVerifiedBySeller}
                disabled={!manualSourceValidated}
                onChange={(event) => setSpecsVerifiedBySeller(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#FF6B00] disabled:opacity-40"
              />
              I confirm the specs and product source match my item.
            </label>

            <input type="hidden" name="manual_source_name" value={manualSourceName} />
            <input type="hidden" name="manual_source_type" value={manualSourceType} />
            <input type="hidden" name="manual_source_url" value={manualSourceUrl} />
            <input type="hidden" name="spec_source_url" value={specSourceUrl} />
            <input type="hidden" name="manual_source_validated" value={manualSourceValidated ? "true" : "false"} />
            <input type="hidden" name="manual_source_last_checked_at" value={manualSourceLastCheckedAt} />
            <input type="hidden" name="manual_source_match_notes" value={manualSourceMatchNotes} />
            <input type="hidden" name="ai_spec_confidence" value={specConfidence} />
            <input type="hidden" name="source_rejected_by_seller" value={sourceRejectedBySeller ? "true" : "false"} />
          </div>
        )}

        <textarea
          name="description"
          placeholder="Description"
          className="premium-input mb-4 min-h-28 w-full rounded-2xl p-3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <input type="hidden" name="image" value={imagePreview} />
        <input type="hidden" name="images" value={JSON.stringify(imagePreviews)} />

        {publishError && (
          <p className="mb-3 rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200">
            {publishError}
          </p>
        )}

        <button
          type="submit"
          disabled={isPublishing}
          className="premium-button w-full rounded-2xl py-3 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPublishing ? "Publishing..." : "Publish Listing"}
        </button>
      </form>
      </div>
      )}
    </main>
  )
}
