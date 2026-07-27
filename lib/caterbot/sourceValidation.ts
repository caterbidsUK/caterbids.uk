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
  expectedSpecs?: {
    expected_height_mm: number | null
    expected_width_mm: number | null
    expected_depth_mm: number | null
    expected_weight_kg: number | null
  } | null
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
  // Body text snippet used for Gemini fallback when regex extraction is incomplete.
  // Only set on valid results where dimensions OR weight were not extracted by regex.
  _bodyText?: string
}

const NEEDS_SELLER_CHECK = "Needs seller check"

// Returns the most spec-relevant portion of bodyText (up to maxChars) for Gemini fallback.
// Starts from the first all-caps SPECIFICATIONS heading (skips table-of-contents entries),
// or falls back to "Net Weight" or dimension-label keywords.
function extractRelevantSourceSnippet(text: string, maxChars: number): string {
  const anchors: RegExp[] = [
    /\bSPECIFICATIONS?\b/,           // all-caps heading — title-case TOC entries won't match
    /\bNet Weight\b/i,
    /\bGross Weight\b/i,
    /\b(?:Width|Height|Depth)\s*[:=]/i,
  ]
  for (const anchor of anchors) {
    const idx = text.search(anchor)
    if (idx >= 0) {
      const start = Math.max(0, idx - 200)
      return text.slice(start, start + maxChars)
    }
  }
  const fallbackIdx = text.toLowerCase().indexOf("specification")
  const start = fallbackIdx >= 0 ? Math.max(0, fallbackIdx - 200) : 0
  return text.slice(start, start + maxChars)
}

const TRUSTED_SOURCE_HINTS = [
  "lincat",
  "rational",
  "blue-seal",
  "bluestar",
  "falcon",
  "hobart",
  "foster",
  "polar",
  "buffalo",
  "hoshizaki",
  "williams",
  "true",
  "gram",
  "winterhalter",
  "manitowoc",
  "manualslib",
  "bravilor",
  "bonamat",
  "hatco",
  "electroluxprofessional",
  "electrolux",
  "manuals",
  "catering-appliance",
  "caterkwik",
  "nisbets",
  "caterboss",
  "ukcateringequipment",
  "cateringequipment",
  "alexanders-direct",
  "h2products",
  "electricaldealsdirect",
  "ceonline",
  "caterquip",
  "caterfair",
  "angliacateringequipment",
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
  if (host.endsWith("caterfair.co.uk")) return 7
  if (host.endsWith("angliacateringequipment.com")) return 7
  if (host.endsWith("cater2.co.uk")) return 7
  if (isManufacturerHost(host)) return 3

  // PDFs: rank by how authoritative the source looks.
  // Manufacturer-domain PDFs tie with manualslib (rank 2). Labeled manual/spec PDFs
  // from third parties rank 4 (tied with nisbets — authoritative spec data). Generic PDFs rank 6.
  if (lowerUrl.includes(".pdf")) {
    if (manufacturerDomain && host.includes(manufacturerDomain)) return 2
    if (/\b(?:manual|datasheet|spec|installation|user[\s-]?guide)\b/i.test(lowerUrl)) return 4
    return 6
  }

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
    "polar-refrigerator",
    "buffalo-appliances",
    "hoshizaki",
    "williams-refrigeration",
    "bravilor",
    "hatco",
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
    "alexanders-direct",
    "h2products",
    "electricaldealsdirect",
    "ceonline",
    "caterquip",
    "caterfair",
    "angliacateringequipment",
    "cater2",
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

// Returns true if pageText contains a prefix of compactSearchModel that is long enough
// to be a genuine family match (≥ 75% of model length, minimum 8 chars).
// Handles variant suffixes: "SH120EBTPS" → page has "SH120EBT" → prefix match ✓
function hasModelPrefixMatch(pageText: string, compactSearchModel: string): boolean {
  if (compactSearchModel.length < 9) return false
  const minLen = Math.max(8, Math.ceil(compactSearchModel.length * 0.75))
  for (let len = compactSearchModel.length - 1; len >= minLen; len--) {
    if (pageText.includes(compactSearchModel.slice(0, len))) return true
  }
  return false
}

// Returns the 0-based column index of compactModelHint in the first comparison-table
// header row found in text (a run of ≥2 model-like tokens within 25 chars of each other).
// Returns -1 if no comparison table is detected, or the model is not in the header.
function tableColumnIndex(text: string, compactModelHint: string): number {
  if (!compactModelHint) return -1
  const tokenRe = /\b([A-Z]{1,5}[- ]?[0-9][A-Z0-9]{1,9}(?:[- .][0-9A-Z]{1,8})*)\b/gi
  const tokens = Array.from(text.matchAll(tokenRe))
  for (let i = 0; i < tokens.length - 1; i++) {
    const run: string[] = [tokens[i][1]]
    let lastEnd = tokens[i].index! + tokens[i][0].length
    for (let j = i + 1; j < Math.min(i + 8, tokens.length); j++) {
      if (tokens[j].index! - lastEnd > 25) break
      run.push(tokens[j][1])
      lastEnd = tokens[j].index! + tokens[j][0].length
    }
    if (run.length >= 2) {
      const compacts = run.map((t) => compactModel(t))
      const idx = compacts.indexOf(compactModelHint)
      if (idx !== -1) return idx
    }
  }
  return -1
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

  const exactAliases = variants.filter((term) => term === compactRaw || (compactRaw.includes(term) && term.length >= compactRaw.length))
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

function brandAliases(brand: string | null | undefined) {
  const cleaned = normaliseManualLookupBrand(String(brand || "").trim())
  const aliases = new Set<string>()
  const add = (value: string) => {
    const cleanValue = clean(value)
    if (cleanValue.length >= 3) aliases.add(cleanValue)
  }

  add(cleaned)
  if (/\bbravilor\b/i.test(cleaned) || /\bbonamat\b/i.test(cleaned)) {
    add("bravilor")
    add("bonamat")
    add("bravilor bonamat")
  }
  if (/\belectrolux\b/i.test(cleaned)) {
    add("electrolux")
    add("electrolux professional")
    add("electroluxprofessional")
  }
  if (/\bhatco\b/i.test(cleaned)) {
    add("hatco")
    add("hatco corporation")
  }
  if (/\bblue\s*seal\b/i.test(cleaned)) {
    add("blue seal")
    add("blue-seal")
  }
  cleaned.split(/\s+/).filter((part) => part.length >= 5).forEach(add)

  return Array.from(aliases)
}

function sourceMatchesBrand(combinedText: string, hostAndUrlText: string, brand: string | null | undefined) {
  const aliases = brandAliases(brand)
  if (aliases.length === 0) return true
  return aliases.some((alias) => combinedText.includes(alias) || hostAndUrlText.includes(alias))
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
      host.includes("falconfoodservice") ||
      host.includes("bravilor") ||
      host.includes("hatco")
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

function numberAfterLabel(text: string, labels: string[], columnHint = -1) {
  const normalised = text.replace(/\s+/g, " ")

  for (const label of labels) {
    const pattern = new RegExp(
      `\\b${labelPattern(label)}\\b\\s*(?:\\(([^)]{0,40})\\))?\\s*[:\\-–—]?\\s*(\\d{1,6}(?:[,.]\\d+)?)\\s*([a-zA-Z/%]+)?`,
      "i"
    )
    const match = normalised.match(pattern)
    if (!match || match.index === undefined) continue

    const unitHint = normaliseUnit(match[3] || match[1])

    // Detect comparison-table rows: additional 2–5 digit numbers immediately following
    // the first match value, separated only by whitespace (e.g. "Width (mm) 860 860 860 760").
    const afterFirst = normalised.slice(match.index + match[0].length)
    const rowRest = afterFirst.match(/^((?:\s+\d{2,5}(?:[,.]\d+)?)+)/)
    if (rowRest) {
      // Multi-column row detected.
      if (columnHint < 0) {
        // Column position unknown — returning the first value risks the wrong model's spec.
        return null
      }
      const extraNums = Array.from(rowRest[1].matchAll(/(\d{2,5}(?:[,.]\d+)?)/g)).map((m) => m[1])
      const allVals = [match[2], ...extraNums]
      if (columnHint < allVals.length) {
        return { value: compactNumber(allVals[columnHint]), unit: unitHint }
      }
      return null // column index beyond row length
    }

    // Single-value row (normal single-model page).
    return { value: compactNumber(match[2]), unit: unitHint }
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

// Handles the common UK manufacturer table format: "W: 710 mm D: 740 mm H: 1450 mm"
// where each dimension is a short letter label rather than a full word.
function dimensionsFromWDHLabels(text: string): string {
  const norm = text.replace(/\s+/g, " ")
  const m = norm.match(
    /\bW\s*:\s*(\d{2,4})\s*(mm|cm)\s+D\s*:\s*(\d{2,4})\s*(mm|cm)\s+H\s*:\s*(\d{2,4})\s*(mm|cm)/i
  )
  if (!m) return ""
  const unit = normaliseUnit(m[2]) || normaliseUnit(m[4]) || normaliseUnit(m[6]) || "mm"
  return `${m[1]} x ${m[3]} x ${m[5]} ${unit}`
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

// Parse "NNN x NNN x NNN mm/cm" → [w, d, h] in mm, or null if unparseable.
// Tolerates optional single-letter axis labels after each number+unit (e.g. "710mm W x 740mm D x 1450mm H").
function parseDimStringToMm(dimStr: string): [number, number, number] | null {
  const m = dimStr.match(
    /(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*(?:[WwDdHhLl])?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(?:mm|cm)?\s*(?:[WwDdHhLl])?\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*(mm|cm)?/i
  )
  if (!m) return null
  const unit = (m[4] || "mm").toLowerCase()
  const factor = unit === "cm" ? 10 : unit === "m" ? 1000 : 1
  const vals = [m[1], m[2], m[3]].map((v) => Number(v.replace(",", ".")) * factor)
  if (vals.some((v) => !Number.isFinite(v) || v <= 0)) return null
  return [vals[0], vals[1], vals[2]]
}

// Clears a dimension string that fails plausibility for commercial catering equipment:
// each axis must be 100–3500 mm, and the largest/smallest ratio must be ≤ 6.
// Returns "" so the field is left blank for seller check rather than showing a wrong value.
function sanitiseDimensions(dimStr: string): string {
  if (!dimStr) return dimStr
  const mm = parseDimStringToMm(dimStr)
  if (!mm) return dimStr // unparseable — leave for seller to verify
  if (mm.some((v) => v < 100 || v > 3500)) return ""
  const max = Math.max(...mm)
  const min = Math.min(...mm)
  if (min > 0 && max / min > 6) return ""
  return dimStr
}

// Clears a weight string outside the plausible commercial kitchen range (1–3000 kg).
function sanitiseWeight(weightStr: string): string {
  if (!weightStr) return weightStr
  const m = weightStr.match(/(\d+(?:[,.]\d+)?)\s*kg/i)
  if (!m) return weightStr
  const kg = Number(m[1].replace(",", "."))
  if (!Number.isFinite(kg) || kg < 1 || kg > 3000) return ""
  return weightStr
}

export function extractedSpecsFrom(
  text: string,
  modelHint?: string
): CaterBotSourceValidationResult["extractedSpecs"] {
  // Determine which column in a comparison table belongs to our model.
  // -1 = no table detected or column unknown → falls through to single-value logic.
  const columnHint = modelHint ? tableColumnIndex(text, compactModel(modelHint)) : -1

  const productWidth = numberAfterLabel(text, ["Product Width", "Width"], columnHint)
  const productDepth = numberAfterLabel(text, ["Product Depth", "Depth"], columnHint)
  const productHeight = numberAfterLabel(text, ["Product Height", "Height"], columnHint)
  // Ship/packed dimensions are rarely model-specific in comparison tables.
  const shipWidth = numberAfterLabel(text, ["Ship Width", "Shipping Width", "Packed Width"])
  const shipDepth = numberAfterLabel(text, ["Ship Depth", "Shipping Depth", "Packed Depth"])
  const shipHeight = numberAfterLabel(text, ["Ship Height", "Shipping Height", "Packed Height"])
  const productWeight = numberAfterLabel(text, ["Product Weight", "Net Weight", "Item Weight", "Unpacked Weight"])
  const shipWeight = numberAfterLabel(text, ["Ship Weight", "Shipping Weight", "Packed Weight", "Gross Weight"])

  const rawDimensions =
    dimensionsFromLabeledFields(productWidth, productDepth, productHeight, "mm") ||
    dimensionsFromWDHLabels(text) ||
    firstMatch(text, [
      // "Dimensions (mm): H405 x W384 x D484" — axis-letter glued to number, any H/W/D order.
      // Lookbehind excludes "Chamber Dimensions", "Internal Dimensions", "Usable Dimensions", etc.
      /(?<!chamber\s|internal\s|interior\s|inside\s|usable\s|cavity\s)\b(?:dimensions?|size)[^\d]{0,40}([HhWwDd]\s*\d{2,4}(?:[,.]\d+)?\s*(?:mm|cm)?\s*[x×]\s*[HhWwDd]\s*\d{2,4}(?:[,.]\d+)?\s*(?:mm|cm)?\s*[x×]\s*[HhWwDd]\s*\d{2,4}(?:[,.]\d+)?\s*(?:mm|cm)?)/i,
      /(?<!chamber\s|internal\s|interior\s|inside\s|usable\s|cavity\s)\b(?:dimensions?|size|w\s?x\s?d\s?x\s?h)[^\d]{0,24}(\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?)/i,
      /(?<!chamber\s|internal\s|interior\s|inside\s|usable\s|cavity\s)\b(?:dimensions?|size)[^\d]{0,40}(\d{2,4}\s*\(\s*[hwd]\s*\)\s?[x×]\s?\d{2,4}\s*\(\s*[hwd]\s*\)\s?[x×]\s?\d{2,4}\s*\(\s*[hwd]\s*\)\s?(?:mm|cm)?)/i,
      // "710mm W x 740mm D x 1450mm H" — axis label after number+unit (common on UK supplier pages)
      /\b(\d{2,4}\s?(?:mm|cm)\s?[WwDdLl]\s?[x×]\s?\d{2,4}\s?(?:mm|cm)\s?[DdLl]\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?\s?[Hh])\b/i,
      /\b(\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?)\b/i,
      /\b(\d{2,4}\s*\(\s*[hwd]\s*\)\s?[x×]\s?\d{2,4}\s*\(\s*[hwd]\s*\)\s?[x×]\s?\d{2,4}\s*\(\s*[hwd]\s*\)\s?(?:mm|cm)?)\b/i,
    ])
  // Prefer an explicit "X kg" phrase from the page body over a table field that carries
  // no unit of its own. A label like "Weight: 24 kg" is unambiguous; a table row like
  // "Weight 25.2" relies on a fallback kg which is less reliable (and on this class of
  // page the table weight often duplicates another field due to misaligned table columns).
  // Lookbehind prevents "Packed Weight", "Gross Weight", "Ship Weight" from matching as net weight.
  const labelled_weight_text = firstMatch(text, [
    /(?<!packed |gross |ship |shipping )\b(?:weight|net weight|product weight|empty weight|unpacked weight)[^\d]{0,40}(\d{1,4}(?:\.\d+)?\s?kg)\b/i,
    /\b(\d{1,4}(?:\.\d+)?\s?kg)\s*(?:empty\s*)?(?:weight|net)\b/i,
  ])
  let rawWeight = labelled_weight_text || formatMeasurement(productWeight, "kg")
  let rawGrossWeight =
    formatMeasurement(shipWeight, "kg") ||
    firstMatch(text, [
      /\b(?:gross weight|ship weight|shipping weight|packed weight)[^\d]{0,40}(\d{1,4}(?:\.\d+)?\s?kg)\b/i,
    ])

  // Fallback for pages that label weight as bare "Weight:" without a net/product qualifier.
  // Skipped when the value equals rawGrossWeight to avoid double-counting "Packed Weight: N kg"
  // as both net and gross (the packed weight path already set rawGrossWeight above).
  if (!rawWeight) {
    const bareWeight = numberAfterLabel(text, ["Weight"])
    const bareWeightStr = formatMeasurement(bareWeight, "kg")
    if (bareWeightStr && bareWeightStr !== rawGrossWeight) rawWeight = bareWeightStr
  }

  // Lenient fallback for table-format spec sheets (PDFs and some HTML) where the weight label
  // and its value are in separate rows with other content between them.
  // e.g. Blue Seal manual: "Gross weight  Net weight" header row, "113 kg  139 kg" data row.
  // Requires at least 2 distinct kg values to distinguish net (smaller) from gross (larger).
  // A single value with no comparator cannot be reliably identified as net — treat as gross.
  if (!rawWeight) {
    const weightSection = text.match(/\b(?:net weight|gross weight|weight)\b[\s\S]{0,600}/i)?.[0] ?? ""
    const kgVals = [...weightSection.matchAll(/\b(\d{2,4}(?:[,.]\d+)?)\s*kg\b/gi)]
      .map((m) => parseFloat(m[1].replace(",", ".")))
      .filter((v) => v >= 1 && v <= 3000)
    const sorted = [...new Set(kgVals)].sort((a, b) => a - b)
    if (sorted.length >= 2) {
      rawWeight = `${sorted[0]} kg`
      if (!rawGrossWeight) rawGrossWeight = `${sorted[sorted.length - 1]} kg`
    } else if (sorted.length === 1 && !rawGrossWeight) {
      rawGrossWeight = `${sorted[0]} kg`
    }
  }

  return {
    dimensions: sanitiseDimensions(rawDimensions),
    packedDimensions: dimensionsFromLabeledFields(shipWidth, shipDepth, shipHeight, "cm"),
    weight: sanitiseWeight(rawWeight),
    grossWeight: sanitiseWeight(rawGrossWeight),
    voltage:
      formatMeasurement(numberAfterLabel(text, ["Electrical Voltage", "Voltage"]), "V") ||
      firstMatch(text, [/\b(2[23]0\s?v|240\s?v|400\s?v|415\s?v)\b/i]),
    phase:
      phaseFromLabel(text) ||
      firstMatch(text, [/\b(single phase|three phase|3 phase|1 phase|3-phase|1-phase)\b/i]),
    amps:
      ampsFromLabel(text) || firstMatch(text, [/\b(\d{1,3}(?:\.\d+)?\s?a(?:mp|mps)?)\b/i]),
    kwRating:
      kilowattsFromLabels(text) || firstMatch(text, [/\b(\d{1,3}(?:\.\d+)?\s?kW)\b/i]),
    gasType: firstMatch(text, [/\b(natural gas|lpg|propane)\b/i]),
    capacity: firstMatch(text, [
      /\b(?:capacity)[^\d]{0,24}(\d{1,4}(?:\.\d+)?\s?(?:litres?|ltr|l\b|trays?|kg))\b/i,
      /\b(\d{1,2}\s*x\s*\d{1,3}\s?(?:litres?|ltr|l\b))\b/i,
      /\b(\d{2,4}(?:\.\d+)?\s?(?:litres?|ltr|l\b))\b(?=[^.\n]{0,80}\b(?:fridge|freezer|refrigerator|chiller|capacity)\b)/i,
    ]),
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
    return /\b(dishwasher|glasswasher|warewasher|washer|warewashing|hood type|pass through|passthrough|green clean|greenandclean)\b/.test(text)
  }
  if (/\b(coffee|bulk brew|filter coffee|beverage|hot water|boiler|dispenser)\b/.test(equipmentText)) {
    return /\b(coffee|bulk brew|filter coffee|beverage|hot water|boiler|dispenser|bravilor|bonamat)\b/.test(text)
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

function isAccessoryOrSpareUrl(url: string): boolean {
  const lower = url.toLowerCase()
  let path = lower
  try { path = new URL(lower.startsWith("http") ? lower : `https://${lower}`).pathname } catch {}

  // Explicit spares/parts/accessories path directories
  if (/\/spares?\/|\/spare[-_]parts?\/|\/parts?\/|\/accessor(?:y|ies)\//.test(path)) return true

  // Component keywords that appear in spare-part slugs but never in product names
  const componentKeywords: RegExp[] = [
    /\b(?:cutting|chopping)[-_]?board\b/,
    /\bgasket\b/,
    /\bevaporator\b/,
    /\bcondenser\b/,
    /\bcompressor\b/,
    /\bthermostat\b/,
    /\bfan[-_]support\b/,
    /\bfan[-_]blade\b/,
    /\bfan[-_]motor\b/,
    /\bwater[-_]box\b/,
    /\bsplash[-_]guard\b/,
    /\bgrease[-_]trap\b/,
    /\bdoor[-_]seal\b/,
    /\bshelf[-_](?:clip|bracket)\b/,
  ]
  if (componentKeywords.some((re) => re.test(path))) return true

  // Slug ends with "-for-[model]" — accessory designed for a specific model number
  if (/[-_]for[-_][a-z0-9]+\/?$/.test(path)) return true

  return false
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
  if (isAccessoryOrSpareUrl(url)) return true

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
    .replace(/&times;/g, "×")
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

// Extracts plain text from a PDF ArrayBuffer using pdf-parse (dynamically imported
// to avoid loading the PDF worker until a PDF is actually encountered).
// Returns "" on any failure — a failed PDF just drops the source, allSettled-style.
async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  if (arrayBuffer.byteLength > 5 * 1024 * 1024) return ""
  try {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) })
    const result = await parser.getText({ first: 20 })
    return result.text.replace(/\s+/g, " ").trim().slice(0, 60000)
  } catch {
    return ""
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
  expectedSpecs,
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
    const isPdf = contentType.includes("pdf") || /\.pdf(\?|$)/i.test(finalUrl)
    if (isPdf) {
      const arrayBuffer = await response.arrayBuffer()
      bodyText = await extractTextFromPdf(arrayBuffer)
      // Use the filename as a proxy for the page title (PDF metadata is usually empty)
      const filenamePart = finalUrl.match(/\/([^/?#]+\.pdf[^/?#]*)/i)?.[1]
      pageTitle = filenamePart
        ? decodeURIComponent(filenamePart).replace(/\.pdf.*/i, "").replace(/[-_]/g, " ").trim()
        : ""
    } else {
      const raw = await response.text()
      pageTitle = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || ""
      bodyText = decodeHtml(raw)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 50000)
    }

    const titleText = `${candidateText} ${pageTitle}`.trim()
    const sourceText = `${titleText} ${bodyText}`
    // pageText excludes the search-engine snippet (candidateText). Brand, equipment, and
    // fuel checks MUST be satisfied by the actual fetched page — not by the search query's
    // own text, which always echoes the brand/model we searched for.
    const pageText = clean(`${url} ${finalUrl} ${getHostname(finalUrl)} ${pageTitle} ${bodyText}`)
    const compactCombinedText = compactModel(`${url} ${finalUrl} ${sourceText}`)
    const compactTitleUrlText = compactModel(`${url} ${finalUrl} ${pageTitle}`)
    const brandMatches = sourceMatchesBrand(pageText, hostAndUrlText, brand)
    const titleOrUrlExactModelMatches =
      exactAliases.length > 0 && exactAliases.some((modelText) => compactTitleUrlText.includes(modelText))
    const exactModelMatches =
      exactAliases.length > 0 &&
      exactAliases.some(
        (modelText) => compactCombinedText.includes(modelText) || compactModel(finalUrl).includes(modelText)
      )
    const compactSearchModel = compactModel(model)
    const modelPrefixMatch = !exactModelMatches && hasModelPrefixMatch(compactCombinedText, compactSearchModel)
    const titleOrUrlPrefixMatch = !exactModelMatches && hasModelPrefixMatch(compactTitleUrlText, compactSearchModel)
    const closeModelMatches =
      exactModelMatches ||
      modelPrefixMatch ||
      closeAliases.some(
        (modelText) => compactCombinedText.includes(modelText) || compactModel(finalUrl).includes(modelText)
      )
    const equipmentTypeKnown = !!clean(equipmentType)
    const equipmentMatches = sourceMatchesEquipment(pageText, equipmentType)
    const fuelMatch = sourceMatchesFuel(pageText, fuelType)
    const usefulDetails = usefulDetailsFrom(`${finalUrl} ${sourceText}`)
    const extractedSpecs = extractedSpecsFrom(sourceText, model || undefined)

    if (process.env.NODE_ENV === "development" && expectedSpecs) {
      console.info(
        `CaterBot source vs expected | url=${finalUrl} | source_dims=${extractedSpecs.dimensions || "—"} | source_weight=${extractedSpecs.weight || "—"} | expected=${expectedSpecs.expected_height_mm}×${expectedSpecs.expected_width_mm}×${expectedSpecs.expected_depth_mm}mm ${expectedSpecs.expected_weight_kg}kg`
      )
    }

    // Weight-clash: if identification gave us an expected weight and the source reports
    // a weight below 25% of that, this page is almost certainly a component/accessory,
    // not the product itself. Reject before scoring.
    if (expectedSpecs?.expected_weight_kg != null) {
      const sourceWeightText = extractedSpecs.weight || ""
      const sourceKgMatch = sourceWeightText.match(/\b(\d+(?:\.\d+)?)\s*kg\b/i)
      const sourceKg = sourceKgMatch ? Number(sourceKgMatch[1]) : null
      if (sourceKg != null && sourceKg < expectedSpecs.expected_weight_kg * 0.25) {
        console.info("CaterBot rejected source", {
          url: finalUrl,
          reason: "weight-clash: source weight too low vs expected",
          source_kg: sourceKg,
          expected_kg: expectedSpecs.expected_weight_kg,
          threshold_kg: expectedSpecs.expected_weight_kg * 0.25,
        })
        return rejectedSourceResult({
          url: finalUrl,
          brand,
          model,
          candidateTitle: pageTitle || candidateTitle,
          checkedAt,
          matchNotes: `CaterBot rejected this source: its weight (${sourceKg} kg) is far below the expected ${expectedSpecs.expected_weight_kg} kg — likely an accessory or component page, not the product itself.`,
          usefulDetails,
          extractedSpecs: specsWithSellerCheckFallback(extractedSpecs),
        })
      }
    }

    const priorityRank = sourcePriorityRank(finalUrl, brand)

    if (exactModelMatches && !titleOrUrlExactModelMatches) {
      console.info("CaterBot rejected source", {
        url: finalUrl,
        reason: "title/url missing exact model",
        pageTitle,
      })
      return rejectedSourceResult({
        url: finalUrl,
        brand,
        model,
        candidateTitle: pageTitle || candidateTitle,
        checkedAt,
        matchNotes:
          "CaterBot rejected this source because the page title or URL did not match the exact model.",
        usefulDetails,
        extractedSpecs: specsWithSellerCheckFallback(extractedSpecs),
      })
    }

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
    const baseConfidence = confidenceFromScore(score)
    const confidence = !equipmentTypeKnown && baseConfidence === "high" ? "medium" : baseConfidence
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

    // Accept exact model match (confirmed by title/URL above) OR a prefix family
    // match (variant suffix like SH120EBTPS → page has SH120EBT) provided the
    // prefix also appears in the URL/title and confidence is at least medium.
    const validByExact = exactModelMatches  // title/URL already confirmed by gate above
    const validByPrefix = modelPrefixMatch && titleOrUrlPrefixMatch && confidence !== "low"

    if ((!validByExact && !validByPrefix) || confidence === "low") {
      console.info("CaterBot rejected source", {
        url: finalUrl,
        reason: validByExact ? "low confidence source" : "model not matched (exact or prefix)",
        score,
        priorityRank,
        matchedFields,
        modelPrefixMatch,
        titleOrUrlPrefixMatch,
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
      // Populated only when regex extraction missed dims or weight — route.ts uses this
      // to call Gemini as a fallback reader on the verified source text.
      _bodyText:
        !extractedSpecs.dimensions || !extractedSpecs.weight
          ? extractRelevantSourceSnippet(bodyText, 10000)
          : undefined,
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

// KNOWN ISSUE: findValidatedCaterBotSource (called by /api/ai-listing Phase 1) has no product
// identification and no expectedSpecs — it is blind to spec clashes. Currently protected only by
// URL pattern rejection (isAccessoryOrSpareUrl). Longer-term: thread identification into Phase 1
// or consolidate the two source-selection pipelines.
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

  async function bestFromCandidates(
    candidateMap: Map<string, { title?: string; snippet?: string }>
  ): Promise<CaterBotSourceValidationResult | null> {
    const validations: CaterBotSourceValidationResult[] = []
    for (const [url, context] of Array.from(candidateMap.entries())
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
    return (
      validations.sort(
        (a, b) => b.score - a.score || sourcePriority(a.url, brandText) - sourcePriority(b.url, brandText)
      )[0] || null
    )
  }

  // Phase 1: try AI-suggested candidate URLs as a fast path (no web search cost).
  // If ALL fail validation, fall through to the web search rather than giving up.
  const aiCandidates = new Map<string, { title?: string; snippet?: string }>()
  candidateUrls
    .filter((url) => !isGenericOrBadUrl(url))
    .forEach((url) => aiCandidates.set(url, {}))

  if (aiCandidates.size > 0) {
    const fastResult = await bestFromCandidates(aiCandidates)
    if (fastResult) {
      console.info("CaterBot source search completed (AI candidate validated)", {
        bestSelectedUrl: fastResult.url,
        extractedDimensions: fastResult.extractedSpecs.dimensions || null,
        extractedWeight: fastResult.extractedSpecs.weight || null,
        finalConfidence: fastResult.confidence || "low",
        score: fastResult.score || 0,
      })
      return fastResult
    }
    console.info("CaterBot AI-suggested candidates failed validation — falling through to web search", {
      rejectedUrls: Array.from(aiCandidates.keys()),
    })
  }

  // Phase 2: web search (runs when no AI candidates were provided, or all failed)
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
  const search = await searchCaterBotSources(queries, { maxResultsPerQuery: 5 })

  const webCandidates = new Map<string, { title?: string; snippet?: string }>()
  search.results.forEach((result) =>
    webCandidates.set(result.url, { title: result.title, snippet: result.snippet })
  )

  if (search.errors.length > 0) {
    console.warn("CaterBot source search returned errors:", search.errors)
  }
  console.info("CaterBot source candidates found", {
    count: webCandidates.size,
    urls: Array.from(webCandidates.keys()).slice(0, 20),
  })

  const selected = await bestFromCandidates(webCandidates)
  console.info("CaterBot source search completed", {
    bestSelectedUrl: selected?.url || null,
    extractedDimensions: selected?.extractedSpecs.dimensions || null,
    extractedWeight: selected?.extractedSpecs.weight || null,
    finalConfidence: selected?.confidence || "low",
    score: selected?.score || 0,
  })
  return selected
}
