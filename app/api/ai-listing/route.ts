import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import {
  CATEGORY_OPTIONS,
  CATEGORY_TITLES,
  subcategoriesForCategory,
} from "@/lib/categories"
import { POWER_TYPE_OPTIONS } from "@/lib/listing-trust"
import { findValidatedCaterBotSource } from "@/lib/caterbot/sourceValidation"
import { isCaterBotWebSearchConfigured } from "@/lib/caterbot/webSearch"
import {
  lookupEquipmentModel,
  writeToEquipmentKnowledgeBase,
  isTrustedSourceType,
  isWithinSixMonths,
  type EquipmentModelRow,
} from "@/lib/caterbot/knowledgeBase"

// Re-enable once dimension extraction is verified accurate.
const KB_WRITES_ENABLED = false

const CONDITIONS = ["New", "Used", "Refurbished", "Spares or Repair"] as const
const QUICKLIST_AI_WARNING =
  "CaterBot helps find product information from photos, plates and manuals. Sellers must check all details before publishing. This does not certify safety, condition, installation suitability or legal compliance."

type QuickListImageInput = {
  imageBase64?: string
  fileType?: string
  fileName?: string
}

type QuickListAiSuggestion = {
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
  ai_spec_confidence?: string
  source_rejected_by_seller?: boolean
  shipping_class: string
  delivery_warning: string
  confidence_score: number
  confidence?: string | number
  condition?: (typeof CONDITIONS)[number]
  _diag?: {
    ai_dimensions: string
    source_valid: boolean
    source_url: string
    source_found_dimensions: string
    source_gemini_dimensions: string
    final_dimensions: string
  }
}

type LegacyAiListingSuggestion = {
  title?: string
  price?: string
  location?: string
  category?: string
  subcategory?: string
  condition?: (typeof CONDITIONS)[number]
  description?: string
  confidence?: string
  keywords?: string[]
}

const fallbackSuggestion: QuickListAiSuggestion = {
  suggested_title: "Commercial catering item",
  description:
    "Commercial catering item. Please add clear photos, check the data plate and confirm the exact model, condition and collection details before publishing.",
  category: "Catering Equipment",
  subcategory: "Cooking Equipment",
  brand: "",
  model: "",
  serial_number: "",
  gc_number: "",
  dimensions: "",
  weight: "",
  power_type: "Unknown",
  gas_type: "",
  voltage: "",
  amps: "",
  kw_rating: "",
  electrical_phase: "",
  manual_url: "",
  shipping_class: "Delivery quote required",
  delivery_warning: QUICKLIST_AI_WARNING,
  confidence_score: 0.18,
  condition: "Used",
}

function safeText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return typeof value === "string" ? value.trim() : ""
}

// Treats "Needs seller check" as absent — prevents it from masking a valid AI image
// estimate already stored in suggestion.dimensions / suggestion.weight.
function specVal(s: string | undefined): string {
  return s && !/^needs seller/i.test(s) ? s : ""
}

// Sanity-check a dim string returned by Gemini: three values, each 5–350 cm, aspect ratio ≤ 6.
function isGeminiDimsSane(dims: string): boolean {
  const m = dims.match(/(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*(?:cm|mm)?/i)
  if (!m) return false
  const unit = dims.toLowerCase().includes("mm") ? "mm" : "cm"
  const factor = unit === "mm" ? 0.1 : 1
  const vals = [Number(m[1]), Number(m[2]), Number(m[3])].map((v) => v * factor)
  if (vals.some((v) => !Number.isFinite(v) || v < 5 || v > 350)) return false
  return Math.max(...vals) / Math.min(...vals) <= 6
}

// Calls Gemini (text-only) to extract dims/weight from a validated source document when
// regex extraction came up empty. The body text is already a relevant 10 000-char snippet
// (selected by extractRelevantSourceSnippet in sourceValidation.ts).
async function geminiExtractFromSourceText(
  bodyText: string,
  brand: string,
  model: string
): Promise<{ dimensions: string; weight: string; grossWeight: string }> {
  const empty = { dimensions: "", weight: "", grossWeight: "" }
  const apiKey = process.env.AI_VISION_API_KEY
  if (!apiKey?.startsWith("AIza")) return empty

  const prompt = `Extract the external dimensions and net weight for "${brand} ${model}" from this text.
Return ONLY valid JSON with these fields:
- "dimensions": external WxDxH in cm, like "42.2 x 46.2 x 22.7 cm". Convert fractional inches (e.g. 16 5/8" = 42.2 cm, multiply by 2.54) or mm ÷ 10 to get cm. null if not found or ambiguous.
- "weight_net_kg": net/empty weight as a number in kg. Convert lbs × 0.4536. For ${model} specifically; if not listed separately use the closest listed variant. null if not found.
- "weight_gross_kg": shipping/packed/gross weight as a number in kg. Convert lbs if needed. null if not found.

${bodyText}`

  const fallbackModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
  for (const geminiModel of fallbackModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json", temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(12000),
        }
      )
      if (!response.ok) continue
      const data = await response.json()
      const content = safeText(data?.candidates?.[0]?.content?.parts?.[0]?.text)
      if (!content) continue

      const parsed = JSON.parse(content)
      const dims = typeof parsed.dimensions === "string" ? parsed.dimensions.trim() : ""
      const netKg = typeof parsed.weight_net_kg === "number" ? parsed.weight_net_kg : null
      const grossKg = typeof parsed.weight_gross_kg === "number" ? parsed.weight_gross_kg : null

      return {
        dimensions: dims && isGeminiDimsSane(dims) ? dims : "",
        weight: netKg != null && netKg >= 0.5 && netKg <= 3000 ? `${formatMeasurementNumber(netKg)} kg` : "",
        grossWeight: grossKg != null && grossKg >= 0.5 && grossKg <= 3000 ? `${formatMeasurementNumber(grossKg)} kg` : "",
      }
    } catch {
      continue
    }
  }
  return empty
}

function normaliseImageMimeType(value: string | undefined) {
  const mimeType = safeText(value).toLowerCase()
  if (mimeType === "image/jpg") return "image/jpeg"
  if (["image/jpeg", "image/png", "image/webp"].includes(mimeType)) return mimeType
  return "image/jpeg"
}

function isManualsLibSearchUrl(url: string) {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^www\./, "")
    const path = parsed.pathname.toLowerCase()
    return hostname.endsWith("manualslib.com") && (path.includes("/search") || parsed.searchParams.get("action") === "search")
  } catch {
    return false
  }
}

function isDirectSourceUrl(url: string) {
  const lower = url.toLowerCase()
  return (
    /^https?:\/\//i.test(url) &&
    !isManualsLibSearchUrl(url) &&
    !lower.includes("google.com/search") &&
    !lower.includes("bing.com/search") &&
    !lower.includes("duckduckgo.com")
  )
}

function clampConfidence(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numberValue)) return 0.2
  if (numberValue > 1) return Math.max(0, Math.min(1, numberValue / 100))
  return Math.max(0, Math.min(1, numberValue))
}

function normaliseWeightText(weight: unknown, estimatedWeight: unknown) {
  const explicitWeight = safeText(weight)
  if (explicitWeight) return explicitWeight

  const estimatedWeightText = safeText(estimatedWeight)
  if (!estimatedWeightText) return ""
  if (/^\d+(?:\.\d+)?$/.test(estimatedWeightText)) return `${estimatedWeightText}kg`
  if (/^\d+(?:\.\d+)?\s*kg$/i.test(estimatedWeightText)) return estimatedWeightText

  return ""
}

function formatMeasurementNumber(value: number) {
  return String(Math.ceil(value))
}

function normaliseCmField(value: unknown, options: { allowBareNumber?: boolean } = {}) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    // < 10 → almost certainly metres (no catering equipment is <10 cm); > 300 → mm
    return formatMeasurementNumber(value < 10 ? value * 100 : value > 300 ? value / 10 : value)
  }

  const text = safeText(value)
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

function extractWeightKg(value: unknown, options: { allowBareNumber?: boolean } = {}) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return options.allowBareNumber ? formatMeasurementNumber(value) : ""
  }

  const text = safeText(value)
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

function parseDeliveryDimensionsToCm(value: unknown) {
  const text = safeText(value)
  if (!text || /needs seller (?:check|confirmation)|not confirmed|unknown/i.test(text)) return null

  const normalised = text.replace(/[×✕]/g, " x ").replace(/\bby\b/gi, " x ")
  const labelledValues: Partial<Record<"length" | "width" | "depth" | "height", string>> = {}

  for (const match of normalised.matchAll(/\b(length|len|l|width|w|depth|d|height|h)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metres?|meters?)?\b/gi)) {
    const label = match[1].toLowerCase()
    const unit = match[3] || (/\bmm\b/i.test(normalised) ? "mm" : /\bcm\b/i.test(normalised) ? "cm" : "")
    const cmValue = normaliseCmField(`${match[2]}${unit ? ` ${unit}` : ""}`, { allowBareNumber: true })
    if (!cmValue) continue
    if (label === "length" || label === "len" || label === "l") labelledValues.length = cmValue
    if (label === "width" || label === "w") labelledValues.width = cmValue
    if (label === "depth" || label === "d") labelledValues.depth = cmValue
    if (label === "height" || label === "h") labelledValues.height = cmValue
  }

  for (const match of normalised.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metres?|meters?)?\s*(?:\(\s*)?(length|len|l|width|w|depth|d|height|h)\b(?:\s*\))?/gi)) {
    const unit = match[2] || (/\bmm\b/i.test(normalised) ? "mm" : /\bcm\b/i.test(normalised) ? "cm" : "")
    const label = match[3].toLowerCase()
    const cmValue = normaliseCmField(`${match[1]}${unit ? ` ${unit}` : ""}`, { allowBareNumber: true })
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
    normaliseCmField(`${match[1]} ${match[2] || inheritedUnit || (shouldTreatAsMm ? "mm" : "cm")}`),
    normaliseCmField(`${match[3]} ${match[4] || inheritedUnit || (shouldTreatAsMm ? "mm" : "cm")}`),
    normaliseCmField(`${match[5]} ${match[6] || inheritedUnit || (shouldTreatAsMm ? "mm" : "cm")}`),
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

function confidenceLabel(score: number) {
  if (score >= 0.72) return "high"
  if (score >= 0.42) return "medium"
  return "low"
}

function extractPlateValue(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return match[1].replace(/[_]+/g, " ").replace(/\s+/g, " ").trim()
    }
  }

  return ""
}

function inferEquipment(text: string) {
  if (/(kebab|doner|donner|gyro|shawarma)/i.test(text)) {
    return {
      title: "Commercial Doner Kebab Machine",
      subcategory: "Cooking Equipment",
      description:
        "Commercial doner kebab machine suitable for takeaways, restaurants and catering businesses. Please confirm exact model, fuel type, accessories and condition.",
      keywords: ["kebab", "doner", "gyro"],
    }
  }

  if (/fryer/i.test(text)) {
    return {
      title: "Commercial Catering Fryer",
      subcategory: "Cooking Equipment",
      description:
        "Commercial fryer suitable for takeaways, cafes, restaurants and catering businesses. Please confirm basket count, fuel type, dimensions, service history and condition.",
      keywords: ["fryer"],
    }
  }

  if (/(pizza|oven|combi|rational)/i.test(text)) {
    return {
      title: /pizza/i.test(text) ? "Commercial Pizza Oven" : "Commercial Catering Oven",
      subcategory: "Cooking Equipment",
      description:
        "Commercial oven suitable for takeaways, restaurants, cafes and catering businesses. Please confirm exact model, power or fuel type, dimensions and condition.",
      keywords: ["oven"],
    }
  }

  if (/(fridge|freezer|refrigerat|chiller|bottle cooler)/i.test(text)) {
    return {
      title: /freezer/i.test(text) ? "Commercial Catering Freezer" : "Commercial Catering Fridge",
      subcategory: "Refrigeration",
      description:
        "Commercial refrigeration unit suitable for catering businesses. Please confirm exact temperature performance, dimensions, shelves and condition.",
      keywords: ["refrigeration"],
    }
  }

  if (/(sink|basin|dishwasher|glasswasher|warewasher)/i.test(text)) {
    return {
      title: /dishwasher|glasswasher|warewasher/i.test(text)
        ? "Commercial Warewashing Machine"
        : "Commercial Catering Sink",
      subcategory: "Warewashing & Sinks",
      description:
        "Commercial warewashing or sink item suitable for UK catering premises. Please confirm exact dimensions, accessories, plumbing needs and condition.",
      keywords: ["warewashing"],
    }
  }

  if (/(coffee|espresso|grinder)/i.test(text)) {
    return {
      title: "Commercial Coffee Machine",
      subcategory: "Coffee & Bar Equipment",
      description:
        "Commercial coffee equipment suitable for cafes, restaurants and catering businesses. Please confirm exact model, power, accessories, service history and condition.",
      keywords: ["coffee"],
    }
  }

  return {
    title: fallbackSuggestion.suggested_title,
    subcategory: fallbackSuggestion.subcategory,
    description: fallbackSuggestion.description,
    keywords: [],
  }
}

function inferPowerType(text: string) {
  const lower = text.toLowerCase()

  if (/(lpg|propane|bottle gas)/.test(lower)) return "LPG / Propane"
  if (/(natural gas|nat gas|mains gas)/.test(lower)) return "Natural Gas"
  if (/(three phase|3 phase|3-phase|415v|400v)/.test(lower)) return "Three Phase"
  if (/(single phase|1 phase|1-phase|230v|240v|13a|amp|electric|kw)/.test(lower)) return "Electric"
  if (/dual fuel/.test(lower)) return "Dual Fuel"

  return "Unknown"
}

function inferGasType(text: string) {
  const lower = text.toLowerCase()
  if (/(lpg|propane|bottle gas)/.test(lower)) return "LPG / Propane"
  if (/(natural gas|nat gas|mains gas)/.test(lower)) return "Natural Gas"
  return ""
}

function inferShippingClass(text: string, weight: string, dimensions: string) {
  const combined = `${text} ${weight} ${dimensions}`.toLowerCase()
  const weightMatch = combined.match(/(\d+(?:\.\d+)?)\s?kg/)
  const weightKg = weightMatch ? Number(weightMatch[1]) : 0

  if (/(pallet|fridge|freezer|oven|fryer|dishwasher|glasswasher)/.test(combined) || weightKg >= 55) {
    return "CaterBids Pallet Delivery"
  }

  if (/(van|trailer|food truck|cold room)/.test(combined) || weightKg >= 250) {
    return "CaterBids Pallet Delivery"
  }

  return "Collection Only"
}

function normaliseCategory(value: Partial<QuickListAiSuggestion>) {
  const mainCategories = CATEGORY_OPTIONS.filter((item) => item !== "All Categories")
  const proposedCategory = safeText(value.category)
  const proposedSubcategory = safeText(value.subcategory)

  if (mainCategories.includes(proposedCategory)) {
    const subcategories = subcategoriesForCategory(proposedCategory)
    return {
      category: proposedCategory,
      subcategory: subcategories.includes(proposedSubcategory) ? proposedSubcategory : subcategories[0],
    }
  }

  if (CATEGORY_TITLES.includes(proposedCategory)) {
    return {
      category: "Catering Equipment",
      subcategory: proposedCategory,
    }
  }

  if (CATEGORY_TITLES.includes(proposedSubcategory)) {
    return {
      category: "Catering Equipment",
      subcategory: proposedSubcategory,
    }
  }

  return {
    category: "Catering Equipment",
    subcategory: fallbackSuggestion.subcategory,
  }
}

function buildFallbackShortDescription({
  brand,
  model,
  title,
  subcategory,
  powerType,
  gasType,
  condition,
}: {
  brand: string
  model: string
  title: string
  subcategory: string
  powerType: string
  gasType: string
  condition: string
}) {
  const text = [title, subcategory, powerType, gasType].filter(Boolean).join(" ").toLowerCase()
  const equipmentType =
    /\bcombi\s*oven\b/.test(text) ? "combi oven" :
    /\bfryer\b/.test(text) ? "fryer" :
    /\bgriddle|grill\b/.test(text) ? "griddle" :
    /\boven\b/.test(text) ? "oven" :
    /\bfridge|refrigerat|chiller\b/.test(text) ? "refrigeration unit" :
    /\bfreezer\b/.test(text) ? "freezer" :
    /\bdishwasher|glasswasher|warewasher\b/.test(text) ? "warewashing machine" :
    /\bcoffee|espresso\b/.test(text) ? "coffee machine" :
    subcategory.toLowerCase() || "catering equipment item"
  const fuelType =
    /\blpg\b|\bpropane\b/.test(text) ? "LPG" :
    /\bnatural gas\b|\bmains gas\b|\bg20\b/.test(text) ? "natural gas" :
    /\bthree phase\b|\b3 phase\b|\b400v\b|\b415v\b/.test(text) ? "three phase electric" :
    /\belectric\b|\b230v\b|\b240v\b|\b13a\b/.test(text) ? "electric" :
    ""
  const itemName = [brand, model, fuelType, equipmentType]
    .filter(Boolean)
    .filter((part, index, parts) => parts.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
  const conditionText = condition.toLowerCase() || "used"

  if (!itemName) {
    return "Used catering equipment item. Please review photos carefully and confirm condition, dimensions and collection requirements before purchase."
  }

  return `${conditionText.charAt(0).toUpperCase()}${conditionText.slice(1)} ${itemName} suitable for commercial catering use. Please check photos and confirm condition, dimensions and collection requirements before purchase.`
}

function normaliseQuickListSuggestion(value: Partial<QuickListAiSuggestion>) {
  const { category, subcategory } = normaliseCategory(value)
  const conditionValue = value.condition as QuickListAiSuggestion["condition"]
  const condition = conditionValue && CONDITIONS.includes(conditionValue) ? conditionValue : "Used"
  const powerType = safeText(value.power_type) || safeText(value.gas_or_electric)
  const normalisedPowerType = POWER_TYPE_OPTIONS.includes(powerType) ? powerType : inferPowerType(powerType)
  const brand = safeText(value.brand)
  const model = safeText(value.model)
  const gcNumber = safeText(value.gc_number)
  const suggestedTitle = safeText(value.suggested_title) || safeText(value.title) || fallbackSuggestion.suggested_title
  const suppliedDescription = safeText(value.short_description) || safeText(value.description)
  const description = suppliedDescription && !/upload at least one|add clear photos|commercial catering item/i.test(suppliedDescription)
    ? suppliedDescription
    : buildFallbackShortDescription({
        brand,
        model: model || gcNumber,
        title: suggestedTitle,
        subcategory: subcategory || "",
        powerType,
        gasType: safeText(value.gas_type),
        condition,
      })
  const manualUrl = safeText(value.manual_url)
  const sourceUrl = safeText(value.manual_source_url) || safeText(value.spec_source_url) || manualUrl
  const normalisedManualUrl = isDirectSourceUrl(manualUrl) ? manualUrl : ""
  const directSourceUrl = isDirectSourceUrl(sourceUrl) ? sourceUrl : ""
  const confidenceScore = clampConfidence(value.confidence_score ?? value.confidence)
  const normalisedWeight = normaliseWeightText(value.weight, value.estimated_weight_kg)
  const dimensionsText = safeText(value.dimensions)
  const parsedDimensions = parseDeliveryDimensionsToCm(dimensionsText)
  const estimatedWeightKg =
    extractWeightKg(value.estimated_weight_kg, { allowBareNumber: true }) || extractWeightKg(normalisedWeight)
  const palletLengthCm = (parsedDimensions ? "120" : normaliseCmField(value.pallet_length_cm, { allowBareNumber: true })) || ""
  const palletWidthCm = (parsedDimensions ? "100" : normaliseCmField(value.pallet_width_cm, { allowBareNumber: true })) || ""
  const palletHeightCm = (parsedDimensions?.heightCm
    ? String(Number(parsedDimensions.heightCm) + 15)
    : normaliseCmField(value.pallet_height_cm, { allowBareNumber: true })) || ""
  const deliveryNotes = safeText(value.delivery_notes)

  return {
    suggested_title: suggestedTitle,
    short_description: description,
    description,
    category,
    subcategory,
    brand,
    model,
    serial_number: safeText(value.serial_number),
    gc_number: gcNumber,
    dimensions: dimensionsText,
    weight: normalisedWeight,
    estimated_weight_kg: estimatedWeightKg || safeText(value.estimated_weight_kg),
    pallet_length_cm: palletLengthCm,
    pallet_width_cm: palletWidthCm,
    pallet_height_cm: palletHeightCm,
    pallet_count: value.pallet_count,
    tail_lift_required: value.tail_lift_required,
    forklift_available: value.forklift_available,
    commercial_premises: value.commercial_premises,
    delivery_notes: deliveryNotes,
    power_type: normalisedPowerType,
    gas_or_electric: safeText(value.gas_or_electric),
    gas_type: safeText(value.gas_type),
    voltage: safeText(value.voltage),
    amps: safeText(value.amps),
    kw_rating: safeText(value.kw_rating),
    electrical_phase: safeText(value.electrical_phase),
    manual_url: normalisedManualUrl,
    manual_source_url: directSourceUrl,
    spec_source_url: directSourceUrl,
    manual_source_name: brand || model ? `${[brand, model].filter(Boolean).join(" ")} manual/spec source` : "Manual/spec source",
    manual_source_type: safeText(value.manual_source_type),
    manual_source_validated: Boolean(value.manual_source_validated),
    manual_source_last_checked_at: safeText(value.manual_source_last_checked_at),
    manual_source_match_notes: safeText(value.manual_source_match_notes),
    manual_source_useful_details: Array.isArray(value.manual_source_useful_details)
      ? value.manual_source_useful_details.filter((item): item is string => typeof item === "string")
      : [],
    ai_spec_confidence: confidenceLabel(confidenceScore),
    source_rejected_by_seller: false,
    shipping_class: safeText(value.shipping_class) || inferShippingClass("", estimatedWeightKg ? `${estimatedWeightKg}kg` : normalisedWeight, dimensionsText),
    delivery_warning: QUICKLIST_AI_WARNING,
    confidence_score: confidenceScore,
    condition,
  } satisfies QuickListAiSuggestion
}

function mergeFromCache(
  suggestion: QuickListAiSuggestion,
  cached: EquipmentModelRow
): QuickListAiSuggestion {
  // Verified-source values beat the vision-AI's data-plate guess (FIX 1).
  const mergedDimensions = cached.dimensions || suggestion.dimensions || ""
  const mergedWeight = cached.weight_gross || cached.weight_net || suggestion.weight || ""
  const parsedDimensions = parseDeliveryDimensionsToCm(mergedDimensions)
  const estimatedWeightKg =
    extractWeightKg(suggestion.estimated_weight_kg, { allowBareNumber: true }) ||
    extractWeightKg(mergedWeight)
  const seenCount = cached.times_seen ?? 1

  return {
    ...suggestion,
    manual_url: cached.source_url || suggestion.manual_url || "",
    manual_source_url: cached.source_url || "",
    spec_source_url: cached.source_url || "",
    manual_source_name: cached.source_name || "",
    manual_source_type: cached.source_type || "",
    manual_source_validated: Boolean(cached.source_url),
    manual_source_last_checked_at: cached.last_verified_at,
    manual_source_match_notes: `CaterBot matched this model from the knowledge base (seen ${seenCount} time${seenCount === 1 ? "" : "s"}, source: ${cached.source_type || cached.source_name || "verified source"}).`,
    manual_source_useful_details: [],
    ai_spec_confidence: cached.validation_score >= 115 ? "high" : "medium",
    dimensions: mergedDimensions,
    weight: mergedWeight,
    estimated_weight_kg: estimatedWeightKg || safeText(suggestion.estimated_weight_kg),
    pallet_length_cm:
      normaliseCmField(cached.suggested_pallet_l_cm) ||
      (parsedDimensions ? "120" : normaliseCmField(suggestion.pallet_length_cm, { allowBareNumber: true })) ||
      "",
    pallet_width_cm:
      normaliseCmField(cached.suggested_pallet_w_cm) ||
      (parsedDimensions ? "100" : normaliseCmField(suggestion.pallet_width_cm, { allowBareNumber: true })) ||
      "",
    pallet_height_cm:
      normaliseCmField(cached.suggested_pallet_h_cm) ||
      (parsedDimensions?.heightCm
        ? String(Number(parsedDimensions.heightCm) + 15)
        : normaliseCmField(suggestion.pallet_height_cm, { allowBareNumber: true })) ||
      "",
    voltage: cached.voltage || suggestion.voltage || "",
    amps: cached.amps || suggestion.amps || "",
    kw_rating: cached.kw_rating || suggestion.kw_rating || "",
    electrical_phase: cached.electrical_phase || cached.phase || suggestion.electrical_phase || "",
    gas_type: cached.gas_type || suggestion.gas_type || "",
    source_rejected_by_seller: false,
  } satisfies QuickListAiSuggestion
}

async function withValidatedSource(suggestion: QuickListAiSuggestion) {
  const candidateUrls = [
    suggestion.manual_source_url,
    suggestion.spec_source_url,
    suggestion.manual_url,
  ].filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url)))
  const plateIdentifier = suggestion.model || suggestion.gc_number

  // READ HOOK: serve from knowledge base if cache is fresh, high-score, and trusted
  if (suggestion.brand && suggestion.model) {
    const cached = await lookupEquipmentModel(suggestion.brand, suggestion.model)
    if (
      cached &&
      !cached.needs_review &&
      cached.validation_score >= 85 &&
      isWithinSixMonths(cached.last_verified_at) &&
      (isTrustedSourceType(cached.source_type) || (cached.times_seen ?? 0) >= 3)
    ) {
      return mergeFromCache(suggestion, cached)
    }
  }

  const equipmentSearchText = [
    suggestion.subcategory,
    suggestion.category,
    suggestion.suggested_title || suggestion.title,
    suggestion.description,
  ]
    .filter(Boolean)
    .join(" ")

  const source = await findValidatedCaterBotSource({
    brand: suggestion.brand,
    model: plateIdentifier,
    productTitle: suggestion.suggested_title || suggestion.title,
    category: suggestion.category,
    equipmentType: equipmentSearchText || suggestion.subcategory || suggestion.category,
    fuelType: suggestion.gas_type || suggestion.power_type || suggestion.gas_or_electric,
    voltage: suggestion.voltage,
    phase: suggestion.electrical_phase,
    amps: suggestion.amps,
    powerRating: suggestion.kw_rating,
    candidateUrls,
  })

  if (!source) {
    return {
      ...suggestion,
      manual_url: "",
      manual_source_url: "",
      spec_source_url: "",
      manual_source_name: "",
      manual_source_type: "",
      manual_source_validated: false,
      manual_source_last_checked_at: new Date().toISOString(),
      manual_source_match_notes: !isCaterBotWebSearchConfigured()
        ? "CaterBot source search is not connected yet. You can still list using plate details."
        : plateIdentifier
          ? "CaterBot could not verify an exact manual/spec source. Please add a link manually."
          : "CaterBot needs a clear model or GC number from the data plate before it can verify a manual/spec source.",
      manual_source_useful_details: [],
      ai_spec_confidence: "low",
      source_rejected_by_seller: false,
    } satisfies QuickListAiSuggestion
  }

  // Gemini fallback: when the source is valid but regex found no dims or weight,
  // ask Gemini to read the source body text directly (source has already been verified
  // as the right product — Gemini is just a better reader than regex for that format).
  const sourceGemini =
    source._bodyText
      ? await geminiExtractFromSourceText(
          source._bodyText,
          suggestion.brand,
          suggestion.model || suggestion.gc_number
        )
      : null

  // specVal() filters "Needs seller check" so it can't mask a valid AI image estimate
  // already stored in suggestion.dimensions / suggestion.weight (Fix: was || which treats
  // "Needs seller check" as truthy, hiding Gemini's image-derived value).
  const sourceDims = specVal(source.extractedSpecs.dimensions) || sourceGemini?.dimensions || ""
  const sourceNet = specVal(source.extractedSpecs.weight) || sourceGemini?.weight || ""
  const sourceGross = specVal(source.extractedSpecs.grossWeight) || sourceGemini?.grossWeight || ""

  // Priority: source-derived (regex or Gemini reading the doc) > AI image estimate
  const mergedDimensions = sourceDims || suggestion.dimensions || ""
  // Net weight preferred for listing display; gross as fallback (AI image estimates last)
  const mergedWeight = sourceNet || sourceGross || suggestion.weight || ""

  const parsedDimensions = parseDeliveryDimensionsToCm(mergedDimensions)
  const estimatedWeightKg =
    extractWeightKg(suggestion.estimated_weight_kg, { allowBareNumber: true }) || extractWeightKg(mergedWeight)

  if (KB_WRITES_ENABLED) void writeToEquipmentKnowledgeBase(suggestion, source)

  return {
    ...suggestion,
    manual_url: source.url,
    manual_source_url: source.url,
    spec_source_url: source.url,
    manual_source_name: source.sourceName,
    manual_source_type: source.sourceType,
    manual_source_validated: true,
    manual_source_last_checked_at: source.checkedAt,
    manual_source_match_notes: source.matchNotes,
    manual_source_useful_details: source.usefulDetails,
    ai_spec_confidence: source.confidence,
    dimensions: mergedDimensions,
    weight: mergedWeight,
    estimated_weight_kg: estimatedWeightKg || safeText(suggestion.estimated_weight_kg),
    pallet_length_cm: (parsedDimensions ? "120" : normaliseCmField(suggestion.pallet_length_cm, { allowBareNumber: true })) || "",
    pallet_width_cm: (parsedDimensions ? "100" : normaliseCmField(suggestion.pallet_width_cm, { allowBareNumber: true })) || "",
    pallet_height_cm: (parsedDimensions?.heightCm
      ? String(Number(parsedDimensions.heightCm) + 15)
      : normaliseCmField(suggestion.pallet_height_cm, { allowBareNumber: true })) || "",
    voltage: specVal(source.extractedSpecs.voltage) || suggestion.voltage || "",
    amps: specVal(source.extractedSpecs.amps) || suggestion.amps || "",
    kw_rating: specVal(source.extractedSpecs.kwRating) || suggestion.kw_rating || "",
    electrical_phase: specVal(source.extractedSpecs.phase) || suggestion.electrical_phase || "",
    gas_type: specVal(source.extractedSpecs.gasType) || suggestion.gas_type || "",
    source_rejected_by_seller: false,
    _diag: {
      ai_dimensions: suggestion.dimensions ?? "",
      source_valid: source.valid,
      source_url: source.url,
      source_found_dimensions: specVal(source.extractedSpecs.dimensions),
      source_gemini_dimensions: sourceGemini?.dimensions ?? "",
      final_dimensions: mergedDimensions,
    },
  } satisfies QuickListAiSuggestion
}

function fallbackFromFiles(files: QuickListImageInput[]) {
  const fileText = files
    .map((file) => (file.fileName || "").replace(/\.[a-z0-9]+$/i, ""))
    .filter(Boolean)
    .join(" ")
  const equipment = inferEquipment(fileText)
  const brand = extractPlateValue(fileText, [
    /\bbrand[\s:_-]+([a-z0-9][a-z0-9\s&.]{1,30}?)(?=[\s:_-]+(?:model|serial|s\/?n|sn|gc)\b|$)/i,
    /\bmake[\s:_-]+([a-z0-9][a-z0-9\s&.]{1,30}?)(?=[\s:_-]+(?:model|serial|s\/?n|sn|gc)\b|$)/i,
  ])
  const model = extractPlateValue(fileText, [
    /\bmodel(?:\s?no\.?)?[\s:_-]+([a-z0-9][a-z0-9./-]{1,24}?)(?=[\s:_-]+(?:brand|serial|s\/?n|sn|gc|\d{2,4}v|\d{1,3}a|\d{1,4}kg|\d{2,4}x)|$)/i,
    /\bmdl[\s:_-]+([a-z0-9][a-z0-9./-]{1,24}?)(?=[\s:_-]+(?:brand|serial|s\/?n|sn|gc|\d{2,4}v|\d{1,3}a|\d{1,4}kg|\d{2,4}x)|$)/i,
  ])
  const serialNumber = extractPlateValue(fileText, [
    /\bserial(?:\s?no\.?)?[\s:_-]+([a-z0-9][a-z0-9./-]{1,30}?)(?=[\s:_-]+(?:brand|model|gc|\d{2,4}v|\d{1,3}a|\d{1,4}kg|\d{2,4}x)|$)/i,
    /\bs\/?n[\s:_-]+([a-z0-9][a-z0-9./-]{1,30}?)(?=[\s:_-]+(?:brand|model|gc|\d{2,4}v|\d{1,3}a|\d{1,4}kg|\d{2,4}x)|$)/i,
  ])
  const gcNumber = extractPlateValue(fileText, [
    /\bgc(?:\s?no\.?)?[\s:_-]+([0-9][0-9\s.-]{3,20}?)(?=[\s:_-]+(?:brand|model|serial|s\/?n|sn|\d{2,4}v|\d{1,3}a|\d{1,4}kg|\d{2,4}x)|$)/i,
    /\bgc[\s:_-]*([0-9]{2}[-\s.]?[0-9]{3}[-\s.]?[0-9]{2,})(?=[\s:_-]+(?:brand|model|serial|s\/?n|sn|\d{2,4}v|\d{1,3}a|\d{1,4}kg|\d{2,4}x)|$)/i,
  ])
  const dimensions = extractPlateValue(fileText, [
    /\b(\d{2,4}\s?(?:x|by)\s?\d{2,4}\s?(?:x|by)\s?\d{2,4}\s?(?:mm|cm)?)/i,
  ])
  const weight = extractPlateValue(fileText, [/\b(\d{1,4}(?:\.\d+)?\s?kg)\b/i])
  const powerType = inferPowerType(fileText)
  const gasType = inferGasType(fileText)
  const confidenceBonus = model || gcNumber ? 0.18 : 0

  return normaliseQuickListSuggestion({
    suggested_title: equipment.title,
    description:
      equipment.keywords.length > 0
        ? equipment.description
        : "Add clear photos and data plate details manually.",
    category: "Catering Equipment",
    subcategory: equipment.subcategory,
    brand,
    model,
    serial_number: serialNumber,
    gc_number: gcNumber,
    dimensions,
    weight,
    power_type: powerType,
    gas_type: gasType,
    voltage: extractPlateValue(fileText, [/\b(2[23]0v|240v|400v|415v)\b/i]),
    amps: extractPlateValue(fileText, [/\b(\d{1,3}(?:\.\d+)?\s?a(?:mp|mps)?)\b/i]),
    kw_rating: extractPlateValue(fileText, [/\b(\d{1,3}(?:\.\d+)?\s?kw)\b/i]),
    electrical_phase: /three phase|3 phase|3-phase/i.test(fileText)
      ? "Three phase"
      : /single phase|1 phase|1-phase/i.test(fileText)
        ? "Single phase"
        : "",
    shipping_class: inferShippingClass(fileText, weight, dimensions),
    confidence_score: Math.min(0.5, 0.2 + equipment.keywords.length * 0.08 + confidenceBonus),
    condition: "Used",
  })
}

function extractJson(content: string) {
  const trimmed = content.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const jsonText = fenced?.[1] || trimmed

  return JSON.parse(jsonText) as Partial<QuickListAiSuggestion>
}

async function analyseWithGemini({
  apiKey,
  images,
  prompt,
}: {
  apiKey: string
  images: QuickListImageInput[]
  prompt: string
}) {
  const configuredModel = process.env.AI_VISION_MODEL?.trim()
  const fallbackModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]
  const modelCandidates = Array.from(
    new Set(
      configuredModel
        ? configuredModel === "gemini-flash-latest" || configuredModel.startsWith("gemini-2.0")
          ? fallbackModels
          : [configuredModel, ...fallbackModels]
        : fallbackModels
    )
  )
  const errors: string[] = []

  for (const model of modelCandidates) {
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                ...images.map((image) => ({
                  inline_data: {
                    mime_type: normaliseImageMimeType(image.fileType),
                    data: image.imageBase64,
                  },
                })),
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.05,
          },
        }),
      }
    )
    const data = await aiResponse.json()

    if (!aiResponse.ok) {
      const message = safeText(data?.error?.message) || aiResponse.statusText
      errors.push(`${model}: ${message}`)
      console.warn("CaterBids CaterBot Gemini provider error:", {
        model,
        status: aiResponse.status,
        message,
      })
      continue
    }

    const content = safeText(data?.candidates?.[0]?.content?.parts?.[0]?.text)
    if (!content) {
      errors.push(`${model}: empty response`)
      continue
    }

    return normaliseQuickListSuggestion(extractJson(content))
  }

  throw new Error(`Gemini vision analysis failed. ${errors.join(" | ")}`)
}

async function analyseWithOpenAI({
  apiKey,
  images,
  prompt,
}: {
  apiKey: string
  images: QuickListImageInput[]
  prompt: string
}) {
  const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...images.map((image) => ({
              type: "image_url",
              image_url: {
                url: `data:${normaliseImageMimeType(image.fileType)};base64,${image.imageBase64}`,
              },
            })),
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.15,
    }),
  })

  const data = await aiResponse.json()
  if (!aiResponse.ok) {
    const message = safeText(data?.error?.message) || aiResponse.statusText
    console.warn("CaterBids QuickList OpenAI error:", {
      status: aiResponse.status,
      message,
    })
    throw new Error(`CaterBot could not complete image analysis. ${message}`)
  }

  const content = safeText(data?.choices?.[0]?.message?.content)
  if (!content) {
    throw new Error("CaterBot could not complete image analysis. Empty response.")
  }
  const parsed = extractJson(content)

  return normaliseQuickListSuggestion(parsed)
}

function withLegacyAliases(suggestion: QuickListAiSuggestion) {
  return {
    ...suggestion,
    short_description: suggestion.short_description || suggestion.description,
    title: suggestion.suggested_title,
    price: "",
    confidence: confidenceLabel(suggestion.confidence_score),
    keywords: [],
  } satisfies QuickListAiSuggestion & LegacyAiListingSuggestion
}

export async function POST(req: Request) {
  let uploadedFiles: QuickListImageInput[] = []
  let usedVisionProvider = false

  try {
    const body = (await req.json()) as {
      imageBase64?: string
      fileType?: string
      fileName?: string
      itemImages?: QuickListImageInput[]
      specPlate?: QuickListImageInput | null
    }

    const itemImages = Array.isArray(body.itemImages) ? body.itemImages : []
    const images = [
      ...itemImages,
      body.specPlate || undefined,
      body.imageBase64
        ? {
            imageBase64: body.imageBase64,
            fileType: body.fileType,
            fileName: body.fileName,
          }
        : undefined,
    ].filter((image): image is QuickListImageInput => Boolean(image?.imageBase64))

    uploadedFiles = images

    if (images.length === 0) {
      return NextResponse.json(
        withLegacyAliases({
          ...fallbackSuggestion,
          description: "Please upload at least one item photo or a clear spec/data plate photo before scanning.",
        }),
        { status: 400 }
      )
    }

    const providers = [
      process.env.AI_VISION_API_KEY
        ? {
            name: "AI_VISION_API_KEY",
            apiKey: process.env.AI_VISION_API_KEY,
            kind:
              process.env.AI_VISION_API_KEY.startsWith("AIza") ||
              process.env.AI_VISION_MODEL?.startsWith("gemini")
                ? "gemini"
                : "openai",
          }
        : null,
      process.env.OPENAI_API_KEY
        ? {
            name: "OPENAI_API_KEY",
            apiKey: process.env.OPENAI_API_KEY,
            kind: "openai",
          }
        : null,
    ].filter(
      (
        provider
      ): provider is {
        name: string
        apiKey: string
        kind: "gemini" | "openai"
      } => Boolean(provider?.apiKey)
    )

    if (providers.length === 0) {
      return NextResponse.json(
        {
          ...withLegacyAliases(fallbackFromFiles(images)),
          error: "CaterBot could not read photos right now.",
        },
        { status: 503 }
      )
    }

    const prompt = `
You are CaterBot, the smart CaterBids listing assistant for CaterBids.UK, a UK marketplace for commercial catering equipment.
Analyse all uploaded item photos plus the spec/data plate photo if present.

Tasks:
- Identify the item type from normal photos.
- Read the spec/data plate if visible. Treat the data plate as the authority for brand, model, serial number and GC number.
- Extract brand, model, serial number and GC number only when they are visible on the spec/data plate or a clearly readable label.
- Do not use generic phrases such as "Catering Equipment", "Commercial Catering Equipment" or the equipment type as the brand. If the maker is unclear, use "" for brand.
- For gas or electric catering equipment, treat ManualsLib as the first manual database for exact dimensions, weight, power and gas/electrical information.
- Use the exact model number first, or the exact GC number if no model is visible, for the ManualsLib manual lookup.
- Extract dimensions and weight only when visible in photos, visible on the plate, or certain from a manufacturer manual/spec sheet.
- Suggest delivery/shipping class for a UK catering equipment buyer.
- Generate an editable listing title, category and short description.
- The short description must be seller-friendly, 1-3 short sentences max.
- Mention visible equipment type, brand/model if found, condition clues and buyer-useful details only.
- Do not invent specs, dimensions, weight, service history, warranty, tested status, working status, gas safety or electrical safety.
- If unsure, use cautious wording and ask buyers to check photos and confirm details before purchase.
- Estimate pallet delivery setup only where visible or strongly implied by the equipment and state "Needs seller confirmation" for uncertain delivery fields.

Return strict JSON only with exactly these keys:
{
  "title": string,
  "suggested_title": string,
  "short_description": string,
  "description": string,
  "category": string,
  "subcategory": string,
  "brand": string,
  "model": string,
  "serial_number": string,
  "gc_number": string,
  "dimensions": string,
  "weight": string,
  "estimated_weight_kg": string,
  "pallet_length_cm": string,
  "pallet_width_cm": string,
  "pallet_height_cm": string,
  "pallet_count": string,
  "tail_lift_required": boolean,
  "forklift_available": boolean,
  "commercial_premises": boolean,
  "delivery_notes": string,
  "power_type": string,
  "gas_or_electric": string,
  "gas_type": string,
  "voltage": string,
  "amps": string,
  "kw_rating": string,
  "electrical_phase": string,
  "manual_url": string,
  "manual_source_url": string,
  "spec_source_url": string,
  "manual_source_name": string,
  "manual_source_type": string,
  "manual_source_validated": boolean,
  "manual_source_match_notes": string,
  "manual_source_useful_details": string[],
  "ai_spec_confidence": "high" | "medium" | "low",
  "shipping_class": string,
  "delivery_warning": string,
  "confidence_score": number,
  "confidence": string,
  "condition": "New" | "Used" | "Refurbished" | "Spares or Repair"
}

Rules:
- Category must be exactly one of: ${CATEGORY_OPTIONS.filter((item) => item !== "All Categories").join(", ")}.
- If this is equipment, use category "Catering Equipment" and put the equipment family in subcategory.
- Subcategory must be one of: ${CATEGORY_TITLES.join(", ")} when category is Catering Equipment.
- power_type should be one of: ${POWER_TYPE_OPTIONS.join(", ")}.
- Use "" for unknown values.
- description and short_description should both contain the same short seller-friendly listing description.
- brand must be the maker/manufacturer only, not a category or supplier phrase.
- Do not invent or estimate a model, serial number, GC number, voltage, amps, kW rating, dimensions or weight.
- Do not copy a model number from a guessed product name. The model or GC number must come from the data plate/label text. If the plate is blurry or ambiguous, use "" and leave manual_url empty.
- Use "" for dimensions and weight if they are not readable or not certain. Never guess from item type.
- For pallet_length_cm, pallet_width_cm, pallet_height_cm and estimated_weight_kg, use the exact readable/spec-sheet value when present. If only an estimate is possible, put "Needs seller confirmation" instead of a number.
- delivery_notes must mention "Needs seller confirmation" for any estimated pallet, weight, dimension, phone, collection or access detail.
- manual_url should be a direct ManualsLib /manual/ page URL only when it matches the exact visible model number or GC number. If no exact identifier match is known, use "". Do not use ManualsLib search pages, Google, generic search URLs, or generic brand phrases.
- manual_source_url/spec_source_url should only be direct manufacturer, distributor, supplier or manual page URLs. Do not return generic homepages, search pages, unrelated products or category pages.
- manual_source_validated should be false. CaterBids validates links server-side before the seller can confirm them.
- manual_source_useful_details should list factual details visible in the source only, such as Dimensions, Weight, Voltage, Phase, Power rating, Capacity, Installation notes or Delivery handling notes.
- delivery_warning must be exactly: "${QUICKLIST_AI_WARNING}"
- Do not say gas or electrical equipment is safe, certified or legally compliant.
- confidence_score must be between 0 and 1.
`.trim()

    usedVisionProvider = true
    const providerErrors: string[] = []

    for (const provider of providers) {
      try {
        const suggestion =
          provider.kind === "gemini"
            ? await analyseWithGemini({ apiKey: provider.apiKey, images, prompt })
            : await analyseWithOpenAI({ apiKey: provider.apiKey, images, prompt })

        return NextResponse.json(withLegacyAliases(await withValidatedSource(suggestion)))
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown provider error"
        providerErrors.push(`${provider.name}: ${message}`)
        console.warn("CaterBids QuickList provider failed:", {
          provider: provider.name,
          message,
        })
      }
    }

    throw new Error(providerErrors.join(" | "))
  } catch (error) {
    if (usedVisionProvider) {
      Sentry.captureException(error)
    }
    console.warn("CaterBot failed:", error)
    if (usedVisionProvider) {
      const message = error instanceof Error ? error.message : "Unknown CaterBot analysis error"
      return NextResponse.json(
        {
          error: "CaterBot could not read these photos.",
          detail: message,
        },
        { status: 502 }
      )
    }

    return NextResponse.json(withLegacyAliases(fallbackFromFiles(uploadedFiles)))
  }
}
