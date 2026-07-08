import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  buildSpecLookupQueries,
  extractSpecPlateDetails,
  findBestSpecSource,
  specsFromValidatedSource,
} from "@/lib/caterbot/specLookup"
import {
  getConfiguredCaterBotSearchProviderName,
  isCaterBotWebSearchConfigured,
} from "@/lib/caterbot/webSearch"
import { askGeminiForMissingSpecs } from "@/lib/caterbot/geminiEstimate"

export const runtime = "nodejs"

function clean(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : ""
}

function devUserId(req: NextRequest) {
  return process.env.NODE_ENV === "development" && req.cookies.get("caterbids_dev_auth")?.value === "1"
    ? "local-beta"
    : ""
}

function extractJson(content: string) {
  const trimmed = content.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return JSON.parse(fenced?.[1] || trimmed) as {
    raw_text?: string
    equipment_type?: string
    visible_brand?: string
    visible_model?: string
    visual_category?: string
    condition_clues?: string[]
    product_name?: string
    brand?: string
    model?: string
    serial?: string
    gas_type?: string
    voltage?: string
    heat_input_kw?: number
    refrigerant?: string
    brand_candidates?: string[]
    model_candidates?: string[]
    serial_candidates?: string[]
    equipment_type_candidates?: string[]
    power_details?: string[]
    refrigerant_details?: string[]
    confidence?: number
  }
}

function textArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : []
}

type CaterBotMainImageAnalysis = {
  raw_text: string
  equipment_type: string
  visible_brand: string
  visible_model: string
  visual_category: string
  condition_clues: string[]
  confidence: number
}

type CaterBotSpecPlateAnalysis = {
  raw_text: string
  brand: string
  model: string
  product_name: string
  serial: string
  equipment_type: string
  gas_type: string
  voltage: string
  heat_input_kw: number | null
  refrigerant: string
  confidence: number
}

type CaterBotImageInput = {
  imageUrl: string
  imageBase64: string
  fileType: string
  fileName: string
}

function emptyMainImageAnalysis(): CaterBotMainImageAnalysis {
  return {
    equipment_type: "",
    visible_brand: "",
    visible_model: "",
    visual_category: "",
    condition_clues: [],
    confidence: 0,
    raw_text: "",
  }
}

function emptySpecPlateAnalysis(): CaterBotSpecPlateAnalysis {
  return {
    raw_text: "",
    brand: "",
    model: "",
    product_name: "",
    serial: "",
    equipment_type: "",
    gas_type: "",
    voltage: "",
    heat_input_kw: null,
    refrigerant: "",
    confidence: 0,
  }
}

function imageInputFromUnknown(value: unknown): CaterBotImageInput | null {
  if (!value || typeof value !== "object") return null
  const input = value as Record<string, unknown>
  const imageUrl = clean(input.imageUrl || input.image_url || input.url)
  const imageBase64 = clean(input.imageBase64 || input.image_base64 || input.base64)
  if (!imageUrl && !imageBase64) return null
  return {
    imageUrl,
    imageBase64,
    fileType: clean(input.fileType || input.file_type || input.mimeType || input.mime_type) || "image/jpeg",
    fileName: clean(input.fileName || input.file_name || input.name),
  }
}

function imageInputsFromUnknown(value: unknown): CaterBotImageInput[] {
  return Array.isArray(value)
    ? value.map(imageInputFromUnknown).filter((input): input is CaterBotImageInput => Boolean(input))
    : []
}

function sameImageInput(a: CaterBotImageInput, b: CaterBotImageInput) {
  return Boolean(
    (a.imageBase64 && b.imageBase64 && a.imageBase64 === b.imageBase64) ||
      (a.imageUrl && b.imageUrl && a.imageUrl === b.imageUrl)
  )
}

function specPlateScore(analysis: CaterBotSpecPlateAnalysis) {
  const rawText = analysis.raw_text || ""
  const modelLabelScore = /\b(model|model no|type|code|product code|pnc|pnc code|serial|s\/n)\b/i.test(rawText) ? 24 : 0
  const powerScore = /\b(230v|400v|415v|3n|50hz|60hz|kw|watt|amps?|phase|gas|refrigerant)\b/i.test(rawText) ? 18 : 0
  const identityScore = (analysis.model ? 38 : 0) + (analysis.brand ? 22 : 0) + (analysis.product_name ? 10 : 0)
  const textScore = Math.min(28, Math.round(rawText.length / 24))
  return identityScore + modelLabelScore + powerScore + textScore + Math.round((analysis.confidence || 0) * 20)
}

async function imageUrlToBase64(imageUrl: string) {
  if (!/^https?:\/\//i.test(imageUrl)) return ""
  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": "CaterBidsUK-CaterBot/1.0 (+https://caterbids.uk)",
      Accept: "image/*,*/*;q=0.8",
    },
  })
  if (!response.ok) return ""
  const buffer = Buffer.from(await response.arrayBuffer())
  return buffer.toString("base64")
}

async function analyseCaterBotImage({
  kind,
  imageUrl,
  imageBase64,
  fileType,
}: {
  kind: "main" | "spec"
  imageUrl?: string
  imageBase64?: string
  fileType?: string
}): Promise<CaterBotMainImageAnalysis | CaterBotSpecPlateAnalysis> {
  const base64 = imageBase64 || (imageUrl ? await imageUrlToBase64(imageUrl) : "")
  if (!base64) {
    return kind === "main" ? emptyMainImageAnalysis() : emptySpecPlateAnalysis()
  }

  const specPrompt = `
You are CaterBot reading a commercial catering equipment spec/data plate.
Extract only text and factual fields visible on the plate. The exact model number is the most important field.
Read every visible rating line you can, including voltage, phase, frequency, watts, amps, kW, gas type, gas pressure, gas connection, refrigerant, refrigerant mass, net/gross weight, capacity and warning text.
Return strict JSON:
{
  "raw_text": "all readable plate text",
  "brand": "",
  "model": "",
  "product_name": "",
  "serial": "",
  "equipment_type": "",
  "gas_type": "",
  "voltage": "",
  "heat_input_kw": null,
  "refrigerant": "",
  "brand_candidates": [],
  "model_candidates": [],
  "serial_candidates": [],
  "equipment_type_candidates": [],
  "power_details": [],
  "refrigerant_details": [],
  "confidence": 0.0
}
Rules:
- Keep model numbers exactly, including hyphens and slashes.
- Do not invent a model, brand, weight, dimensions or refrigerant.
- If any character in the model or serial could be ambiguous (e.g. U/G, 0/O, 1/I/7, 3/8, B/8), list alternative readings in model_candidates.
- Prefer labels MODEL, MODEL NO, TYPE, CODE, ITEM, PRODUCT CODE and SKU over serial-only numbers.
`.trim()
  const mainPrompt = `
You are CaterBot looking at the main product photo for a used UK catering equipment listing.
Identify only visible facts and cautious visual clues. Return strict JSON:
{
  "raw_text": "any readable logo, label or text visible in the image",
  "equipment_type": "",
  "visible_brand": "",
  "visible_model": "",
  "visual_category": "",
  "condition_clues": [],
  "confidence": 0.0
}
Rules:
- Focus on equipment type, visible logo/brand, model labels and condition clues.
- Do not invent a brand/model if not readable.
- Use catering terms such as upright fridge, combi oven, fryer, griddle, gas doner kebab machine, dishwasher, glasswasher, extraction canopy, food van or catering trailer.
`.trim()
  const prompt = kind === "spec" ? specPrompt : mainPrompt

  if (process.env.AI_VISION_API_KEY?.startsWith("AIza")) {
    const model = process.env.AI_VISION_MODEL || "gemini-2.5-flash"
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": process.env.AI_VISION_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: fileType || "image/jpeg",
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.05,
        },
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(clean(data?.error?.message) || "CaterBot vision failed")
    const parsed = extractJson(clean(data?.candidates?.[0]?.content?.parts?.[0]?.text))
    return kind === "main"
      ? {
          raw_text: clean(parsed.raw_text),
          equipment_type: clean(parsed.equipment_type),
          visible_brand: clean(parsed.visible_brand),
          visible_model: clean(parsed.visible_model),
          visual_category: clean(parsed.visual_category),
          condition_clues: textArray(parsed.condition_clues),
          confidence: Number(parsed.confidence || 0),
        }
      : {
          raw_text: clean(parsed.raw_text),
          brand: clean(parsed.brand),
          model: clean(parsed.model),
          product_name: clean(parsed.product_name),
          serial: clean(parsed.serial),
          equipment_type: clean(parsed.equipment_type),
          gas_type: clean(parsed.gas_type),
          voltage: clean(parsed.voltage),
          heat_input_kw: typeof parsed.heat_input_kw === "number" ? parsed.heat_input_kw : null,
          refrigerant: clean(parsed.refrigerant),
          confidence: Number(parsed.confidence || 0),
        }
  }

  const openAiKey = process.env.OPENAI_API_KEY || process.env.AI_VISION_API_KEY
  if (!openAiKey) return kind === "main" ? emptyMainImageAnalysis() : emptySpecPlateAnalysis()

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${fileType || "image/jpeg"};base64,${base64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.05,
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(clean(data?.error?.message) || "CaterBot vision failed")
  const parsed = extractJson(clean(data?.choices?.[0]?.message?.content))
  return kind === "main"
    ? {
        raw_text: clean(parsed.raw_text),
        equipment_type: clean(parsed.equipment_type),
        visible_brand: clean(parsed.visible_brand),
        visible_model: clean(parsed.visible_model),
        visual_category: clean(parsed.visual_category),
        condition_clues: textArray(parsed.condition_clues),
        confidence: Number(parsed.confidence || 0),
      }
    : {
        raw_text: clean(parsed.raw_text),
        brand: clean(parsed.brand),
        model: clean(parsed.model),
        product_name: clean(parsed.product_name),
        serial: clean(parsed.serial),
        equipment_type: clean(parsed.equipment_type),
        gas_type: clean(parsed.gas_type),
        voltage: clean(parsed.voltage),
        heat_input_kw: typeof parsed.heat_input_kw === "number" ? parsed.heat_input_kw : null,
        refrigerant: clean(parsed.refrigerant),
        confidence: Number(parsed.confidence || 0),
      }
}

function fallbackSearchQueries({ brand, model, equipmentType, titleHint }: { brand: string; model: string; equipmentType: string; titleHint: string }) {
  if (brand && model) return buildSpecLookupQueries({ brand, model, equipmentType })
  const identity = [brand, equipmentType || titleHint].filter(Boolean).join(" ").trim()
  if (!identity) return []
  return [
    `"${identity}" dimensions`,
    `"${identity}" manual`,
    `"${identity}" weight dimensions`,
    `${identity} UK catering equipment weight dimensions`,
  ]
}

function isMissingTableOrColumn(error: unknown) {
  if (!error || typeof error !== "object") return false
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : ""
  const code = "code" in error && typeof error.code === "string" ? error.code : ""
  return ["42P01", "42703", "PGRST204"].includes(code) || message.includes("schema cache") || message.includes("does not exist")
}

async function saveLookupResult({
  supabase,
  listingId,
  sellerId,
  extraction,
  specs,
  source,
  mainImageAnalysis,
  specPlateAnalysis,
  searchQueries,
  sourceResults,
  checkedAt,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  listingId: string
  sellerId: string
  extraction: ReturnType<typeof extractSpecPlateDetails>
  specs: ReturnType<typeof specsFromValidatedSource>
  source: Awaited<ReturnType<typeof findBestSpecSource>>["selected"]
  mainImageAnalysis: unknown
  specPlateAnalysis: unknown
  searchQueries: string[]
  sourceResults: unknown[]
  checkedAt: string
}) {
  if (!listingId || !sellerId || sellerId === "local-beta") return { saved: false, error: "" }

  const payload = {
    listing_id: listingId,
    seller_id: sellerId,
    brand: extraction.brand || null,
    model: extraction.model || null,
    product_name: extraction.product_name || null,
    serial_number: extraction.serial || null,
    equipment_type: extraction.equipment_type || null,
    raw_ocr_text: extraction.raw_text || null,
    main_image_analysis: mainImageAnalysis || {},
    spec_plate_analysis: specPlateAnalysis || {},
    search_queries: searchQueries || [],
    source_results: sourceResults || [],
    height_cm: specs.height_cm,
    width_cm: specs.width_cm,
    depth_cm: specs.depth_cm,
    weight_kg: specs.weight_kg,
    net_weight_kg: specs.net_weight_kg,
    gross_weight_kg: specs.gross_weight_kg,
    capacity_litres: specs.capacity_litres,
    power_type: specs.power_type || null,
    voltage: specs.voltage || null,
    phase: specs.phase || null,
    frequency: specs.frequency || null,
    watts: specs.watts,
    amps: specs.amps,
    gas_type: specs.gas_type || null,
    gas_connection: specs.gas_connection || null,
    heat_input_kw: specs.heat_input_kw,
    refrigerant: specs.refrigerant || null,
    refrigerant_mass: specs.refrigerant_mass || null,
    pallet_required: specs.pallet_required,
    suggested_pallet_size: specs.suggested_pallet_size || null,
    delivery_notes: specs.delivery_notes || null,
    safety_note: specs.safety_note || null,
    source_url: source?.url || null,
    source_title: source?.sourceTitle || source?.sourceName || null,
    source_type: source?.sourceType || null,
    confidence_score: source?.confidenceScore || Math.round(extraction.confidence * 100),
    checked_at: checkedAt,
    updated_at: checkedAt,
  }

  const { error } = await (supabase as any)
    .from("equipment_specs")
    .upsert(payload, { onConflict: "listing_id" })

  if (error && !isMissingTableOrColumn(error)) return { saved: false, error: error.message || "Could not save specs" }

  const listingPayload = {
    spec_plate_ocr_text: extraction.raw_text || null,
    spec_brand: extraction.brand || null,
    spec_model: extraction.model || null,
    spec_serial_number: extraction.serial || null,
    manual_source_last_checked_at: checkedAt,
    manual_source_url: source?.url || null,
    spec_source_url: source?.url || null,
    manual_source_name: source?.sourceName || null,
    manual_source_type: source?.sourceType || null,
    manual_source_validated: Boolean(source?.url),
    manual_source_match_notes: source?.matchNotes || "CaterBot could not verify an exact manual/spec source. Please add a link manually.",
    ai_spec_confidence: source?.confidence || "low",
    specs_verified_by_seller: false,
    source_rejected_by_seller: false,
    dimensions: specs.height_cm && specs.width_cm && specs.depth_cm
      ? `${specs.height_cm} H x ${specs.width_cm} W x ${specs.depth_cm} D cm`
      : null,
    weight_kg: specs.gross_weight_kg || specs.net_weight_kg,
    length_cm: specs.depth_cm,
    width_cm: specs.width_cm,
    height_cm: specs.height_cm,
    delivery_type: specs.pallet_required ? "Pallet courier" : null,
    pallet_delivery_recommended: specs.pallet_required,
    delivery_notes: specs.delivery_notes || null,
    updated_at: checkedAt,
  }
  const { error: listingError } = await supabase.from("listings").update(listingPayload as any).eq("id", listingId)
  if (listingError && !isMissingTableOrColumn(listingError)) {
    return { saved: false, error: listingError.message || "Could not update listing" }
  }

  return { saved: true, error: "" }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id || devUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, error: "Please log in before using CaterBot specs." }, { status: 401 })
    }

    const body = await req.json()
    const checkedAt = new Date().toISOString()
    console.warn("[CaterBot DIAG] spec-lookup POST reached", {
      brandHint: String(body.brandHint || body.brand || "").slice(0, 40),
      modelHint: String(body.modelHint || body.model || "").slice(0, 40),
      hasImageInputs: Array.isArray(body.imageInputs) && body.imageInputs.length > 0,
      hasSpecPlate: Boolean(body.specPlateImageBase64),
      YOU_API_KEY_present: Boolean(process.env.YOU_API_KEY),
      CATERBOT_SEARCH_PROVIDER: process.env.CATERBOT_SEARCH_PROVIDER || "(unset)",
    })
    const manualText = clean(body.manualText || body.manual_text)
    const dimensionHint = clean(body.dimensionHint || body.dimension_hint)
    const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.filter((url: unknown): url is string => typeof url === "string") : []
    const itemImageInputs = imageInputsFromUnknown(body.imageInputs || body.itemImages || body.images)
    const firstItemImage = itemImageInputs[0]
    const mainImageAnalysis = await analyseCaterBotImage({
      kind: "main",
      imageUrl: clean(body.mainImageUrl || body.main_image_url || firstItemImage?.imageUrl || imageUrls[0]),
      imageBase64: clean(body.mainImageBase64 || body.main_image_base64 || firstItemImage?.imageBase64),
      fileType: clean(body.mainImageFileType || body.main_image_file_type || firstItemImage?.fileType || body.fileType || body.file_type) || "image/jpeg",
    }) as CaterBotMainImageAnalysis
    const explicitSpecInput = imageInputFromUnknown({
      imageUrl: clean(body.specPlateImageUrl || body.spec_plate_image_url || body.imageUrl || body.image_url),
      imageBase64: clean(body.specPlateImageBase64 || body.spec_plate_image_base64 || body.imageBase64 || body.image_base64),
      fileType: clean(body.specPlateFileType || body.spec_plate_file_type || body.fileType || body.file_type) || "image/jpeg",
      fileName: "spec-plate",
    })
    const specCandidateInputs = [
      ...(explicitSpecInput ? [explicitSpecInput] : []),
      ...itemImageInputs
        .filter((_input, index) => index > 0 || !explicitSpecInput)
        .filter((input) => !explicitSpecInput || !sameImageInput(input, explicitSpecInput)),
    ].slice(0, 4)
    const specCandidateAnalyses: CaterBotSpecPlateAnalysis[] = []
    for (const input of specCandidateInputs) {
      try {
        specCandidateAnalyses.push(await analyseCaterBotImage({
          kind: "spec",
          imageUrl: input.imageUrl,
          imageBase64: input.imageBase64,
          fileType: input.fileType,
        }) as CaterBotSpecPlateAnalysis)
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.info("CaterBot skipped a spec-plate candidate", {
            fileName: input.fileName,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
    const specPlateAnalysis = specCandidateAnalyses
      .sort((a, b) => specPlateScore(b) - specPlateScore(a))[0] || emptySpecPlateAnalysis()
    const rawText = [
      manualText,
      specPlateAnalysis.raw_text,
      ...specCandidateAnalyses
        .filter((analysis) => analysis !== specPlateAnalysis)
        .map((analysis) => analysis.raw_text)
        .filter(Boolean),
      [specPlateAnalysis.brand, specPlateAnalysis.model, specPlateAnalysis.product_name, specPlateAnalysis.serial, specPlateAnalysis.equipment_type, specPlateAnalysis.gas_type, specPlateAnalysis.voltage, specPlateAnalysis.refrigerant].filter(Boolean).join(" "),
      mainImageAnalysis.raw_text,
      [mainImageAnalysis.equipment_type, mainImageAnalysis.visible_brand, mainImageAnalysis.visible_model, mainImageAnalysis.visual_category].filter(Boolean).join(" "),
      clean(body.titleHint || body.title_hint),
    ].filter(Boolean).join(" ")
    const extraction = extractSpecPlateDetails({
      rawText,
      brandHint: clean(specPlateAnalysis.brand || body.brandHint || body.brand || body.brand_hint || mainImageAnalysis.visible_brand),
      modelHint: clean(specPlateAnalysis.model || body.modelHint || body.model || body.model_hint || mainImageAnalysis.visible_model),
    })
    const brand = extraction.brand
    const model = extraction.model
    const equipmentType = extraction.equipment_type || clean(specPlateAnalysis.equipment_type || mainImageAnalysis.equipment_type || body.equipment_type || body.equipmentType || body.categoryHint || body.category_hint)
    const warnings: string[] = []

    if (process.env.NODE_ENV === "development") {
      console.info("CaterBot spec lookup extraction", {
        rawText: extraction.raw_text.slice(0, 1200),
        mainImageAnalysis,
        specPlateAnalysis,
        detectedBrand: brand,
        detectedModel: model,
        equipmentType,
      })
    }

    if (!model) {
      const specs = specsFromValidatedSource(null, { ...extraction, equipment_type: equipmentType }, dimensionHint)
      return NextResponse.json({
        success: true,
        image_analysis: {
          main_image: mainImageAnalysis,
          spec_plate: specPlateAnalysis,
        },
        extracted: extraction,
        search_queries: fallbackSearchQueries({ brand, model, equipmentType, titleHint: clean(body.titleHint || body.title_hint) }),
        specs,
        sources: [],
        confidence_score: Math.round(extraction.confidence * 100),
        checkedAt,
        warnings: [
          mainImageAnalysis.confidence
            ? "CaterBot scanned the main item image. Add a clear spec plate for more accurate model and technical specs."
            : "CaterBot could not confidently identify the equipment from the image. Add a clear front photo or spec plate for better results.",
          "CaterBot needs a readable model number before it can verify manuals/specs.",
        ],
      })
    }

    if (!brand) warnings.push("Brand not clearly found. CaterBot searched with the model only where possible.")

    if (!isCaterBotWebSearchConfigured()) {
      const specs = specsFromValidatedSource(null, { ...extraction, equipment_type: equipmentType }, dimensionHint)
      const queries = fallbackSearchQueries({ brand, model, equipmentType, titleHint: clean(body.titleHint || body.title_hint) })
      return NextResponse.json({
        success: true,
        image_analysis: {
          main_image: mainImageAnalysis,
          spec_plate: specPlateAnalysis,
        },
        extracted: extraction,
        search_queries: queries,
        specs,
        sources: [],
        confidence_score: Math.round(extraction.confidence * 100),
        checkedAt,
        warnings: [
          "CaterBot source search is not connected yet. Add a search API key to enable live manual/spec lookup.",
        ],
      })
    }

    const lookup = await findBestSpecSource({
      brand: brand || clean(body.brandHint || body.brand),
      model,
      equipmentType,
      fuelType: clean(body.fuel_type || body.fuelType),
      productTitle: extraction.product_name || clean(body.titleHint || body.title_hint),
      rawText: extraction.raw_text,
    })
    const source = lookup.selected
    const specs = specsFromValidatedSource(source, extraction, dimensionHint || lookup.snippetDimensions || null, lookup.snippetWeightText || null)

    const needsDimensions = !specs.height_cm || !specs.width_cm || !specs.depth_cm
    const needsWeight = !specs.gross_weight_kg && !specs.net_weight_kg && !specs.weight_kg

    type GeminiEstimates = { weight_kg?: number; height_cm?: number; width_cm?: number; depth_cm?: number }
    let geminiEstimates: GeminiEstimates | null = null

    if (brand && model && (needsDimensions || needsWeight)) {
      try {
        const estimate = await askGeminiForMissingSpecs({
          brand,
          model,
          equipmentType,
          needsDimensions,
          needsWeight,
        })
        if (estimate) {
          const pending: GeminiEstimates = {}
          if (needsDimensions) {
            if (estimate.height_cm != null) pending.height_cm = estimate.height_cm
            if (estimate.width_cm != null) pending.width_cm = estimate.width_cm
            if (estimate.depth_cm != null) pending.depth_cm = estimate.depth_cm
          }
          if (needsWeight && estimate.weight_kg != null) {
            pending.weight_kg = estimate.weight_kg
          }
          if (Object.keys(pending).length) geminiEstimates = pending
        }
      } catch {
        // Gemini fallback is best-effort — silent on failure
      }
    }

    if (!specs.gross_weight_kg && specs.net_weight_kg) warnings.push("Gross weight not found from trusted source.")
    if (!source) warnings.push("CaterBot could not verify an exact manual/spec source. Please add a link manually.")

    const matchType: "exact" | "approximate" | "no_match" = !source
      ? "no_match"
      : source.confidence === "high" &&
        source.matchedFields.includes("brand") &&
        source.matchedFields.includes("exact_model")
      ? "exact"
      : "approximate"

    const saveResult = await saveLookupResult({
      supabase,
      listingId: clean(body.listingId || body.listing_id),
      sellerId: userId,
      extraction,
      specs,
      source,
      mainImageAnalysis,
      specPlateAnalysis,
      searchQueries: lookup.searchQueries,
      sourceResults: source
        ? [
            {
              title: source.sourceTitle || source.sourceName,
              url: source.url,
              source_type: source.sourceType,
              trust_score: source.confidenceScore,
              matched_fields: source.matchedFields,
            },
          ]
        : [],
      checkedAt,
    })

    if (process.env.NODE_ENV === "development") {
      console.info("CaterBot spec lookup completed", {
        provider: lookup.provider || getConfiguredCaterBotSearchProviderName(),
        queryCount: lookup.searchQueries.length,
        sourceCount: lookup.candidateUrls.length,
        bestSource: source?.url || null,
        confidence: source?.confidenceScore || Math.round(extraction.confidence * 100),
        specs,
      })
    }

    return NextResponse.json({
      success: true,
      matchType,
      image_analysis: {
        main_image: mainImageAnalysis,
        spec_plate: specPlateAnalysis,
      },
      extracted: extraction,
      search_queries: lookup.searchQueries,
      specs,
      sources: source
        ? [
            {
              title: source.sourceTitle || source.sourceName,
              url: source.url,
              source_type: source.sourceType,
              trust_score: source.confidenceScore,
              matched_fields: source.matchedFields,
            },
          ]
        : [],
      source: source
        ? {
            url: source.url,
            sourceName: source.sourceName,
            sourceType: source.sourceType,
            confidence: source.confidence,
            confidenceScore: source.confidenceScore,
            checkedAt: source.checkedAt,
            matchNotes: source.matchNotes,
            usefulDetails: source.usefulDetails,
            extractedSpecs: source.extractedSpecs,
          }
        : null,
      confidence_score: source?.confidenceScore || Math.round(extraction.confidence * 100),
      checkedAt,
      ...(geminiEstimates ? { geminiEstimates } : {}),
      searchProvider: lookup.provider || getConfiguredCaterBotSearchProviderName(),
      debug:
        process.env.NODE_ENV === "development"
          ? {
              raw_text: extraction.raw_text,
              model_candidates: extraction.model_candidates,
              brand_candidates: extraction.brand_candidates,
              main_image_analysis: mainImageAnalysis,
        spec_plate_analysis: specPlateAnalysis,
        spec_plate_candidate_count: specCandidateAnalyses.length,
        spec_plate_candidate_scores: specCandidateAnalyses.map(specPlateScore),
        search_queries: lookup.searchQueries,
        selected_source: source?.url || null,
        extracted_specs: specs,
      }
          : undefined,
      saved: saveResult.saved,
      saveError: saveResult.error,
      warnings: [...warnings, ...lookup.searchErrors],
    })
  } catch (error) {
    console.error("CaterBot spec lookup failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "CaterBot could not complete spec lookup.",
      },
      { status: 500 }
    )
  }
}
