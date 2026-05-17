import {
  buildCaterBotSourceQueries,
  buildModelSearchVariants,
  manufacturerDomainForBrand,
  searchCaterBotSources,
} from "@/lib/caterbot/webSearch"

export type CaterBotSourceValidationInput = {
  url: string
  brand?: string | null
  model?: string | null
  equipmentType?: string | null
  fuelType?: string | null
  candidateTitle?: string | null
  candidateSnippet?: string | null
}

export type CaterBotSourceValidationResult = {
  valid: boolean
  url: string
  sourceName: string
  sourceType: string
  confidence: "high" | "medium" | "low"
  score: number
  sourceTitle: string
  sourceDomain: string
  confidenceScore: number
  matchedFields: string[]
  sourcePriorityRank: number
  checkedAt: string
  matchNotes: string
  usefulDetails: string[]
  extractedSpecs: {
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
}

const NEEDS_SELLER_CHECK = "Needs seller check"

const TRUSTED_SOURCE_HINTS = [
  "lincat",
  "rational",
  "blue-seal",
  "bluestar",
  "falcon",
  "hobart",
  "foster",
  "polar",
  "true",
  "gram",
  "winterhalter",
  "manitowoc",
  "manualslib",
  "manuals",
  "caterkwik",
  "nisbets",
  "caterboss",
  "ukcateringequipment",
  "cateringequipment",
]

const MANUALSLIB_BASE_URL = "https://www.manualslib.com"

function isManualsLibUrl(url: string) {
  return getHostname(url).endsWith("manualslib.com")
}

// Source priority order for CaterBot launch:
// 1. Catering Appliance user manuals
// 2. ManualsLib
// 3. Official manufacturer site
// 4-7. Trusted UK catering suppliers
// 8. General web results
export function sourcePriorityRank(url: string, brand?: string | null) {
  const lowerUrl = url.toLowerCase()
  const host = getHostname(url)
  const manufacturerDomain = manufacturerDomainForBrand(brand || "")

  if (host.endsWith("catering-appliance.com")) return 1
  if (host.endsWith("manualslib.com")) return 2
  if (manufacturerDomain && host.endsWith(manufacturerDomain)) return 3
  if (host.endsWith("nisbets.co.uk")) return 4
  if (host.endsWith("caterkwik.co.uk")) return 5
  if (host.endsWith("cs-catering-equipment.co.uk")) return 6
  if (host.endsWith("allianceonline.co.uk")) return 7
  if (isManufacturerHost(host)) return 3
  if (lowerUrl.includes(".pdf") || lowerUrl.includes("/manual") || lowerUrl.includes("spec")) return 8

  return 8
}

function sourcePriority(url: string, brand?: string | null) {
  return sourcePriorityRank(url, brand)
}

function isManufacturerHost(host: string) {
  return [
    "lincat",
    "rational",
    "falconfoodservice",
    "hobart",
    "fosterrefrigerator",
    "winterhalter",
    "blue-seal",
    "electroluxprofessional",
    "true-mfg",
    "gram-commercial",
    "imperialrange",
  ].some((domain) => host.includes(domain))
}

function isTrustedSupplierOrManualHost(host: string) {
  return [
    "catering-appliance",
    "manualslib",
    "nisbets",
    "caterkwik",
    "caterboss",
    "ukcateringequipment",
    "cateringequipment",
    "lockhart",
  ].some((domain) => host.includes(domain))
}

function clean(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function compactModel(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function hasLettersAndDigits(value: string) {
  return /[a-z]/i.test(value) && /\d/.test(value)
}

function hasPlateIdentifierShape(value: string) {
  const compactValue = compactModel(value)
  return hasLettersAndDigits(compactValue) || /^\d{5,}$/.test(compactValue)
}

function addUnique(values: string[], value: string) {
  if (!values.includes(value)) values.push(value)
}

function modelSearchTerms(model: string | null | undefined) {
  const raw = String(model || "").trim()
  if (!raw) return []

  const terms: string[] = []
  const add = (value: string) => {
    const cleaned = value.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    if (cleaned && hasPlateIdentifierShape(cleaned)) addUnique(terms, cleaned)
  }

  buildModelSearchVariants(raw).forEach(add)

  return terms.slice(0, 4)
}

function modelMatchAliases(model: string | null | undefined) {
  return modelSearchTerms(model)
    .map((term) => compactModel(term))
    .filter((term) => term.length >= 4 && hasPlateIdentifierShape(term))
}

function modelMatchGroups(model: string | null | undefined) {
  const raw = String(model || "").trim()
  const compactRaw = compactModel(raw)
  const variants = buildModelSearchVariants(raw)
    .map((term) => compactModel(term))
    .filter((term) => term.length >= 4 && hasPlateIdentifierShape(term))

  const exactAliases = variants.filter((term) => term === compactRaw || compactRaw.includes(term) && term.length >= compactRaw.length - 1)
  const closeAliases = variants.filter((term) => !exactAliases.includes(term))

  return {
    exactAliases: exactAliases.length > 0 ? exactAliases : compactRaw ? [compactRaw] : [],
    closeAliases,
  }
}

function normaliseManualLookupBrand(brand: string) {
  const cleaned = brand
    .replace(/\b(commercial\s+)?catering\s+equipment\b/gi, " ")
    .replace(/\b(commercial\s+)?kitchen\s+equipment\b/gi, " ")
    .replace(/\bequipment\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  return cleaned.length >= 3 ? cleaned : ""
}

function manualsLibBrandSlug(brand: string) {
  return clean(normaliseManualLookupBrand(brand)).replace(/\s+/g, "-")
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function sourceTypeFor(url: string) {
  const host = getHostname(url)
  const lowerUrl = url.toLowerCase()

  if (host.includes("manualslib")) {
    return lowerUrl.includes("/manual/") ? "ManualsLib manual page" : "ManualsLib source"
  }
  if (lowerUrl.endsWith(".pdf") || lowerUrl.includes(".pdf?")) return "PDF manual / spec sheet"
  if (host.includes("manual")) return "Manual page"
  if (TRUSTED_SOURCE_HINTS.some((hint) => host.includes(hint))) {
    return host.includes("lincat") ||
      host.includes("rational") ||
      host.includes("hobart") ||
      host.includes("imperialrange") ||
      host.includes("falconfoodservice")
      ? "Manufacturer source"
      : "Supplier / manual source"
  }

  return "Product source"
}

function sourceNameFor(url: string, brand: string, model: string) {
  const host = getHostname(url)
  const label = [brand, model].filter(Boolean).join(" ")
  if (host.includes("manualslib")) {
    return label ? `${label} ManualsLib manual` : "ManualsLib manual"
  }
  return label ? `${label} verified manual/spec source (${host})` : `Verified manual/spec source (${host})`
}

function usefulDetailsFrom(text: string) {
  const checks: Array<[RegExp, string]> = [
    [/\b(dimensions?|width|height|depth|w x d x h|wxdxh)\b/i, "Dimensions"],
    [/\b(weight|kg)\b/i, "Weight"],
    [/\b(voltage|230v|240v|400v|415v)\b/i, "Voltage"],
    [/\b(phase|single phase|three phase|3 phase)\b/i, "Phase"],
    [/\b(amps?|ampere|13a|16a|32a)\b/i, "Amps"],
    [/\b(kw|kilowatt|wattage|power rating)\b/i, "Power rating"],
    [/\b(natural gas|lpg|propane|gas rating)\b/i, "Gas type / rating"],
    [/\b(capacity|litres|trays?|shelves)\b/i, "Capacity"],
    [/\b(installation|clearance|ventilation|commission)\b/i, "Installation notes"],
    [/\b(safety|warning|caution|ce|ukca)\b/i, "Safety notes"],
    [/\b(pallet|delivery|handling|transport|lift)\b/i, "Delivery handling notes"],
  ]

  return checks.filter(([pattern]) => pattern.test(text)).map(([, label]) => label)
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].replace(/\s+/g, " ").trim()
  }
  return ""
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function labelPattern(label: string) {
  return label
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s+")
}

function compactNumber(value: string | number | null | undefined) {
  const parsed = Number(String(value || "").replace(/,/g, ""))
  if (!Number.isFinite(parsed)) return ""
  return Number(parsed.toFixed(2)).toString()
}

function normaliseUnit(value: string | null | undefined) {
  const unit = String(value || "").toLowerCase()
  if (/\b(mil|mm|millimet)/.test(unit)) return "mm"
  if (/\b(cm|centimet)/.test(unit)) return "cm"
  if (/\b(kg|kilogram)/.test(unit)) return "kg"
  if (/\b(v|volt)/.test(unit)) return "V"
  if (/\b(kw|kilowatt)/.test(unit)) return "kW"
  if (/\b(w|watts?)/.test(unit)) return "W"
  return ""
}

function numberAfterLabel(text: string, labels: string[]) {
  const normalised = text.replace(/\s+/g, " ")

  for (const label of labels) {
    const pattern = new RegExp(
      `\\b${labelPattern(label)}\\b\\s*(?:\\(([^)]{0,40})\\))?\\s*[:\\-–—]?\\s*(\\d{1,6}(?:[,.]\\d+)?)\\s*([a-zA-Z/%]+)?`,
      "i"
    )
    const match = normalised.match(pattern)
    if (!match) continue

    return {
      value: compactNumber(match[2]),
      unit: normaliseUnit(match[3] || match[1]),
    }
  }

  return null
}

function formatMeasurement(measurement: ReturnType<typeof numberAfterLabel>, fallbackUnit: "mm" | "cm" | "kg" | "kW" | "W" | "V") {
  if (!measurement?.value) return ""
  return `${measurement.value} ${measurement.unit || fallbackUnit}`
}

function dimensionsFromLabeledFields(
  width: ReturnType<typeof numberAfterLabel>,
  depth: ReturnType<typeof numberAfterLabel>,
  height: ReturnType<typeof numberAfterLabel>,
  fallbackUnit: "mm" | "cm"
) {
  if (!width?.value || !depth?.value || !height?.value) return ""
  const unit = width.unit || depth.unit || height.unit || fallbackUnit
  return `${width.value} x ${depth.value} x ${height.value} ${unit}`
}

function textAfterLabelUntilNext(text: string, label: string, nextLabels: string[]) {
  const normalised = text.replace(/\s+/g, " ")
  const nextPattern = nextLabels.map(labelPattern).join("|")
  const pattern = new RegExp(
    `\\b${labelPattern(label)}\\b\\s*(?:\\([^)]{0,40}\\))?\\s*[:\\-–—]?\\s*([A-Za-z0-9=.,;\\s/+\\-]{1,100}?)(?=\\s*(?:${nextPattern})\\b|$)`,
    "i"
  )
  const match = normalised.match(pattern)
  return match?.[1]?.replace(/\s+/g, " ").trim() || ""
}

function phaseFromLabel(text: string) {
  const value = textAfterLabelUntilNext(text, "Electrical Phase", [
    "Electrical Amps",
    "Electrical Voltage",
    "Ship Weight",
    "Product Height",
  ])

  if (/three|3/i.test(value)) return "Three phase"
  if (/single|one|1/i.test(value)) return "Single phase"
  return ""
}

function ampsFromLabel(text: string) {
  return textAfterLabelUntilNext(text, "Electrical Amps", [
    "Electrical Voltage",
    "Ship Weight",
    "Ship Height",
    "Product Height",
  ])
}

function kilowattsFromLabels(text: string) {
  const kw = numberAfterLabel(text, ["Kilowatts", "kW rating", "Power rating"])
  if (kw?.value) return `${kw.value} kW`

  const watts = numberAfterLabel(text, ["Electrical Watts", "Watts", "Wattage"])
  const wattValue = Number(watts?.value || "")
  if (Number.isFinite(wattValue) && wattValue > 0) {
    return wattValue >= 1000 ? `${Number((wattValue / 1000).toFixed(2))} kW` : `${wattValue} W`
  }

  return ""
}

function extractedSpecsFrom(text: string): CaterBotSourceValidationResult["extractedSpecs"] {
  const productWidth = numberAfterLabel(text, ["Product Width", "Width"])
  const productDepth = numberAfterLabel(text, ["Product Depth", "Depth"])
  const productHeight = numberAfterLabel(text, ["Product Height", "Height"])
  const shipWidth = numberAfterLabel(text, ["Ship Width", "Shipping Width", "Packed Width"])
  const shipDepth = numberAfterLabel(text, ["Ship Depth", "Shipping Depth", "Packed Depth"])
  const shipHeight = numberAfterLabel(text, ["Ship Height", "Shipping Height", "Packed Height"])
  const productWeight = numberAfterLabel(text, ["Product Weight", "Net Weight", "Weight"])
  const shipWeight = numberAfterLabel(text, ["Ship Weight", "Shipping Weight", "Packed Weight", "Gross Weight"])

  return {
    dimensions: dimensionsFromLabeledFields(productWidth, productDepth, productHeight, "mm") || firstMatch(text, [
      /\b(?:dimensions?|size|w\s?x\s?d\s?x\s?h)[^\d]{0,24}(\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?)/i,
      /\b(\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?)\b/i,
    ]),
    packedDimensions: dimensionsFromLabeledFields(shipWidth, shipDepth, shipHeight, "cm"),
    weight: formatMeasurement(productWeight, "kg") ||
      firstMatch(text, [/\b(?:weight|net weight|product weight)[^\d]{0,40}(\d{1,4}(?:\.\d+)?\s?kg)\b/i]),
    grossWeight: formatMeasurement(shipWeight, "kg") ||
      firstMatch(text, [/\b(?:gross weight|ship weight|shipping weight|packed weight)[^\d]{0,40}(\d{1,4}(?:\.\d+)?\s?kg)\b/i]),
    voltage: formatMeasurement(numberAfterLabel(text, ["Electrical Voltage", "Voltage"]), "V") ||
      firstMatch(text, [/\b(2[23]0v|240v|400v|415v)\b/i]),
    phase: phaseFromLabel(text) || firstMatch(text, [/\b(single phase|three phase|3 phase|1 phase|3-phase|1-phase)\b/i]),
    amps: ampsFromLabel(text) || firstMatch(text, [/\b(\d{1,3}(?:\.\d+)?\s?a(?:mp|mps)?)\b/i]),
    kwRating: kilowattsFromLabels(text) || firstMatch(text, [/\b(\d{1,3}(?:\.\d+)?\s?kW)\b/i]),
    gasType: firstMatch(text, [/\b(natural gas|lpg|propane)\b/i]),
    capacity: firstMatch(text, [/\b(?:capacity)[^\d]{0,24}(\d{1,4}(?:\.\d+)?\s?(?:litres?|ltr|trays?|kg))\b/i]),
  }
}

function specsWithSellerCheckFallback(
  specs: CaterBotSourceValidationResult["extractedSpecs"]
): CaterBotSourceValidationResult["extractedSpecs"] {
  return {
    dimensions: specs.dimensions || NEEDS_SELLER_CHECK,
    packedDimensions: specs.packedDimensions || NEEDS_SELLER_CHECK,
    weight: specs.weight || NEEDS_SELLER_CHECK,
    grossWeight: specs.grossWeight || NEEDS_SELLER_CHECK,
    voltage: specs.voltage || NEEDS_SELLER_CHECK,
    phase: specs.phase || NEEDS_SELLER_CHECK,
    amps: specs.amps || NEEDS_SELLER_CHECK,
    kwRating: specs.kwRating || NEEDS_SELLER_CHECK,
    gasType: specs.gasType || NEEDS_SELLER_CHECK,
    capacity: specs.capacity || NEEDS_SELLER_CHECK,
  }
}

function scoreCaterBotSource({
  url,
  titleText,
  brandMatches,
  exactModelMatches,
  closeModelMatches,
  equipmentMatches,
  fuelMatches,
  usefulDetails,
  extractedSpecs,
}: {
  url: string
  titleText: string
  brandMatches: boolean
  exactModelMatches: boolean
  closeModelMatches: boolean
  equipmentMatches: boolean
  fuelMatches: boolean
  usefulDetails: string[]
  extractedSpecs: CaterBotSourceValidationResult["extractedSpecs"]
}) {
  const host = getHostname(url)
  const combinedTitleUrl = `${titleText} ${url}`.toLowerCase()
  let score = 0

  if (exactModelMatches) score += 50
  else if (closeModelMatches) score += 30
  if (brandMatches) score += 30
  if (/\b(pdf|manual|spec|datasheet|data sheet|product data|installation|parts)\b/i.test(combinedTitleUrl)) {
    score += 20
  }
  if (isManufacturerHost(host)) score += 25
  else if (isTrustedSupplierOrManualHost(host)) score += 15
  if (equipmentMatches) score += 10
  if (fuelMatches) score += 10
  if (extractedSpecs.dimensions || usefulDetails.some((detail) => /dimensions/i.test(detail))) score += 20
  if (extractedSpecs.weight || usefulDetails.some((detail) => /weight/i.test(detail))) score += 20
  if (
    extractedSpecs.voltage ||
    extractedSpecs.phase ||
    extractedSpecs.amps ||
    extractedSpecs.kwRating ||
    extractedSpecs.gasType ||
    usefulDetails.some((detail) => /voltage|phase|amps|power|gas/i.test(detail))
  ) {
    score += 10
  }
  if (extractedSpecs.gasType || usefulDetails.some((detail) => /gas/i.test(detail))) score += 10
  if (usefulDetails.some((detail) => /installation|delivery handling/i.test(detail))) score += 10

  return score
}

function confidenceFromScore(score: number): "high" | "medium" | "low" {
  if (score >= 115) return "high"
  if (score >= 85) return "medium"
  return "low"
}

function sourceMatchesEquipment(text: string, equipmentType: string | null | undefined) {
  const equipmentText = clean(equipmentType)
  if (!equipmentText) return true

  if (/\b(griddle|plancha|clam)\b/.test(equipmentText)) return /\b(griddle|grill)\b/.test(text)
  if (/\b(chargrill|charbroiler|grill|salamander|broiler)\b/.test(equipmentText)) {
    return /\b(grill|griddle|broiler|salamander)\b/.test(text)
  }
  if (/\b(fryer|chip fryer|deep fryer)\b/.test(equipmentText)) return /\bfryer\b/.test(text)
  if (/\b(oven|combi|range|roast|roasting|pizza)\b/.test(equipmentText)) {
    return /\b(oven|combi|range|pizza)\b/.test(text)
  }
  if (/\b(dishwasher|glasswasher|warewasher|washer)\b/.test(equipmentText)) {
    return /\b(dishwasher|glasswasher|warewasher|washer)\b/.test(text)
  }
  if (/\b(fridge|refrigerator|refrigeration|chiller|cooler)\b/.test(equipmentText)) {
    return /\b(fridge|refrigerator|refrigeration|chiller|cooler)\b/.test(text)
  }
  if (/\b(freezer|blast freezer)\b/.test(equipmentText)) return /\bfreezer\b/.test(text)

  return true
}

function sourceMatchesFuel(text: string, fuelType: string | null | undefined) {
  const fuelText = clean(fuelType)
  if (!fuelText || /not sure|unknown/.test(fuelText)) return { matches: true, explicit: false }

  const sourceMentionsGas = /\b(natural gas|nat gas|gas|lpg|propane)\b/.test(text)
  const sourceMentionsLpg = /\b(lpg|propane)\b/.test(text)
  const sourceMentionsNaturalGas = /\b(natural gas|nat gas)\b/.test(text)
  const sourceMentionsElectric = /\b(electric|electrical|230v|240v|400v|415v|single phase|three phase)\b/.test(text)

  if (/\bnatural\s+gas\b/.test(fuelText)) {
    if (sourceMentionsLpg && !sourceMentionsNaturalGas) return { matches: false, explicit: true }
    return { matches: !sourceMentionsGas || sourceMentionsNaturalGas || /\bgas\b/.test(text), explicit: sourceMentionsGas }
  }
  if (/\blpg|propane\b/.test(fuelText)) {
    if (sourceMentionsNaturalGas && !sourceMentionsLpg) return { matches: false, explicit: true }
    return { matches: !sourceMentionsGas || sourceMentionsLpg, explicit: sourceMentionsGas }
  }
  if (/\bgas\b/.test(fuelText)) {
    if (sourceMentionsElectric && !sourceMentionsGas) return { matches: false, explicit: true }
    return { matches: !sourceMentionsElectric || sourceMentionsGas, explicit: sourceMentionsGas || sourceMentionsElectric }
  }
  if (/\belectric\b/.test(fuelText)) {
    if (sourceMentionsGas && !sourceMentionsElectric) return { matches: false, explicit: true }
    return { matches: !sourceMentionsGas || sourceMentionsElectric, explicit: sourceMentionsGas || sourceMentionsElectric }
  }

  return { matches: true, explicit: false }
}

function matchedFieldsFor({
  brandMatches,
  exactModelMatches,
  closeModelMatches,
  equipmentMatches,
  fuelMatches,
  fuelWasExplicit,
  usefulDetails,
  priorityRank,
}: {
  brandMatches: boolean
  exactModelMatches: boolean
  closeModelMatches: boolean
  equipmentMatches: boolean
  fuelMatches: boolean
  fuelWasExplicit: boolean
  usefulDetails: string[]
  priorityRank: number
}) {
  const fields: string[] = []
  if (brandMatches) fields.push("brand")
  if (exactModelMatches) fields.push("exact_model")
  else if (closeModelMatches) fields.push("model_family")
  if (equipmentMatches) fields.push("equipment_type")
  if (fuelMatches && fuelWasExplicit) fields.push("fuel_type")
  if (priorityRank <= 7) fields.push("trusted_source")
  if (usefulDetails.some((detail) => /dimension/i.test(detail))) fields.push("dimensions")
  if (usefulDetails.some((detail) => /weight/i.test(detail))) fields.push("weight")
  if (usefulDetails.some((detail) => /voltage|phase|amps|power|gas/i.test(detail))) fields.push("power_or_gas")
  return fields
}

function isGenericOrBadUrl(url: string) {
  const lower = url.toLowerCase()
  if (!/^https?:\/\//i.test(url)) return true
  if (lower.includes("google.com/search")) return true
  if (lower.includes("bing.com/search")) return true
  if (lower.includes("duckduckgo.com")) return true
  if (lower.includes("manualslib.com/index.php?action=search")) return true
  if (lower.includes("facebook.com")) return true
  if (lower.includes("instagram.com")) return true

  try {
    const parsed = new URL(url)
    const path = parsed.pathname.replace(/\/+$/, "")
    return path === "" || path === "/"
  } catch {
    return true
  }
}

function manualsLibCategorySlugs(equipmentType: string | null | undefined) {
  const text = clean(equipmentType)
  const slugs: string[] = []
  const add = (slug: string) => addUnique(slugs, slug)

  if (/\b(griddle|plancha|clam)\b/.test(text)) {
    add("griddle")
    add("grill")
  }
  if (/\b(chargrill|charbroiler|grill|salamander|broiler)\b/.test(text)) add("grill")
  if (/\b(fryer|chip fryer|deep fryer)\b/.test(text)) add("fryer")
  if (/\b(oven|combi|range|roast|roasting|pizza)\b/.test(text)) add("oven")
  if (/\b(boiler|water boiler|urn)\b/.test(text)) add("boiler")
  if (/\b(toaster|conveyor toaster)\b/.test(text)) add("toaster")
  if (/\b(waffle)\b/.test(text)) add("waffle-maker")
  if (/\b(coffee|espresso|grinder)\b/.test(text)) add("coffee-maker")
  if (/\b(dishwasher|glasswasher|warewasher|washer)\b/.test(text)) add("dishwasher")
  if (/\b(fridge|refrigerator|refrigeration|chiller|cooler)\b/.test(text)) add("refrigerator")
  if (/\b(freezer|blast freezer)\b/.test(text)) add("freezer")
  if (/\b(ice maker|ice machine)\b/.test(text)) add("ice-maker")
  if (/\b(food warmer|hot cupboard|hotplate|bain marie|heated)\b/.test(text)) add("food-warmer")
  if (/\b(mixer|planetary mixer)\b/.test(text)) add("mixer")
  if (/\b(slicer|processor|prep|preparation)\b/.test(text)) add("food-processor")

  add("commercial-food-equipment")

  return slugs.slice(0, 6)
}

function manualsLibBrandPageUrls(brand: string, equipmentType: string | null | undefined) {
  const brandSlug = manualsLibBrandSlug(brand)
  if (!brandSlug) return []

  const pages = manualsLibCategorySlugs(equipmentType).map(
    (categorySlug) => `${MANUALSLIB_BASE_URL}/brand/${brandSlug}/${categorySlug}.html`
  )
  addUnique(pages, `${MANUALSLIB_BASE_URL}/brand/${brandSlug}/`)

  return pages
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
}

function plainTextFromHtml(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
}

function extractManualsLibManualUrls(html: string, pageUrl: string, model: string) {
  const modelAliases = modelMatchAliases(model)
  if (modelAliases.length === 0) return []

  const urls = new Set<string>()
  const hrefPattern = /\bhref\s*=\s*(["'])(.*?)\1/gi
  let match: RegExpExecArray | null

  while ((match = hrefPattern.exec(html)) && urls.size < 12) {
    const rawHref = decodeHtml(match[2] || "")
    if (!rawHref.includes("/manual/")) continue

    const contextStart = Math.max(0, match.index - 900)
    const contextEnd = Math.min(html.length, match.index + rawHref.length + 900)
    const contextText = plainTextFromHtml(html.slice(contextStart, contextEnd))
    const compactHref = compactModel(rawHref)
    const compactContext = compactModel(contextText)
    const hrefMatchesModel = modelAliases.some((modelText) => compactHref.includes(modelText))
    const rowMatchesModel = modelAliases.some((modelText) => compactContext.includes(modelText))

    if (!hrefMatchesModel && !rowMatchesModel) continue

    try {
      const targetUrl = new URL(rawHref, pageUrl).toString()
      if (isManualsLibUrl(targetUrl) && targetUrl.includes("/manual/")) urls.add(targetUrl)
    } catch {
      // Ignore malformed ManualsLib links.
    }
  }

  return Array.from(urls)
}

function extractManualsLibCategoryUrls(
  html: string,
  pageUrl: string,
  brandSlug: string,
  equipmentType: string | null | undefined
) {
  const urls = new Set<string>()
  const words = clean(equipmentType)
    .split(" ")
    .filter((word) => word.length >= 5 && !["catering", "equipment", "commercial", "electric"].includes(word))
  const hrefPattern = /\bhref\s*=\s*(["'])(.*?)\1/gi
  let match: RegExpExecArray | null

  while ((match = hrefPattern.exec(html)) && urls.size < 6) {
    const rawHref = decodeHtml(match[2] || "")
    if (!rawHref.includes(`/brand/${brandSlug}/`) || !rawHref.endsWith(".html")) continue

    const contextStart = Math.max(0, match.index - 120)
    const contextEnd = Math.min(html.length, match.index + rawHref.length + 160)
    const contextText = clean(plainTextFromHtml(html.slice(contextStart, contextEnd)))
    const hrefText = clean(rawHref)
    const isRelevant =
      words.length === 0 || words.some((word) => contextText.includes(word) || hrefText.includes(word))

    if (!isRelevant) continue

    try {
      urls.add(new URL(rawHref, pageUrl).toString())
    } catch {
      // Ignore malformed category links.
    }
  }

  return Array.from(urls)
}

async function fetchManualsLibText(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "CaterBidsUK-CaterBot/1.0 (+https://caterbids.uk)",
        Accept: "text/html,*/*;q=0.8",
      },
    })

    if (!response.ok) return ""
    return response.text()
  } catch {
    return ""
  } finally {
    clearTimeout(timeout)
  }
}

function stripHtml(value: string) {
  return plainTextFromHtml(value).trim()
}

async function manualsLibAutocompleteModels(model: string, equipmentType: string | null | undefined) {
  const results: Array<{ brand: string; model: string }> = []
  const equipmentText = clean(equipmentType)

  for (const term of modelSearchTerms(model)) {
    try {
      const url = `${MANUALSLIB_BASE_URL}/openSearch/action/autocomplete?term=${encodeURIComponent(term)}&open=1`
      const raw = await fetchManualsLibText(url)
      if (!raw) continue

      const data = JSON.parse(raw) as Array<{ label?: string; value?: string; dalue?: string }>
      for (const item of data) {
        const value = stripHtml(item.value || item.dalue || item.label || "")
        const parts = value.split(/\s+/).filter(Boolean)
        if (parts.length < 2) continue

        const brand = parts[0]
        const matchedModel = parts.slice(1).join(" ")
        const compactMatchedModel = compactModel(matchedModel)
        const matchesModel = modelMatchAliases(model).some((alias) => compactMatchedModel.includes(alias))
        const looksRelevant =
          !equipmentText ||
          !/(fridge|freezer|refrigerat|chiller|cooler|microwave|oven)/.test(clean(value)) ||
          /(fridge|freezer|refrigerat|chiller|cooler|microwave|oven)/.test(equipmentText)

        if (matchesModel && looksRelevant) {
          results.push({ brand, model: matchedModel })
        }
      }
    } catch {
      // Autocomplete is best-effort. Brand/category scans and validation are still the gate.
    }
  }

  return results.slice(0, 6)
}

async function findManualsLibCandidateUrls({
  brand,
  model,
  equipmentType,
}: {
  brand: string
  model: string
  equipmentType?: string | null
}) {
  const brandSlug = manualsLibBrandSlug(brand)
  if (!compactModel(model)) return []

  const candidates: string[] = []
  const visitedPages = new Set<string>()
  const lookupModels = [
    ...(brandSlug ? [{ brand, model }] : []),
    ...(await manualsLibAutocompleteModels(model, equipmentType)),
  ]
  const pageQueue = lookupModels.flatMap((lookup) => manualsLibBrandPageUrls(lookup.brand, equipmentType))

  while (pageQueue.length > 0 && visitedPages.size < 10 && candidates.length < 12) {
    const pageUrl = pageQueue.shift()
    if (!pageUrl || visitedPages.has(pageUrl)) continue
    visitedPages.add(pageUrl)

    const html = await fetchManualsLibText(pageUrl)
    if (!html) continue

    lookupModels
      .map((lookup) => lookup.model)
      .forEach((lookupModel) => {
        extractManualsLibManualUrls(html, pageUrl, lookupModel).forEach((url) => addUnique(candidates, url))
      })

    const pageBrandSlug = pageUrl.match(/\/brand\/([^/]+)\/?$/)?.[1]
    if (pageBrandSlug && candidates.length === 0) {
      extractManualsLibCategoryUrls(html, pageUrl, pageBrandSlug, equipmentType).forEach((url) =>
        addUnique(pageQueue, url)
      )
    }
  }

  return candidates
}

function rejectedSourceResult({
  url,
  brand,
  model,
  candidateTitle,
  checkedAt,
  matchNotes,
  usefulDetails = [],
  extractedSpecs = {},
  score = 0,
}: {
  url: string
  brand?: string | null
  model?: string | null
  candidateTitle?: string | null
  checkedAt: string
  matchNotes: string
  usefulDetails?: string[]
  extractedSpecs?: CaterBotSourceValidationResult["extractedSpecs"]
  score?: number
}): CaterBotSourceValidationResult {
  const domain = getHostname(url)

  return {
    valid: false,
    url: "",
    sourceName: sourceNameFor(url, brand || "", model || ""),
    sourceType: sourceTypeFor(url),
    confidence: "low",
    score,
    sourceTitle: candidateTitle || sourceNameFor(url, brand || "", model || ""),
    sourceDomain: domain,
    confidenceScore: score,
    matchedFields: [],
    sourcePriorityRank: sourcePriorityRank(url, brand),
    checkedAt,
    matchNotes,
    usefulDetails,
    extractedSpecs,
  }
}

export async function validateCaterBotProductSource({
  url,
  brand,
  model,
  equipmentType,
  fuelType,
  candidateTitle,
  candidateSnippet,
}: CaterBotSourceValidationInput): Promise<CaterBotSourceValidationResult> {
  const checkedAt = new Date().toISOString()
  const sourceName = sourceNameFor(url, brand || "", model || "")
  const sourceType = sourceTypeFor(url)

  if (isGenericOrBadUrl(url)) {
    return rejectedSourceResult({
      url,
      brand,
      model,
      candidateTitle,
      checkedAt,
      matchNotes: "CaterBot rejected this source because it is generic or not a direct product/manual page.",
    })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "CaterBidsUK-CaterBot/1.0 (+https://caterbids.uk)",
        Accept: "text/html,application/pdf;q=0.9,*/*;q=0.8",
      },
    }).finally(() => clearTimeout(timeout))

    if (!response.ok) {
      return rejectedSourceResult({
        url,
        brand,
        model,
        candidateTitle,
        checkedAt,
        matchNotes: `CaterBot checked the source but it returned HTTP ${response.status}.`,
      })
    }

    const contentType = response.headers.get("content-type") || ""
    const finalUrl = response.url || url
    const hostAndUrlText = clean(`${url} ${finalUrl} ${getHostname(finalUrl)}`)
    const brandText = clean(normaliseManualLookupBrand(brand || ""))
    const { exactAliases, closeAliases } = modelMatchGroups(model)

    const candidateText = `${candidateTitle || ""} ${candidateSnippet || ""}`.trim()
    let pageTitle = ""
    let bodyText = ""
    if (!contentType.includes("pdf")) {
      const raw = await response.text()
      pageTitle = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || ""
      bodyText = raw
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 50000)
    }

    const titleText = `${candidateText} ${pageTitle}`.trim()
    const sourceText = `${titleText} ${bodyText}`
    const combinedText = clean(`${url} ${finalUrl} ${getHostname(finalUrl)} ${sourceText}`)
    const compactCombinedText = compactModel(`${url} ${finalUrl} ${sourceText}`)
    const brandMatches = !brandText || combinedText.includes(brandText) || hostAndUrlText.includes(brandText)
    const exactModelMatches =
      exactAliases.length > 0 &&
      exactAliases.some(
        (modelText) => compactCombinedText.includes(modelText) || compactModel(finalUrl).includes(modelText)
      )
    const closeModelMatches =
      exactModelMatches ||
      closeAliases.some(
        (modelText) => compactCombinedText.includes(modelText) || compactModel(finalUrl).includes(modelText)
      )
    const equipmentMatches = sourceMatchesEquipment(combinedText, equipmentType)
    const fuelMatch = sourceMatchesFuel(combinedText, fuelType)
    const usefulDetails = usefulDetailsFrom(`${finalUrl} ${sourceText}`)
    const extractedSpecs = extractedSpecsFrom(sourceText)
    const priorityRank = sourcePriorityRank(finalUrl, brand)

    if (!closeModelMatches || !brandMatches) {
      console.info("CaterBot rejected source", {
        url: finalUrl,
        reason: "missing brand or model match",
        brandMatches,
        exactModelMatches,
        closeModelMatches,
      })
      return rejectedSourceResult({
        url: finalUrl,
        brand,
        model,
        candidateTitle: pageTitle || candidateTitle,
        checkedAt,
        matchNotes: "CaterBot could not verify the same model or close model family on this source.",
        usefulDetails,
        extractedSpecs: specsWithSellerCheckFallback(extractedSpecs),
      })
    }

    if (!equipmentMatches) {
      console.info("CaterBot rejected source", {
        url: finalUrl,
        reason: "equipment type mismatch",
      })
      return rejectedSourceResult({
        url: finalUrl,
        brand,
        model,
        candidateTitle: pageTitle || candidateTitle,
        checkedAt,
        matchNotes: "CaterBot rejected this source because it does not match the equipment type.",
        usefulDetails,
        extractedSpecs: specsWithSellerCheckFallback(extractedSpecs),
      })
    }

    if (!fuelMatch.matches) {
      console.info("CaterBot rejected source", {
        url: finalUrl,
        reason: "fuel type mismatch",
        fuelType,
      })
      return rejectedSourceResult({
        url: finalUrl,
        brand,
        model,
        candidateTitle: pageTitle || candidateTitle,
        checkedAt,
        matchNotes: "CaterBot rejected this source because it does not match the fuel type.",
        usefulDetails,
        extractedSpecs: specsWithSellerCheckFallback(extractedSpecs),
      })
    }

    const score = scoreCaterBotSource({
      url: finalUrl,
      titleText,
      brandMatches,
      exactModelMatches,
      closeModelMatches,
      equipmentMatches,
      fuelMatches: fuelMatch.matches && fuelMatch.explicit,
      usefulDetails,
      extractedSpecs,
    })
    const confidence = confidenceFromScore(score)
    const matchedFields = matchedFieldsFor({
      brandMatches,
      exactModelMatches,
      closeModelMatches,
      equipmentMatches,
      fuelMatches: fuelMatch.matches,
      fuelWasExplicit: fuelMatch.explicit,
      usefulDetails,
      priorityRank,
    })

    // Confidence scoring: exact model + trusted/manual/spec sources are
    // publishable; close model-family matches are medium at best. Low matches
    // remain seller-only and are not saved as verified buyer-facing links.
    if (confidence === "low" || (!exactModelMatches && priorityRank > 7)) {
      console.info("CaterBot rejected source", {
        url: finalUrl,
        reason: "low confidence source",
        score,
        priorityRank,
        matchedFields,
      })
      return rejectedSourceResult({
        url: finalUrl,
        brand,
        model,
        candidateTitle: pageTitle || candidateTitle,
        checkedAt,
        matchNotes: "CaterBot could not verify an exact manual/spec source. Please add a link manually.",
        usefulDetails,
        extractedSpecs: specsWithSellerCheckFallback(extractedSpecs),
        score,
      })
    }

    return {
      valid: true,
      url: finalUrl,
      sourceName: sourceNameFor(finalUrl, brand || "", model || ""),
      sourceType: sourceTypeFor(finalUrl),
      confidence,
      score,
      sourceTitle: pageTitle || candidateTitle || sourceNameFor(finalUrl, brand || "", model || ""),
      sourceDomain: getHostname(finalUrl),
      confidenceScore: score,
      matchedFields,
      sourcePriorityRank: priorityRank,
      checkedAt,
      matchNotes: isManualsLibUrl(finalUrl)
        ? `CaterBot matched the same brand and ${exactModelMatches ? "exact data-plate identifier" : "model family"} on ManualsLib.`
        : score >= 115 && exactModelMatches
          ? "CaterBot matched the same brand and exact data-plate identifier on a useful product/manual source."
          : "CaterBot matched the same brand and a close model family. Please check the source carefully.",
      usefulDetails,
      extractedSpecs: specsWithSellerCheckFallback(extractedSpecs),
    }
  } catch {
    console.info("CaterBot rejected source", {
      url,
      reason: "could not load source",
    })
    return rejectedSourceResult({
      url,
      brand,
      model,
      candidateTitle,
      checkedAt,
      matchNotes: "CaterBot could not load this source reliably.",
    })
  }
}

export async function findValidatedCaterBotSource({
  brand,
  model,
  serial,
  productTitle,
  category,
  equipmentType,
  fuelType,
  voltage,
  phase,
  amps,
  powerRating,
  gasRating,
  candidateUrls = [],
}: {
  brand?: string | null
  model?: string | null
  serial?: string | null
  productTitle?: string | null
  category?: string | null
  equipmentType?: string | null
  fuelType?: string | null
  voltage?: string | number | null
  phase?: string | number | null
  amps?: string | number | null
  powerRating?: string | null
  gasRating?: string | null
  candidateUrls?: string[]
}) {
  const brandText = normaliseManualLookupBrand(String(brand || "").trim())
  const modelText = String(model || "").trim()
  if (!modelText) return null

  const candidates = new Map<string, { title?: string; snippet?: string }>()
  candidateUrls
    .filter((url) => !isGenericOrBadUrl(url))
    .forEach((url) => candidates.set(url, {}))

  if (candidates.size === 0) {
    const queries = buildCaterBotSourceQueries({
      brand: brandText,
      model: modelText,
      serial,
      productTitle,
      category,
      equipmentType,
      fuelType,
      voltage: voltage == null ? null : String(voltage),
      phase,
      amps,
      powerRating,
      gasRating,
    })
    console.info("CaterBot source search started", {
      provider: "you.com",
      apiKeyPresent: Boolean(process.env.YOU_API_KEY),
      queries,
    })
    const search = await searchCaterBotSources(
      queries,
      { maxResultsPerQuery: 5 }
    )

    search.results.forEach((result) =>
      candidates.set(result.url, {
        title: result.title,
        snippet: result.snippet,
      })
    )

    if (search.errors.length > 0) {
      console.warn("CaterBot source search returned errors:", search.errors)
    }
    console.info("CaterBot source candidates found", {
      count: candidates.size,
      urls: Array.from(candidates.keys()).slice(0, 20),
    })
  }

  const validations: CaterBotSourceValidationResult[] = []
  for (const [url, context] of Array.from(candidates.entries())
    .sort(([a], [b]) => sourcePriority(a, brandText) - sourcePriority(b, brandText))
    .slice(0, 16)) {
    const validation = await validateCaterBotProductSource({
      url,
      brand: brandText,
      model: modelText,
      equipmentType,
      fuelType,
      candidateTitle: context.title,
      candidateSnippet: context.snippet,
    })

    if (validation.valid) validations.push(validation)
  }

  const selected = validations.sort((a, b) => b.score - a.score || sourcePriority(a.url, brandText) - sourcePriority(b.url, brandText))[0] || null
  console.info("CaterBot source search completed", {
    bestSelectedUrl: selected?.url || null,
    extractedDimensions: selected?.extractedSpecs.dimensions || null,
    extractedWeight: selected?.extractedSpecs.weight || null,
    finalConfidence: selected?.confidence || "low",
    score: selected?.score || 0,
  })
  return selected
}
