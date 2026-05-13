export type CaterBidsSearchCategory = "all" | "equipment" | "vans" | "businesses"

export type EbayRuleItem = {
  itemId?: string
  title?: string
  city?: string
  location?: string
  itemLocation?: {
    city?: string
    country?: string
    postalCode?: string
  }
  [key: string]: unknown
}

type RuleSet = {
  strongTerms: string[]
  blockedTerms: string[]
  boosters: string[]
  queryTerms: string[]
}

type FilterOptions = {
  category: string
  query: string
  allowParts?: boolean
}

const EQUIPMENT_RULES: RuleSet = {
  strongTerms: [
    "commercial fryer",
    "gas fryer",
    "electric fryer",
    "catering fryer",
    "commercial oven",
    "combi oven",
    "convection oven",
    "pizza oven",
    "kebab machine",
    "doner kebab machine",
    "griddle",
    "chargrill",
    "bain marie",
    "commercial fridge",
    "upright fridge",
    "display fridge",
    "commercial freezer",
    "prep fridge",
    "commercial dishwasher",
    "glasswasher",
    "dough mixer",
    "planetary mixer",
    "food mixer",
    "stainless prep table",
    "prep table",
    "hot cupboard",
    "commercial microwave",
    "catering sink",
    "commercial sink",
    "extraction canopy",
  ],
  blockedTerms: [
    "bowl",
    "lid",
    "leg",
    "foot",
    "feet",
    "wheel",
    "castor",
    "knob",
    "handle",
    "hook",
    "paddle",
    "attachment",
    "blade",
    "disc",
    "whisk",
    "beater",
    "seal",
    "gasket",
    "filter",
    "shelf",
    "tray",
    "manual",
    "book",
    "poster",
    "toy",
    "model",
    "miniature",
    "spare parts",
    "spares",
    "pump pot",
    "water boiler part",
    "accessory only",
    "accessories only",
  ],
  boosters: [
    "commercial",
    "catering",
    "professional",
    "restaurant",
    "takeaway",
    "heavy duty",
    "stainless steel",
    "freestanding",
    "countertop",
  ],
  queryTerms: [
    "commercial fryer",
    "commercial oven",
    "pizza oven",
    "doner kebab machine",
    "commercial fridge",
    "commercial freezer",
    "commercial dishwasher",
    "glasswasher",
    "commercial mixer",
    "stainless prep table",
    "commercial microwave",
    "catering sink",
    "extraction canopy",
  ],
}

const VAN_RULES: RuleSet = {
  strongTerms: [
    "catering van",
    "food truck",
    "burger van",
    "coffee van",
    "ice cream van",
    "mobile catering",
    "catering trailer",
    "food trailer",
    "pizza trailer",
    "kebab van",
    "snack van",
    "concession trailer",
    "food van",
    "mobile catering unit",
    "mobile food trailer",
    "mobile food unit",
    "catering unit",
    "horsebox catering trailer",
    "horsebox food trailer",
  ],
  blockedTerms: [
    "camper",
    "caravan",
    "day van",
    "conversion",
    "transporter",
    "caddy",
    "fiesta",
    "postcard",
    "photo",
    "toy",
    "model",
    "scale",
    "replica",
    "collectable",
    "collectables",
    "memorabilia",
    "funfair",
    "fairground",
    "circus",
    "diecast",
    "die cast",
    "hot wheels",
    "monster jam",
    "johnny lightning",
    "realtoy",
    "ralstoy",
    "1 64",
    "20cm",
    "jeep cherokee",
    "suv",
    "railway",
    "brochure",
    "manual",
  ],
  boosters: ["catering", "food", "mobile", "trailer", "truck", "business", "equipped", "unit", "horsebox"],
  queryTerms: [
    "catering van",
    "food truck",
    "burger van",
    "coffee van",
    "ice cream van",
    "mobile catering",
    "catering trailer",
    "food trailer",
    "pizza trailer",
    "kebab van",
    "snack van",
    "concession trailer",
    "mobile food trailer",
    "mobile food unit",
    "horsebox catering trailer",
    "catering unit",
  ],
}

const BUSINESS_RULES: RuleSet = {
  strongTerms: [
    "catering business",
    "takeaway business",
    "cafe business",
    "restaurant business",
    "fish and chip shop",
    "chip shop business",
    "food trailer business",
    "burger van business",
    "coffee van business",
    "mobile catering business",
    "leasehold restaurant",
    "leasehold cafe",
    "commercial kitchen business",
    "food van business",
    "hospitality business",
  ],
  blockedTerms: [
    "bowl",
    "mixer",
    "table",
    "fridge",
    "freezer",
    "fryer",
    "oven",
    "pot",
    "pan",
    "shelf",
    "trolley",
    "pump pot",
    "spare",
    "part",
  ],
  boosters: ["business", "leasehold", "shop", "cafe", "restaurant", "takeaway", "trailer", "van", "mobile catering"],
  queryTerms: [
    "catering business",
    "takeaway business",
    "cafe business",
    "restaurant business",
    "fish and chip shop",
    "chip shop business",
    "food trailer business",
    "burger van business",
    "coffee van business",
    "mobile catering business",
    "leasehold restaurant",
    "leasehold cafe",
    "hospitality business",
  ],
}

const PART_INTENT_TERMS = [
  "part",
  "parts",
  "spare",
  "spares",
  "repair",
  "basket",
  "valve",
  "burner",
  "element",
  "thermostat",
  "knob",
  "handle",
  "seal",
  "gasket",
  "filter",
  "lid",
  "leg",
  "feet",
]

const SPECIFIC_EQUIPMENT_EXPANSIONS: Array<[string[], string[]]> = [
  [["fryer", "fryers"], ["commercial fryer", "gas fryer", "electric fryer", "catering fryer"]],
  [["oven", "ovens"], ["commercial oven", "combi oven", "convection oven", "pizza oven"]],
  [["fridge", "fridges", "chiller"], ["commercial fridge", "upright fridge", "display fridge", "prep fridge"]],
  [["freezer", "freezers"], ["commercial freezer", "display freezer", "upright freezer"]],
  [["dishwasher", "dishwashers"], ["commercial dishwasher", "catering dishwasher", "glasswasher"]],
  [["mixer", "mixers"], ["dough mixer", "planetary mixer", "food mixer", "commercial mixer"]],
  [["kebab", "doner"], ["doner kebab machine", "kebab machine", "commercial kebab machine"]],
  [["sink", "sinks"], ["catering sink", "commercial sink", "stainless catering sink"]],
  [["griddle", "grill"], ["commercial griddle", "commercial grill", "chargrill"]],
]

const BUSINESS_ALLOW_TERMS = ["business", "leasehold", "shop", "cafe", "restaurant", "takeaway", "trailer", "van", "mobile catering"]
const HARD_EQUIPMENT_PART_TERMS = [
  "spare parts",
  "parts",
  "spares",
  "hook",
  "paddle",
  "attachment",
  "blade",
  "disc",
  "whisk",
  "beater",
  "knob",
  "handle",
  "seal",
  "gasket",
  "filter",
  "manual",
  "book",
  "poster",
  "toy",
  "model",
  "miniature",
  "water boiler part",
  "accessory only",
  "accessories only",
]

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
}

function includesWord(value: string, word: string) {
  return new RegExp(`(^|\\s)${normalise(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(value)
}

function includesTerm(value: string, term: string) {
  const cleanTerm = normalise(term)
  return cleanTerm.includes(" ") ? value.includes(cleanTerm) : includesWord(value, cleanTerm)
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function normaliseCategory(category: string, query: string): CaterBidsSearchCategory {
  const cleanCategory = normalise(category)
  const cleanQuery = normalise(query)

  if (cleanCategory === "equipment" || cleanCategory === "catering equipment") {
    return "equipment"
  }

  if (cleanCategory === "vans" || cleanCategory === "catering vans") {
    return "vans"
  }

  if (cleanCategory === "businesses" || cleanCategory === "catering businesses") {
    return "businesses"
  }

  if (["van", "vans", "truck", "trailer"].some((term) => includesWord(cleanQuery, term))) {
    return "vans"
  }

  if (["business", "businesses", "leasehold", "shop", "cafe", "restaurant", "takeaway"].some((term) => includesWord(cleanQuery, term))) {
    return "businesses"
  }

  return "all"
}

function ruleSetFor(category: CaterBidsSearchCategory) {
  if (category === "vans") return VAN_RULES
  if (category === "businesses") return BUSINESS_RULES
  return EQUIPMENT_RULES
}

function hasPartIntent(query: string) {
  const cleanQuery = normalise(query)
  return PART_INTENT_TERMS.some((term) => includesTerm(cleanQuery, term))
}

function expandedEquipmentQueries(query: string) {
  const cleanQuery = normalise(query)
  const expansion = SPECIFIC_EQUIPMENT_EXPANSIONS.find(([terms]) =>
    terms.some((term) => includesTerm(cleanQuery, term))
  )

  if (expansion) {
    return expansion[1]
  }

  if (!cleanQuery || ["commercial catering equipment", "catering equipment", "equipment"].includes(cleanQuery)) {
    return EQUIPMENT_RULES.queryTerms
  }

  return [
    cleanQuery.includes("commercial") ? cleanQuery : `commercial ${cleanQuery}`,
    cleanQuery.includes("catering") ? cleanQuery : `${cleanQuery} catering equipment`,
  ]
}

export function buildEbayQuery(category: string, searchTerm: string, condition = "all") {
  const resolvedCategory = normaliseCategory(category, searchTerm)
  const cleanSearch = normalise(searchTerm)
  let queries: string[]

  if (resolvedCategory === "vans") {
    queries = VAN_RULES.queryTerms
  } else if (resolvedCategory === "businesses") {
    queries = BUSINESS_RULES.queryTerms
  } else {
    queries = expandedEquipmentQueries(searchTerm)
  }

  if (resolvedCategory === "all" && cleanSearch && !["commercial catering equipment", "catering equipment"].includes(cleanSearch)) {
    queries = unique([searchTerm, ...queries])
  }

  if (condition === "used") {
    queries = unique([...queries, ...queries.slice(0, 4).map((query) => `${query} used`)])
  }

  if (condition === "new") {
    queries = unique([...queries, ...queries.slice(0, 4).map((query) => `${query} new`)])
  }

  return unique(queries).slice(0, 14)
}

function scoreLocation(item: EbayRuleItem) {
  const location = normalise(`${item.city || ""} ${item.location || ""} ${item.itemLocation?.city || ""} ${item.itemLocation?.country || ""} ${item.itemLocation?.postalCode || ""}`)
  return ["gb", "uk", "united kingdom", "great britain"].some((term) => location.includes(term)) ? 10 : 0
}

function scoreItem(item: EbayRuleItem, category: CaterBidsSearchCategory, query: string) {
  const title = normalise(item.title || "")
  const cleanQuery = normalise(query)
  const rules = ruleSetFor(category)
  let score = scoreLocation(item)

  if (cleanQuery && title.includes(cleanQuery)) score += 60
  for (const term of rules.strongTerms) {
    if (includesTerm(title, term)) score += 45
  }
  for (const term of rules.boosters) {
    if (includesTerm(title, term)) score += 10
  }

  if (category === "equipment" || category === "all") {
    if (includesTerm(title, "commercial")) score += 20
    if (includesTerm(title, "catering")) score += 15
    if (["unit", "machine", "freestanding", "upright", "countertop", "double", "single"].some((term) => includesTerm(title, term))) {
      score += 15
    }
  }

  if (category === "businesses" && BUSINESS_ALLOW_TERMS.some((term) => includesTerm(title, term))) {
    score += 35
  }

  for (const term of rules.blockedTerms) {
    if (includesTerm(title, term)) score -= 50
  }

  if (["spares", "spare parts", "for parts", "repair", "accessory only"].some((term) => includesTerm(title, term))) {
    score -= 60
  }

  return score
}

function isRelevantEquipment(title: string, allowParts: boolean) {
  const hasStrongTerm = EQUIPMENT_RULES.strongTerms.some((term) => includesTerm(title, term))
  const hasEquipmentSignal = ["commercial", "catering", "restaurant", "takeaway"].some((term) => includesTerm(title, term)) &&
    ["fryer", "oven", "fridge", "freezer", "dishwasher", "glasswasher", "mixer", "griddle", "chargrill", "bain marie", "microwave", "sink", "canopy", "kebab"].some((term) => includesTerm(title, term))
  const hasBlockedTerm = EQUIPMENT_RULES.blockedTerms.some((term) => includesTerm(title, term))
  const hasHardPartTerm = HARD_EQUIPMENT_PART_TERMS.some((term) => includesTerm(title, term))

  if (allowParts) return hasStrongTerm || hasEquipmentSignal || hasBlockedTerm
  if (hasHardPartTerm) return false
  if (!hasStrongTerm && !hasEquipmentSignal) return false
  if (hasBlockedTerm && !hasStrongTerm) return false

  return true
}

function isRelevantVan(title: string) {
  const hasStrongTerm = VAN_RULES.strongTerms.some((term) => includesTerm(title, term))
  const hasFoodSignal = [
    "catering",
    "food",
    "burger",
    "coffee",
    "ice cream",
    "kebab",
    "pizza",
    "snack",
    "concession",
  ].some((term) => includesTerm(title, term))
  const hasVehicleSignal = ["van", "truck", "trailer", "unit", "horsebox"].some((term) =>
    includesTerm(title, term)
  )
  const hasBlockedTerm = VAN_RULES.blockedTerms.some((term) => includesTerm(title, term))

  return (hasStrongTerm || (hasFoodSignal && hasVehicleSignal)) && !hasBlockedTerm
}

function isRelevantBusiness(title: string) {
  const hasBusinessSignal = BUSINESS_RULES.strongTerms.some((term) => includesTerm(title, term)) ||
    BUSINESS_ALLOW_TERMS.some((term) => includesTerm(title, term))
  const hasBlockedEquipmentOnly = BUSINESS_RULES.blockedTerms.some((term) => includesTerm(title, term)) &&
    !BUSINESS_ALLOW_TERMS.some((term) => includesTerm(title, term))

  return hasBusinessSignal && !hasBlockedEquipmentOnly
}

export function filterAndRankResults<T extends EbayRuleItem>(results: T[], options: FilterOptions) {
  const resolvedCategory = normaliseCategory(options.category, options.query)
  const rankingCategory = resolvedCategory === "all" ? "equipment" : resolvedCategory
  const allowParts = options.allowParts || hasPartIntent(options.query)

  return [...results]
    .filter((item) => {
      const title = normalise(item.title || "")
      if (!title) return false

      if (resolvedCategory === "vans") return isRelevantVan(title)
      if (resolvedCategory === "businesses") return isRelevantBusiness(title)

      return isRelevantEquipment(title, allowParts)
    })
    .sort((a, b) => scoreItem(b, rankingCategory, options.query) - scoreItem(a, rankingCategory, options.query))
}
