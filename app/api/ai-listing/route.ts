import { NextResponse } from "next/server"
import {
  CATEGORY_OPTIONS,
  CATEGORY_TITLES,
  subcategoriesForCategory,
} from "@/lib/categories"
import { POWER_TYPE_OPTIONS } from "@/lib/listing-trust"
import { findValidatedCaterBotSource } from "@/lib/caterbot/sourceValidation"

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

  if (/(van|trailer|food truck|large oven|cold room)/.test(combined) || weightKg >= 250) {
    return "Specialist transport required"
  }

  if (/(pallet|fridge|freezer|oven|fryer|dishwasher|glasswasher)/.test(combined) || weightKg >= 55) {
    return "Pallet delivery recommended"
  }

  if (weightKg > 0 && weightKg < 30) {
    return "Courier may be possible"
  }

  return "Delivery quote required"
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
  const description = safeText(value.description) || fallbackSuggestion.description
  const manualUrl = safeText(value.manual_url)
  const sourceUrl = safeText(value.manual_source_url) || safeText(value.spec_source_url) || manualUrl
  const normalisedManualUrl = isDirectSourceUrl(manualUrl) ? manualUrl : ""
  const directSourceUrl = isDirectSourceUrl(sourceUrl) ? sourceUrl : ""
  const confidenceScore = clampConfidence(value.confidence_score ?? value.confidence)
  const normalisedWeight = normaliseWeightText(value.weight, value.estimated_weight_kg)
  const deliveryNotes = safeText(value.delivery_notes)

  return {
    suggested_title: suggestedTitle,
    description,
    category,
    subcategory,
    brand,
    model,
    serial_number: safeText(value.serial_number),
    gc_number: gcNumber,
    dimensions: safeText(value.dimensions),
    weight: normalisedWeight,
    estimated_weight_kg: value.estimated_weight_kg,
    pallet_length_cm: value.pallet_length_cm,
    pallet_width_cm: value.pallet_width_cm,
    pallet_height_cm: value.pallet_height_cm,
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
    shipping_class: safeText(value.shipping_class) || inferShippingClass("", normalisedWeight, safeText(value.dimensions)),
    delivery_warning: QUICKLIST_AI_WARNING,
    confidence_score: confidenceScore,
    condition,
  } satisfies QuickListAiSuggestion
}

async function withValidatedSource(suggestion: QuickListAiSuggestion) {
  const candidateUrls = [
    suggestion.manual_source_url,
    suggestion.spec_source_url,
    suggestion.manual_url,
  ].filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url)))
  const plateIdentifier = suggestion.model || suggestion.gc_number
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
    equipmentType: equipmentSearchText || suggestion.subcategory || suggestion.category,
    candidateUrls,
  })

  if (!source) {
    return {
      ...suggestion,
      manual_source_url: "",
      spec_source_url: "",
      manual_source_name: "",
      manual_source_type: "",
      manual_source_validated: false,
      manual_source_last_checked_at: new Date().toISOString(),
      manual_source_match_notes:
        plateIdentifier
          ? `CaterBot could not verify a reliable manual/spec source containing the exact plate identifier ${plateIdentifier}.`
          : "CaterBot needs a clear model or GC number from the data plate before it can verify a manual/spec source.",
      manual_source_useful_details: [],
      ai_spec_confidence: "low",
      source_rejected_by_seller: false,
    } satisfies QuickListAiSuggestion
  }

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
    dimensions: suggestion.dimensions || source.extractedSpecs.dimensions || "",
    weight: suggestion.weight || source.extractedSpecs.weight || "",
    voltage: suggestion.voltage || source.extractedSpecs.voltage || "",
    amps: suggestion.amps || source.extractedSpecs.amps || "",
    kw_rating: suggestion.kw_rating || source.extractedSpecs.kwRating || "",
    electrical_phase: suggestion.electrical_phase || source.extractedSpecs.phase || "",
    gas_type: suggestion.gas_type || source.extractedSpecs.gasType || "",
    source_rejected_by_seller: false,
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
    throw new Error(`CaterBot could not complete OpenAI image analysis. ${message}`)
  }

  const content = safeText(data?.choices?.[0]?.message?.content)
  if (!content) {
    throw new Error("CaterBot could not complete OpenAI image analysis. Empty response.")
  }
  const parsed = extractJson(content)

  return normaliseQuickListSuggestion(parsed)
}

function withLegacyAliases(suggestion: QuickListAiSuggestion) {
  return {
    ...suggestion,
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
- Generate an editable listing title, category and description.
- Estimate pallet delivery setup only where visible or strongly implied by the equipment and state "Needs seller confirmation" for uncertain delivery fields.

Return strict JSON only with exactly these keys:
{
  "title": string,
  "suggested_title": string,
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
