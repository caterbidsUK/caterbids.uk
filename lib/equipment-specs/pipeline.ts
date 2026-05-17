import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import {
  findValidatedCaterBotSource,
  type CaterBotSourceValidationResult,
} from "@/lib/caterbot/sourceValidation"

type SourceType = "Manufacturer" | "Dealer" | "Catalog" | "Other"
type VerificationStatus = "pending" | "verified" | "unverified" | "needs_review" | "conflicting" | "reported"

export type EquipmentSpecPipelineInput = {
  listingId: string
  sellerId: string
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
  gcNumber?: string | null
  category?: string | null
  specPlateImageUrl?: string | null
  ocrText?: string | null
  powerType?: string | null
  voltage?: string | null
  phase?: number | string | null
  currentA?: number | string | null
  gasType?: string | null
  gasConnection?: string | null
  heightCm?: number | string | null
  widthCm?: number | string | null
  depthCm?: number | string | null
  weightKg?: number | string | null
  forkliftRequired?: boolean | null
  conditionNotes?: string | null
  sourceUrl?: string | null
  listingTitle?: string | null
}

type ParsedSpecs = {
  ext_height_cm?: number | null
  ext_width_cm?: number | null
  ext_depth_cm?: number | null
  pack_height_cm?: number | null
  pack_width_cm?: number | null
  pack_depth_cm?: number | null
  weight_net_kg?: number | null
  weight_gross_kg?: number | null
  voltage?: string | null
  phase?: number | null
  current_a?: number | null
  gas_type?: string | null
  gas_connection?: string | null
  hazardous_notes?: string | null
  lifting_notes?: string | null
  disassembly_notes?: string | null
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""
}

function normaliseIdentifier(value: unknown) {
  return cleanText(value).replace(/[_]+/g, " ").trim()
}

function positiveNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  const text = cleanText(value).replace(/,/g, ".")
  const match = text.match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function dateOnly(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function sixMonthsFromNow() {
  const date = new Date()
  date.setMonth(date.getMonth() + 6)
  return date.toISOString()
}

function isOlderThanSixMonths(value: string | null | undefined) {
  if (!value) return true
  const checked = new Date(value)
  if (Number.isNaN(checked.getTime())) return true
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 6)
  return checked < cutoff
}

function hostnameFromUrl(value: string | null | undefined) {
  try {
    return new URL(value || "").hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    return ""
  }
}

function sourceTypeForUrl(value: string | null | undefined): SourceType {
  const host = hostnameFromUrl(value)
  if (!host) return "Other"
  if (host.includes("manualslib") || host.includes("manual")) return "Catalog"
  if (
    [
      "lincat",
      "falconfoodservice",
      "rational-online",
      "hobartuk",
      "fosterrefrigerator",
      "winterhalter",
      "blue-seal",
      "electroluxprofessional",
      "true-mfg",
      "gram-commercial",
    ].some((domain) => host.includes(domain))
  ) {
    return "Manufacturer"
  }
  if (
    [
      "nisbets",
      "caterkwik",
      "caterboss",
      "cateringequipment",
      "ukcateringequipment",
      "lockhart",
    ].some((domain) => host.includes(domain))
  ) {
    return "Dealer"
  }
  return "Other"
}

function sourceTypeFromValidation(source: CaterBotSourceValidationResult | null): SourceType {
  if (!source?.url) return "Other"
  const fromUrl = sourceTypeForUrl(source.url)
  if (fromUrl !== "Other") return fromUrl
  const text = `${source.sourceType} ${source.sourceName}`.toLowerCase()
  if (text.includes("manufacturer")) return "Manufacturer"
  if (text.includes("supplier") || text.includes("dealer")) return "Dealer"
  if (text.includes("manual") || text.includes("catalog")) return "Catalog"
  return "Other"
}

function parseSpecPlateText(text: string) {
  const source = cleanText(text)
  const read = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const match = source.match(pattern)
      if (match?.[1]) return normaliseIdentifier(match[1])
    }
    return ""
  }

  return {
    brand: read([
      /\b(?:brand|make|manufacturer|mfr)\s*[:#-]?\s*([a-z0-9][a-z0-9\s&.'-]{1,38}?)(?=\s+(?:model|serial|s\/?n|gc|type|no\.?|voltage|power)\b|$)/i,
    ]),
    model: read([
      /\b(?:model|model no\.?|mod\.?|type)\s*[:#-]?\s*([a-z0-9][a-z0-9./_-]{1,28}?)(?=\s+(?:serial|s\/?n|gc|voltage|power|kw|amps?|gas|ce)\b|$)/i,
    ]),
    serialNumber: read([
      /\b(?:serial|serial no\.?|s\/?n|sn)\s*[:#-]?\s*([a-z0-9][a-z0-9./_-]{2,34}?)(?=\s+(?:model|gc|voltage|power|kw|amps?|gas|ce)\b|$)/i,
    ]),
    gcNumber: read([
      /\bgc(?:\s*no\.?)?\s*[:#-]?\s*([0-9][0-9\s.-]{4,20})(?=\s+(?:model|serial|voltage|power|kw|amps?|gas|ce)\b|$)/i,
    ]),
    voltage: read([/\b(2[23]0\s?v|240\s?v|400\s?v|415\s?v)\b/i]),
    currentA: positiveNumber(read([/\b(\d{1,3}(?:\.\d+)?)\s?a(?:mp|mps)?\b/i])),
    phase: /(?:three|3)[-\s]?phase|400\s?v|415\s?v/i.test(source)
      ? 3
      : /(?:single|1)[-\s]?phase|230\s?v|240\s?v/i.test(source)
        ? 1
        : null,
    gasType: read([/\b(natural gas|nat gas|lpg|propane)\b/i]),
  }
}

function numberToCm(raw: string, context: string) {
  const value = Number(raw.replace(",", "."))
  if (!Number.isFinite(value) || value <= 0) return null
  const unitLooksMm = /mm\b/i.test(context) || value > 300
  const cm = unitLooksMm ? value / 10 : value
  return Number(cm.toFixed(1))
}

function parseDimensionGroup(matchText: string, context: string) {
  const numbers = Array.from(matchText.matchAll(/\d+(?:[.,]\d+)?/g)).map((match) =>
    numberToCm(match[0], `${matchText} ${context}`)
  )
  if (numbers.length < 3 || numbers.some((value) => !value)) return null

  const [first, second, third] = numbers as [number, number, number]
  const lower = context.toLowerCase()
  if (/h\s*(?:x|×|by)\s*w\s*(?:x|×|by)\s*d|height\s*width\s*depth/.test(lower)) {
    return { height: first, width: second, depth: third }
  }
  if (/w\s*(?:x|×|by)\s*d\s*(?:x|×|by)\s*h|width\s*depth\s*height/.test(lower)) {
    return { width: first, depth: second, height: third }
  }
  if (/w\s*(?:x|×|by)\s*h\s*(?:x|×|by)\s*d|width\s*height\s*depth/.test(lower)) {
    return { width: first, height: second, depth: third }
  }

  return { width: first, depth: second, height: third }
}

function findDimensions(text: string, packed: boolean) {
  const label = packed
    ? /(?:packed|packaged|shipping|carton|crate|crated)[^.\n]{0,120}/gi
    : /(?:external|overall|product|unit|dimensions?|size)[^.\n]{0,120}/gi
  const dimensionPattern = /(\d+(?:[.,]\d+)?\s*(?:mm|cm)?\s*(?:x|×|by)\s*\d+(?:[.,]\d+)?\s*(?:mm|cm)?\s*(?:x|×|by)\s*\d+(?:[.,]\d+)?\s*(?:mm|cm)?)/i
  let match: RegExpExecArray | null

  while ((match = label.exec(text))) {
    const context = match[0]
    const dimensions = context.match(dimensionPattern)
    if (dimensions?.[1]) return parseDimensionGroup(dimensions[1], context)
  }

  if (!packed) {
    const fallback = text.match(dimensionPattern)
    if (fallback?.[1]) return parseDimensionGroup(fallback[1], fallback[0])
  }

  return null
}

function findWeight(text: string, gross: boolean) {
  const labels = gross
    ? [/\b(?:gross|packed|shipping|packaged|crated)\s*weight[^0-9]{0,32}(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)?/i]
    : [/\b(?:net\s*)?weight[^0-9]{0,32}(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)?/i]

  for (const pattern of labels) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const value = Number(match[1].replace(",", "."))
      if (!Number.isFinite(value) || value <= 0) return null
      const unit = (match[2] || "kg").toLowerCase()
      return Number((unit.startsWith("lb") ? value * 0.453592 : value).toFixed(1))
    }
  }

  return null
}

function parsedSpecsFromText(text: string): ParsedSpecs {
  const external = findDimensions(text, false)
  const packed = findDimensions(text, true)
  const voltage = text.match(/\b(2[23]0\s?v|240\s?v|400\s?v|415\s?v)\b/i)?.[1]?.replace(/\s+/g, " ") || null
  const current = text.match(/\b(\d{1,3}(?:[.,]\d+)?)\s?a(?:mp|mps)?\b/i)?.[1] || null
  const gasConnection = text.match(/\b(\d\/\d\s*(?:inch|in|")?\s*bsp|[0-9.]+\s*mm\s*gas\s*connection)\b/i)?.[1] || null

  return {
    ext_height_cm: external?.height || null,
    ext_width_cm: external?.width || null,
    ext_depth_cm: external?.depth || null,
    pack_height_cm: packed?.height || null,
    pack_width_cm: packed?.width || null,
    pack_depth_cm: packed?.depth || null,
    weight_net_kg: findWeight(text, false),
    weight_gross_kg: findWeight(text, true),
    voltage,
    phase: /(?:three|3)[-\s]?phase|400\s?v|415\s?v/i.test(text)
      ? 3
      : /(?:single|1)[-\s]?phase|230\s?v|240\s?v/i.test(text)
        ? 1
        : null,
    current_a: current ? Number(current.replace(",", ".")) : null,
    gas_type: text.match(/\b(natural gas|nat gas|lpg|propane)\b/i)?.[1] || null,
    gas_connection: gasConnection,
    hazardous_notes: /\b(r290|r600a|refrigerant|co2|flammable)\b/i.test(text)
      ? "Check refrigerant or hazardous handling requirements before transport."
      : null,
    lifting_notes: /\b(forklift|pallet jack|lifting|tail lift|pallet)\b/i.test(text)
      ? "Mechanical handling may be required."
      : null,
    disassembly_notes: /\b(remove|removable|legs|shelves|doors)\b/i.test(text)
      ? "Check removable parts before transport."
      : null,
  }
}

function parsedSpecsFromValidation(source: CaterBotSourceValidationResult | null): ParsedSpecs {
  if (!source) return {}
  const text = [
    source.extractedSpecs.dimensions && `Dimensions ${source.extractedSpecs.dimensions}`,
    source.extractedSpecs.weight && `Weight ${source.extractedSpecs.weight}`,
    source.extractedSpecs.voltage,
    source.extractedSpecs.phase,
    source.extractedSpecs.amps,
    source.extractedSpecs.gasType,
  ]
    .filter(Boolean)
    .join(" ")
  return parsedSpecsFromText(text)
}

function mergeSpecs(...items: ParsedSpecs[]) {
  return items.reduce<ParsedSpecs>((merged, item) => {
    for (const [key, value] of Object.entries(item) as Array<[keyof ParsedSpecs, ParsedSpecs[keyof ParsedSpecs]]>) {
      if (merged[key] == null && value != null && value !== "") {
        ;(merged as Record<string, unknown>)[key] = value
      }
    }
    return merged
  }, {})
}

function sourceConfidence(source: CaterBotSourceValidationResult | null, sourceType: SourceType, specs: ParsedSpecs) {
  let score = source ? 48 : 28
  if (sourceType === "Manufacturer") score += 30
  if (sourceType === "Dealer") score += 20
  if (sourceType === "Catalog") score += 14
  if (source?.confidence === "high") score += 10
  if (source?.confidence === "medium") score += 5
  if (specs.ext_height_cm && specs.ext_width_cm && specs.ext_depth_cm) score += 6
  if (specs.weight_net_kg || specs.weight_gross_kg) score += 5
  if (specs.voltage || specs.phase || specs.current_a || specs.gas_type) score += 4
  return clamp(score, 0, 100)
}

function differsSignificantly(sellerValue: number | null, extractedValue: number | null, percent = 0.12) {
  if (!sellerValue || !extractedValue) return false
  const delta = Math.abs(sellerValue - extractedValue)
  return delta > Math.max(5, extractedValue * percent)
}

function conflictNotes(input: EquipmentSpecPipelineInput, specs: ParsedSpecs) {
  const notes: string[] = []
  const sellerHeight = positiveNumber(input.heightCm)
  const sellerWidth = positiveNumber(input.widthCm)
  const sellerDepth = positiveNumber(input.depthCm)
  const sellerWeight = positiveNumber(input.weightKg)

  if (differsSignificantly(sellerHeight, specs.ext_height_cm || null)) notes.push("seller height differs from source")
  if (differsSignificantly(sellerWidth, specs.ext_width_cm || null)) notes.push("seller width differs from source")
  if (differsSignificantly(sellerDepth, specs.ext_depth_cm || null)) notes.push("seller depth differs from source")
  if (differsSignificantly(sellerWeight, specs.weight_net_kg || specs.weight_gross_kg || null, 0.15)) {
    notes.push("seller weight differs from source")
  }

  return notes
}

function palletRequired(input: EquipmentSpecPipelineInput, specs: ParsedSpecs) {
  const weight = specs.weight_gross_kg || specs.weight_net_kg || positiveNumber(input.weightKg) || 0
  return Boolean(input.forkliftRequired || weight >= 150)
}

function trustedSourceName(brand: string, model: string, source: CaterBotSourceValidationResult | null) {
  if (source?.sourceName) return source.sourceName
  const host = hostnameFromUrl(source?.url)
  return host ? `${brand} ${model} spec source (${host})` : `${brand} ${model} seller-entered shipping specs`
}

function searchTextFor(input: EquipmentSpecPipelineInput) {
  return [input.category, input.listingTitle, input.powerType, input.conditionNotes].filter(Boolean).join(" ")
}

export async function runEquipmentSpecPipeline(
  supabase: SupabaseClient<Database>,
  input: EquipmentSpecPipelineInput
) {
  const parsedPlate = parseSpecPlateText(input.ocrText || "")
  const brand = normaliseIdentifier(input.brand) || parsedPlate.brand
  const model = normaliseIdentifier(input.model) || parsedPlate.model || normaliseIdentifier(input.gcNumber) || parsedPlate.gcNumber
  const category = cleanText(input.category) || "Catering Equipment"

  if (!input.listingId || !input.sellerId || !brand || !model) {
    throw new Error("Brand, model and listing details are required before specs can be verified.")
  }

  const candidateUrls = [input.sourceUrl].filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url)))
  const source = await findValidatedCaterBotSource({
    brand,
    model,
    serial: input.serialNumber,
    equipmentType: searchTextFor(input) || category,
    fuelType: input.gasType || input.powerType,
    voltage: input.voltage,
    phase: input.phase,
    amps: input.currentA,
    powerRating: input.powerType,
    candidateUrls,
  })
  const sourceType = sourceTypeFromValidation(source)
  const specsFromSource = parsedSpecsFromValidation(source)
  const sellerSpecs: ParsedSpecs = {
    ext_height_cm: positiveNumber(input.heightCm),
    ext_width_cm: positiveNumber(input.widthCm),
    ext_depth_cm: positiveNumber(input.depthCm),
    weight_net_kg: positiveNumber(input.weightKg),
    voltage: cleanText(input.voltage) || parsedPlate.voltage || null,
    phase: positiveNumber(input.phase) || parsedPlate.phase || null,
    current_a: positiveNumber(input.currentA) || parsedPlate.currentA || null,
    gas_type: cleanText(input.gasType) || parsedPlate.gasType || null,
    gas_connection: cleanText(input.gasConnection) || null,
  }
  const specs = mergeSpecs(specsFromSource, sellerSpecs)
  const confidence = sourceConfidence(source, sourceType, specs)
  const conflicts = conflictNotes(input, specsFromSource)
  const verificationStatus: VerificationStatus = conflicts.length
    ? "conflicting"
    : source && confidence >= 70
      ? "verified"
      : source
        ? "needs_review"
        : "unverified"
  const checkedAt = dateOnly()
  const sourceUrl = source?.url || candidateUrls[0] || null
  const sourceName = trustedSourceName(brand, model, source)
  const canonicalPayload = {
    brand,
    model,
    category,
    ...specs,
    pallet_required: palletRequired(input, specs),
    power_type: cleanText(input.powerType) || null,
    lifting_notes: specs.lifting_notes || (input.forkliftRequired ? "Seller marked forklift or pallet jack required." : null),
    disassembly_notes: specs.disassembly_notes || cleanText(input.conditionNotes) || null,
    hazardous_notes: specs.hazardous_notes || null,
    source_url: sourceUrl,
    source_name: sourceName,
    source_type: sourceType,
    confidence,
    last_checked: checkedAt,
    updated_at: new Date().toISOString(),
  }

  if (sourceUrl) {
    const domain = hostnameFromUrl(sourceUrl)
    if (domain) {
      await supabase.from("Sources").upsert(
        {
          domain,
          source_name: sourceName,
          source_type: sourceType,
          default_trust:
            sourceType === "Manufacturer" ? 90 : sourceType === "Dealer" ? 72 : sourceType === "Catalog" ? 62 : 45,
          last_checked: checkedAt,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "domain" }
      )
    }
  }

  const { data: existingSpec, error: existingError } = await supabase
    .from("EquipmentSpecs")
    .select("*")
    .ilike("brand", brand)
    .ilike("model", model)
    .maybeSingle()

  if (existingError) throw existingError

  let equipmentSpecId = existingSpec?.id || ""
  const shouldUpdateExisting =
    existingSpec &&
    (confidence > Number(existingSpec.confidence || 0) || isOlderThanSixMonths(existingSpec.last_checked))

  if (!existingSpec) {
    const { data, error } = await supabase
      .from("EquipmentSpecs")
      .insert(canonicalPayload as any)
      .select("id")
      .single()
    if (error) throw error
    equipmentSpecId = data.id
  } else if (shouldUpdateExisting) {
    const { data, error } = await supabase
      .from("EquipmentSpecs")
      .update(canonicalPayload as any)
      .eq("id", existingSpec.id)
      .select("id")
      .single()
    if (error) throw error
    equipmentSpecId = data.id
  }

  const moderationNotes =
    conflicts.length > 0
      ? `Manual review required: ${conflicts.join(", ")}.`
      : verificationStatus === "verified"
        ? "Specs matched a trusted source."
        : source
          ? "Specs need a quick manual review before they are treated as verified."
          : "No trusted source was found yet."

  const linkPayload = {
    listing_id: input.listingId,
    equipment_spec_id: equipmentSpecId || null,
    seller_id: input.sellerId,
    brand,
    model,
    serial_number: normaliseIdentifier(input.serialNumber) || parsedPlate.serialNumber || null,
    gc_number: normaliseIdentifier(input.gcNumber) || parsedPlate.gcNumber || null,
    category,
    spec_plate_image_url: input.specPlateImageUrl || null,
    ocr_text: input.ocrText || null,
    seller_height_cm: positiveNumber(input.heightCm),
    seller_width_cm: positiveNumber(input.widthCm),
    seller_depth_cm: positiveNumber(input.depthCm),
    seller_weight_kg: positiveNumber(input.weightKg),
    seller_forklift_required: Boolean(input.forkliftRequired),
    seller_condition_notes: cleanText(input.conditionNotes) || null,
    power_type: cleanText(input.powerType) || null,
    voltage: specs.voltage || null,
    phase: specs.phase || null,
    current_a: specs.current_a || null,
    gas_type: specs.gas_type || null,
    gas_connection: specs.gas_connection || null,
    source_url: sourceUrl,
    source_name: sourceName,
    source_type: sourceType,
    confidence,
    verification_status: verificationStatus,
    moderation_notes: moderationNotes,
    conflict_details: conflicts.length ? conflicts.join("; ") : null,
    last_checked: checkedAt,
    updated_at: new Date().toISOString(),
  }

  const { error: linkError } = await supabase
    .from("listing_equipment_specs")
    .upsert(linkPayload as any, { onConflict: "listing_id" })
  if (linkError) throw linkError

  await supabase
    .from("listings")
    .update({
      equipment_spec_id: equipmentSpecId || null,
      spec_plate_image_url: input.specPlateImageUrl || null,
      spec_plate_ocr_text: input.ocrText || null,
      spec_brand: brand,
      spec_model: model,
      spec_serial_number: normaliseIdentifier(input.serialNumber) || parsedPlate.serialNumber || null,
      spec_gc_number: normaliseIdentifier(input.gcNumber) || parsedPlate.gcNumber || null,
      spec_moderation_status: verificationStatus,
      spec_moderation_notes: moderationNotes,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", input.listingId)

  if (equipmentSpecId) {
    await supabase.from("equipment_spec_jobs").insert({
      listing_id: input.listingId,
      equipment_spec_id: equipmentSpecId,
      job_type: "six_month_recheck",
      status: "queued",
      run_after: sixMonthsFromNow(),
    } as any)
  }

  return {
    equipmentSpecId,
    verificationStatus,
    confidence,
    sourceUrl,
    sourceName,
    sourceType,
    moderationNotes,
  }
}
