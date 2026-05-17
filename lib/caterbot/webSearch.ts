export type CaterBotPlateSearchInput = {
  brand?: string | null
  model?: string | null
  serial?: string | null
  productTitle?: string | null
  category?: string | null
  equipmentType?: string | null
  fuelType?: string | null
  voltage?: string | null
  phase?: string | number | null
  amps?: string | number | null
  powerRating?: string | null
  gasRating?: string | null
}

export type CaterBotSearchResult = {
  title: string
  url: string
  snippet?: string
  provider: "You.com Search"
}

export type YouComSearchResponse = {
  status: number
  results: CaterBotSearchResult[]
  error: string
}

type SearchOptions = {
  maxResultsPerQuery?: number
}

const YOU_SEARCH_ENDPOINT = "https://ydc-index.io/v1/search"

// CaterBot deliberately searches trusted manual/spec sources first. Future
// providers can plug in below `searchYouComQuery`, but they should preserve
// this priority order before broad web queries are attempted.
export const CATERBOT_SOURCE_PRIORITY = [
  "catering-appliance.com",
  "manualslib.com",
  "manufacturer",
  "nisbets.co.uk",
  "caterkwik.co.uk",
  "cs-catering-equipment.co.uk",
  "allianceonline.co.uk",
  "general web",
] as const

const MANUFACTURER_DOMAIN_BY_BRAND: Record<string, string> = {
  lincat: "lincat.co.uk",
  falcon: "falconfoodservice.com",
  rational: "rational-online.com",
  hobart: "hobartuk.com",
  foster: "fosterrefrigerator.com",
  winterhalter: "winterhalter.com",
  "blue seal": "blue-seal.co.uk",
  "blue-seal": "blue-seal.co.uk",
  electrolux: "electroluxprofessional.com",
  true: "true-mfg.com",
  gram: "gram-commercial.com",
  imperial: "imperialrange.com",
}

const TRUSTED_UK_SUPPLIER_DOMAINS = [
  "nisbets.co.uk",
  "caterkwik.co.uk",
  "cs-catering-equipment.co.uk",
  "allianceonline.co.uk",
]

function clean(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim().replace(/\s+/g, " ")
    : ""
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values))
}

function cleanBrandKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export function manufacturerDomainForBrand(brand: string | null | undefined) {
  const brandKey = cleanBrandKey(clean(brand))
  if (!brandKey) return ""
  return MANUFACTURER_DOMAIN_BY_BRAND[brandKey] || `${brandKey.replace(/\s+/g, "")}.co.uk`
}

function hasPlateIdentifierShape(value: string) {
  const compact = value.replace(/[^a-z0-9]/gi, "")
  return (/[a-z]/i.test(compact) && /\d/.test(compact)) || /^\d{5,}$/.test(compact)
}

function modelFamilyTerms(sourceText: string) {
  const text = clean(sourceText)
  const terms: string[] = []
  const opusMatch = text.match(/\bopus\s*800\b/i)
  if (opusMatch) terms.push("Opus 800")
  const seriesMatch = text.match(/\b([a-z]+)\s*(\d{3,4})\s*(?:series|range)\b/i)
  if (seriesMatch?.[1] && seriesMatch?.[2]) terms.push(`${seriesMatch[1]} ${seriesMatch[2]}`)
  return unique(terms)
}

// Model normalisation is deliberately generous for catering plates such as
// OG8115/OP/N: CaterBot searches the exact text, the base model, spaced slash
// variants, compact variants, and model-family words from the detected title.
export function buildModelSearchVariants(model: string | null | undefined, productTitle?: string | null) {
  const raw = clean(model)
  if (!raw) return []

  const variants: string[] = []
  const add = (value: string) => {
    const trimmed = clean(value)
    if (trimmed && !variants.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      variants.push(trimmed)
    }
  }

  add(raw)
  add(raw.replace(/[/_-]+/g, " "))
  add(raw.replace(/[^a-z0-9]/gi, ""))

  const parts = raw.split(/[\/_\-\s]+/).filter(Boolean)
  const base = parts.find((part) => hasPlateIdentifierShape(part)) || parts[0] || ""
  const suffix = parts.filter((part) => part !== base).join("")

  if (base) add(base)
  if (base && suffix) {
    add(`${base}${suffix}`)
    add(`${base} ${suffix}`)
  }

  modelFamilyTerms(productTitle || "").forEach(add)

  return variants.slice(0, 9)
}

function broadEquipmentTerms({
  productTitle,
  equipmentType,
  category,
  fuelType,
}: {
  productTitle?: string | null
  equipmentType?: string | null
  category?: string | null
  fuelType?: string | null
}) {
  const text = clean([productTitle, equipmentType, category, fuelType].filter(Boolean).join(" "))
  const terms: string[] = []

  if (/\bopus\s*800\b/i.test(text)) terms.push("Opus 800")
  if (/\bnatural\s+gas\b/i.test(text)) terms.push("natural gas")
  else if (/\blpg|propane\b/i.test(text)) terms.push("LPG")
  else if (/\belectric\b/i.test(text)) terms.push("electric")

  if (/\bfryer|chip fryer|deep fryer\b/i.test(text)) terms.push("fryer")
  else if (/\bgriddle|grill\b/i.test(text)) terms.push("griddle")
  else if (/\boven|range\b/i.test(text)) terms.push("oven")
  else if (/\bfridge|refrigerator|freezer|chiller\b/i.test(text)) terms.push("refrigeration")
  else if (/\bdishwasher|glasswasher\b/i.test(text)) terms.push("dishwasher")

  return unique(terms)
}

function withBrand(brand: string, value: string) {
  return [brand, value].filter(Boolean).join(" ")
}

function validHttpUrl(value: unknown) {
  const text = clean(value)
  if (!/^https?:\/\//i.test(text)) return ""

  try {
    return new URL(text).toString()
  } catch {
    return ""
  }
}

export function getConfiguredCaterBotSearchProviderName() {
  return isCaterBotWebSearchConfigured() ? "You.com Search" : null
}

export function isCaterBotWebSearchConfigured() {
  return Boolean(process.env.YOU_API_KEY && process.env.CATERBOT_SEARCH_PROVIDER?.toLowerCase() === "you")
}

export function buildCaterBotSourceQueries({
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
}: CaterBotPlateSearchInput) {
  const brandText = clean(brand)
  const modelText = clean(model)
  const serialText = clean(serial)
  const typeText = clean(equipmentType)
  const identity = [brandText, modelText].filter(Boolean).join(" ")

  if (!brandText || !modelText) return []

  const modelVariants = buildModelSearchVariants(modelText, productTitle)
  const equipmentTerms = broadEquipmentTerms({ productTitle, equipmentType, category, fuelType })
  const manufacturerDomain = manufacturerDomainForBrand(brandText)
  const queryList: string[] = []
  const add = (query: string) => {
    const cleanedQuery = query.trim().replace(/\s+/g, " ")
    if (cleanedQuery && !queryList.some((existing) => existing.toLowerCase() === cleanedQuery.toLowerCase())) {
      queryList.push(cleanedQuery)
    }
  }
  const addDomainQueries = (domain: string, terms: string[]) => {
    terms.forEach((term) => add(`site:${domain} ${withBrand(brandText, term)}`))
  }
  const coreTerms = [
    ...modelVariants,
    ...modelVariants.slice(0, 4).map((variant) => `${variant} manual`),
    ...modelVariants.slice(0, 4).map((variant) => `${variant} specification`),
    ...modelVariants.slice(0, 4).map((variant) => `${variant} datasheet PDF`),
    ...equipmentTerms.map((term) => `${modelVariants[0] || modelText} ${term}`),
    ...(equipmentTerms.length ? [equipmentTerms.join(" ")] : []),
  ].filter(Boolean)

  // Priority 1: Catering Appliance user manuals.
  addDomainQueries("catering-appliance.com", coreTerms)
  addDomainQueries("catering-appliance.com/user-manuals", coreTerms)

  // Priority 2: ManualsLib.
  addDomainQueries("manualslib.com", [
    ...modelVariants.map((variant) => `${variant} manual`),
    ...equipmentTerms.map((term) => `${modelVariants[0] || modelText} ${term} manual`),
  ])

  // Priority 3: manufacturer site inferred from the detected brand.
  if (manufacturerDomain) {
    addDomainQueries(manufacturerDomain, [
      ...modelVariants,
      `${modelVariants[0] || modelText} manual`,
      `${modelVariants[0] || modelText} datasheet`,
      `${modelVariants[0] || modelText} specification`,
      ...equipmentTerms.map((term) => `${modelVariants[0] || modelText} ${term}`),
    ])
  }

  // Priorities 4-7: trusted UK catering suppliers.
  TRUSTED_UK_SUPPLIER_DOMAINS.forEach((domain) => {
    addDomainQueries(domain, [
      ...modelVariants.slice(0, 5),
      `${modelVariants[0] || modelText} specification`,
      ...equipmentTerms.map((term) => `${modelVariants[0] || modelText} ${term}`),
    ])
  })

  // Priority 8: general web search, only after trusted sources.
  const generalWebQueries = [
    `${identity} manual`,
    `${identity} spec sheet`,
    `${identity} specification`,
    `${identity} dimensions`,
    `${identity} weight`,
    `${identity} PDF`,
    `${identity} product data sheet`,
    `${identity} installation manual`,
    `${identity} parts manual`,
    [identity, typeText].filter(Boolean).join(" "),
    `${identity} shipping weight`,
    `${identity} net weight`,
    `${identity} gross weight`,
    `${identity} width depth height`,
    `${identity} official manual`,
    `${identity} manufacturer product page`,
    `${identity} manual PDF`,
    `${identity} dimensions weight`,
    ...modelVariants.map((variant) => `${brandText} ${variant} manual`),
    ...modelVariants.map((variant) => `${brandText} ${variant} specification`),
    ...equipmentTerms.map((term) => `${brandText} ${modelVariants[0] || modelText} ${term} datasheet PDF`),
    serialText ? `${brandText} ${serialText} ${modelText} manual` : "",
    [identity, clean(fuelType), clean(voltage), clean(phase), clean(amps), clean(powerRating), clean(gasRating)]
      .filter(Boolean)
      .join(" "),
  ]
  generalWebQueries.forEach(add)

  return unique(queryList.map((query) => query.trim()).filter(Boolean)).slice(0, 48)
}

function youResultItems(data: any) {
  const candidates = [
    data?.results,
    data?.hits,
    data?.web?.results,
    data?.results?.web,
    data?.data?.results,
  ]

  for (const value of candidates) {
    if (Array.isArray(value)) return value
  }

  return []
}

export async function searchYouComQuery(query: string, maxResults: number): Promise<YouComSearchResponse> {
  const apiKey = process.env.YOU_API_KEY
  if (!apiKey) {
    return {
      status: 0,
      results: [],
      error: "YOU_API_KEY is missing",
    }
  }
  if (process.env.CATERBOT_SEARCH_PROVIDER?.toLowerCase() !== "you") {
    return {
      status: 0,
      results: [],
      error: "CATERBOT_SEARCH_PROVIDER must be you",
    }
  }

  const url = new URL(YOU_SEARCH_ENDPOINT)
  url.searchParams.set("query", query)
  url.searchParams.set("count", String(Math.min(10, maxResults)))
  url.searchParams.set("country", "GB")
  url.searchParams.set("safeSearch", "moderate")

  const response = await fetch(url, {
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    return {
      status: response.status,
      results: [],
      error: `You.com Search returned HTTP ${response.status}`,
    }
  }

  const data = await response.json()
  const items = youResultItems(data)

  const results = items
    .map((item: any) => ({
      title: clean(item.title || item.name),
      url: validHttpUrl(item.url || item.link),
      snippet: clean(
        item.description ||
          item.snippet ||
          item.text ||
          (Array.isArray(item.snippets) ? item.snippets.join(" ") : "")
      ),
      provider: "You.com Search" as const,
    }))
    .filter((item: CaterBotSearchResult) => Boolean(item.url))
    .slice(0, maxResults)

  console.info("CaterBot You.com search", {
    query,
    status: response.status,
    resultCount: results.length,
  })

  return {
    status: response.status,
    results,
    error: "",
  }
}

export async function searchCaterBotSources(queries: string[], options: SearchOptions = {}) {
  const maxResults = options.maxResultsPerQuery || 6
  const results: CaterBotSearchResult[] = []
  const errors: string[] = []

  if (!isCaterBotWebSearchConfigured()) {
    return {
      provider: null,
      configured: false,
      results,
      errors,
    }
  }

  for (const query of queries) {
    try {
      const queryResponse = await searchYouComQuery(query, maxResults)
      const queryResults = queryResponse.results

      if (queryResponse.error) {
        errors.push(queryResponse.error)
      }

      for (const result of queryResults) {
        if (!results.some((existing) => existing.url === result.url)) {
          results.push(result)
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `You.com search failed for ${query}`)
    }

    if (results.length >= 30) break
  }

  return {
    provider: "You.com Search" as const,
    configured: true,
    results,
    errors,
  }
}
