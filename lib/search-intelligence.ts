export type SearchIntent = "complete-unit" | "parts-spares"

export type SearchAnalysis = {
  originalQuery: string
  cleanedQuery: string
  equipmentType: string
  fuelType: string
  intent: SearchIntent
  allowParts: boolean
  blockedWords: string[]
  requiredWords: string[]
  boostedWords: string[]
}

export type EbaySearchItem = {
  itemId?: string
  title?: string
  itemLocation?: {
    country?: string
    postalCode?: string
  }
  [key: string]: unknown
}

const PART_WORDS = [
  "valve",
  "valves",
  "basket",
  "baskets",
  "burner",
  "burners",
  "element",
  "elements",
  "thermostat",
  "thermostats",
  "thermocouple",
  "thermocouples",
  "thermopile",
  "thermopiles",
  "knob",
  "knobs",
  "handle",
  "handles",
  "spare",
  "spares",
  "parts",
  "filter",
  "seal",
  "gasket",
  "jet",
  "nozzle",
  "pilot",
  "regulator",
  "wire",
  "wires",
  "pipe",
  "pipes",
  "tube",
  "tubes",
  "hose",
  "hoses",
  "mesh",
  "spring",
  "lid",
  "arm",
  "control",
  "sensor",
  "cut out",
  "accessory",
  "accessories",
  "container",
  "containers",
  "box",
  "boxes",
  "pack",
  "packs",
  "disposable",
  "bagasse",
]

const PART_INTENT_WORDS = [
  "basket",
  "valve",
  "burner",
  "parts",
  "part",
  "spares",
  "spare",
  "repair",
  "element",
  "thermostat",
  "knob",
  "handle",
  "thermocouple",
  "thermopile",
  "control",
  "pipe",
  "tube",
  "hose",
]

const COMPLETE_UNIT_PHRASES = [
  "commercial gas fryer",
  "gas fryer",
  "freestanding fryer",
  "free standing fryer",
  "double fryer",
  "single fryer",
  "catering fryer",
  "commercial fryer",
  "commercial fridge",
  "catering fridge",
  "pizza oven",
  "commercial oven",
  "catering oven",
  "catering trailer",
  "takeaway business",
]

export const CATERING_VAN_SEARCH_TERMS = [
  "catering van",
  "food truck",
  "burger van",
  "coffee van",
  "ice cream van",
  "mobile catering",
  "catering trailer",
  "food trailer",
  "kebab van",
  "pizza trailer",
  "food van",
  "mobile catering unit",
]

const CATERING_VAN_MATCH_TERMS = [
  ...CATERING_VAN_SEARCH_TERMS,
  "mobile food",
  "mobile kitchen",
  "catering unit",
]

const BLOCKED_VAN_TERMS = [
  "camper",
  "caravan",
  "postcard",
  "photo",
  "toy",
  "model",
  "diecast",
  "book",
  "manual",
  "brochure",
  "collection",
  "railway",
  "transporter",
  "caddy",
  "fiesta",
  "day van",
  "conversion",
]

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
}

function includesWord(value: string, word: string) {
  return new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(value)
}

function detectEquipmentType(cleanedQuery: string) {
  const equipmentMap: Array<[string, string[]]> = [
    ["fryer", ["fryer", "fryers", "chip fryer", "deep fryer"]],
    ["fridge", ["fridge", "fridges", "refrigerator", "chiller", "display fridge"]],
    ["oven", ["oven", "ovens", "pizza oven", "convection oven"]],
    ["trailer", ["trailer", "catering trailer", "food trailer"]],
    ["business", ["business", "takeaway", "restaurant", "cafe"]],
    ["freezer", ["freezer", "freezers"]],
    ["grill", ["grill", "griddle"]],
  ]

  return equipmentMap.find(([, terms]) => terms.some((term) => cleanedQuery.includes(term)))?.[0] || ""
}

function detectFuelType(cleanedQuery: string) {
  if (includesWord(cleanedQuery, "gas") || cleanedQuery.includes("lpg") || cleanedQuery.includes("propane")) {
    return "gas"
  }

  if (includesWord(cleanedQuery, "electric") || includesWord(cleanedQuery, "electrical")) {
    return "electric"
  }

  return ""
}

function boostedWordsFor(equipmentType: string, fuelType: string) {
  const words = ["commercial", "catering"]

  if (fuelType) {
    words.push(fuelType)
  }

  if (equipmentType === "fryer") {
    words.push("freestanding", "single", "double")
  }

  if (equipmentType === "fridge") {
    words.push("upright", "display", "counter", "under counter")
  }

  if (equipmentType === "oven") {
    words.push("pizza", "convection", "deck")
  }

  if (equipmentType === "trailer") {
    words.push("food", "mobile", "serving")
  }

  return Array.from(new Set(words))
}

export function analyseSearchQuery(query: string): SearchAnalysis {
  const cleanedQuery = normalise(query)
  const equipmentType = detectEquipmentType(cleanedQuery)
  const fuelType = detectFuelType(cleanedQuery)
  const allowParts = PART_INTENT_WORDS.some((word) => includesWord(cleanedQuery, word))
  const requiredWords = equipmentType === "business" ? ["business", "takeaway", "restaurant", "cafe"] : equipmentType ? [equipmentType] : []

  return {
    originalQuery: query,
    cleanedQuery,
    equipmentType,
    fuelType,
    intent: allowParts ? "parts-spares" : "complete-unit",
    allowParts,
    blockedWords: PART_WORDS,
    requiredWords,
    boostedWords: boostedWordsFor(equipmentType, fuelType),
  }
}

export function buildMarketplaceSearchQuery(analysis: SearchAnalysis) {
  if (!analysis.cleanedQuery) {
    return "commercial catering equipment"
  }

  if (analysis.allowParts || !analysis.equipmentType) {
    return analysis.cleanedQuery.includes("catering")
      ? analysis.cleanedQuery
      : `${analysis.cleanedQuery} catering equipment`.trim()
  }

  const unitModifiers = [
    !analysis.cleanedQuery.includes("commercial") && "commercial",
    !analysis.cleanedQuery.includes("catering") && "catering",
  ].filter(Boolean)

  return `${unitModifiers.join(" ")} ${analysis.cleanedQuery}`.trim()
}

export function isCateringVanResult(title: string) {
  const normalisedTitle = normalise(title)

  return CATERING_VAN_MATCH_TERMS.some((term) => normalisedTitle.includes(normalise(term)))
}

export function isBlockedVanResult(title: string) {
  const normalisedTitle = normalise(title)

  return BLOCKED_VAN_TERMS.some((term) => normalisedTitle.includes(normalise(term)))
}

export function buildEbaySearchQuery(category: string, searchTerm: string, condition = "all") {
  const normalisedCategory = normalise(category)
  const normalisedSearch = normalise(searchTerm)

  if (normalisedCategory === "vans") {
    return CATERING_VAN_SEARCH_TERMS.join(" ")
  }

  const analysis = analyseSearchQuery(searchTerm)
  const query = buildMarketplaceSearchQuery(analysis)

  if (condition === "used" && !normalisedSearch.includes("used")) {
    return `${query} used`
  }

  if (condition === "new" && !normalisedSearch.includes("new")) {
    return `${query} new`
  }

  return query
}

export function filterCateringVanResults<T extends EbaySearchItem>(results: T[]) {
  if (!Array.isArray(results)) {
    return []
  }

  return results.filter((item) => {
    const title = item.title || ""
    return isCateringVanResult(title) && !isBlockedVanResult(title)
  })
}

function titleText(item: EbaySearchItem) {
  return normalise(item.title || "")
}

function isClearlyCompleteUnit(title: string, analysis: SearchAnalysis) {
  const hasFryerUnitSignal =
    analysis.equipmentType === "fryer" &&
    title.includes("fryer") &&
    ["tank", "freestanding", "free standing", "single", "double", "catering equipment"].some((word) =>
      title.includes(word)
    )

  const strongPartSignals = [
    "valve",
    "element",
    "thermostat",
    "thermocouple",
    "thermopile",
    "knob",
    "handle",
    "spare",
    "spares",
    "parts",
    "for ",
    "wire",
    "wires",
    "pipe",
    "tube",
    "hose",
    "mesh",
    "spring",
    "lid",
    "arm",
    "control",
    "sensor",
    "cut out",
    "container",
    "containers",
    "box",
    "boxes",
    "pack",
    "packs",
    "disposable",
    "bagasse",
  ]

  if (strongPartSignals.some((word) => title.includes(word))) {
    return false
  }

  if ((includesWord(title, "basket") || includesWord(title, "baskets")) && !hasFryerUnitSignal) {
    return false
  }

  if (hasFryerUnitSignal) {
    return true
  }

  if (COMPLETE_UNIT_PHRASES.some((phrase) => title.includes(phrase))) {
    return true
  }

  if (analysis.equipmentType && title.includes(analysis.equipmentType)) {
    return ["commercial", "catering", "freestanding", "free standing", "single", "double", "unit", "tank"].some((word) =>
      title.includes(word)
    )
  }

  return false
}

export function filterEbayResults<T extends EbaySearchItem>(results: T[], analysis: SearchAnalysis) {
  if (!Array.isArray(results)) {
    return []
  }

  return results.filter((item) => {
    const title = titleText(item)

    if (analysis.requiredWords.length > 0 && !analysis.requiredWords.some((word) => title.includes(word))) {
      return false
    }

    if (analysis.allowParts) {
      return true
    }

    const hasBlockedWord = analysis.blockedWords.some((word) => includesWord(title, word))
    if (!hasBlockedWord) {
      return true
    }

    return isClearlyCompleteUnit(title, analysis)
  })
}

function scoreEbayItem(item: EbaySearchItem, analysis: SearchAnalysis) {
  const title = titleText(item)
  const location = normalise(`${item.itemLocation?.country || ""} ${item.itemLocation?.postalCode || ""}`)
  let score = 0

  if (analysis.cleanedQuery && title.includes(analysis.cleanedQuery)) score += 50
  if (analysis.equipmentType && title.includes(analysis.equipmentType)) score += 40
  if (analysis.fuelType && title.includes(analysis.fuelType)) score += 30
  if (title.includes("commercial")) score += 25
  if (title.includes("catering")) score += 20
  if (title.includes("freestanding") || title.includes("free standing")) score += 20
  if (title.includes("single")) score += 15
  if (title.includes("double")) score += 15
  if (["uk", "gb", "great britain", "united kingdom"].some((word) => location.includes(word))) score += 10

  if (!analysis.allowParts && analysis.blockedWords.some((word) => includesWord(title, word))) score -= 50
  if (title.includes("for parts")) score -= 30
  if (title.includes("spares")) score -= 30
  if (title.includes("repair")) score -= 20

  return score
}

export function rankEbayResults<T extends EbaySearchItem>(results: T[], analysis: SearchAnalysis) {
  return [...results].sort((a, b) => scoreEbayItem(b, analysis) - scoreEbayItem(a, analysis))
}
