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
  provider: "You.com Search" | "Google Programmable Search" | "Serper" | "DataForSEO" | "Existing Search"
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
  bravilor: "bravilor.com",
  "bravilor bonamat": "bravilor.com",
  bonamat: "bravilor.com",
  lincat: "lincat.co.uk",
  falcon: "falconfoodservice.com",
  rational: "rational-online.com",
  hobart: "hobartuk.com",
  foster: "fosterrefrigerator.com",
  winterhalter: "winterhalter.com",
  "blue seal": "blue-seal.co.uk",
  "blue-seal": "blue-seal.co.uk",
  electrolux: "electroluxprofessional.com",
  "electrolux professional": "electroluxprofessional.com",
  true: "true-mfg.com",
  gram: "gram-commercial.com",
  imperial: "imperialrange.com",
  polar: "polar-refrigerator.com",
  buffalo: "buffalo-appliances.com",
  hoshizaki: "hoshizaki-europe.com",
  williams: "williams-refrigeration.co.uk",
  hatco: "hatcocorp.com",
}

const TRUSTED_UK_SUPPLIER_DOMAINS = [
  "nisbets.co.uk",
  "caterkwik.co.uk",
  "cs-catering-equipment.co.uk",
  "allianceonline.co.uk",
  "caterfair.co.uk",
  "angliacateringequipment.com",
  "catering-appliance.com",
  "alexanders-direct.co.uk",
  "h2products.co.uk",
  "electricaldealsdirect.co.uk",
  "ceonline.co.uk",
  "caterquip.co.uk",
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
  if (/\bpolar\b/i.test(text) && /\bu[\s-]?series\b/i.test(text)) terms.push("U-Series")
  if (/\bbravilor|bonamat|bulk\s*brew|coffee|hot\s*water/i.test(text) && /\bb10\s*hw\b/i.test(text)) {
    terms.push("B10 HW")
    terms.push("B10 HW 2 x 10L")
  }
  if (/\belectrolux|green\s*&?\s*clean|hood|pass\s*through|dishwasher/i.test(text) && /\beht8\s*g|505103|9cgx\s*505103/i.test(text)) {
    terms.push("EHT8G")
    terms.push("505103")
    terms.push("9CGX505103")
    terms.push("green&clean hood type dishwasher")
  }
  if (/\bhatco|toast[-\s]?qwik|conveyor\s+toaster/i.test(text) && /\btq[-\s]?805\b/i.test(text)) {
    terms.push("TQ-805")
    terms.push("Toast-Qwik")
    terms.push("electric conveyor toaster")
  }
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

  const compactRaw = raw.replace(/[^a-z0-9]/gi, "").toUpperCase()
  const b10Hw = compactRaw.match(/\b(B10HW)(?:\d{2,4})?\b/)
  if (b10Hw) {
    add("B10 HW")
    add("B10 HW 024")
    add("Bravilor B10 HW")
    add("Bravilor Bonamat B10 HW")
  }

  const alphaNumberAlpha = base.match(/^([A-Z]+)(\d+)([A-Z]+)$/i)
  if (alphaNumberAlpha?.[1] && alphaNumberAlpha?.[2] && alphaNumberAlpha?.[3]) {
    add(`${alphaNumberAlpha[1]}${alphaNumberAlpha[2]} ${alphaNumberAlpha[3]}`)
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
  else if (/\bcoffee|bulk\s*brew|filter\s*coffee|hot\s*water|beverage\b/i.test(text)) terms.push("coffee beverage")
  else if (/\btoast[-\s]?qwik|conveyor\s+toaster|toaster\b/i.test(text)) terms.push("conveyor toaster")
  else if (/\bdishwasher|glasswasher\b/i.test(text)) terms.push("dishwasher")
  else if (/\bwarewashing|hood\s*type|pass\s*through|passthrough\b/i.test(text)) terms.push("hood dishwasher")

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
  const provider = configuredProvider()
  if (provider === "you") return "You.com Search"
  if (provider === "google_cse") return "Google Programmable Search"
  if (provider === "serper") return "Serper"
  if (provider === "dataforseo") return "DataForSEO"
  if (provider === "existing") return "Existing Search"
  return null
}

export function isCaterBotWebSearchConfigured() {
  return Boolean(configuredProvider())
}

function configuredProvider() {
  const configured = process.env.CATERBOT_SEARCH_PROVIDER?.toLowerCase().trim()
  const provider = configured || "you"

  if (provider === "you" && process.env.YOU_API_KEY) return "you"
  if (provider === "google_cse" && process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX) return "google_cse"
  if ((provider === "serper" || provider === "serpapi") && process.env.SERPER_API_KEY) return "serper"
  if (provider === "dataforseo" && process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD) {
    return "dataforseo"
  }
  if (provider === "existing" && process.env.YOU_API_KEY) return "existing"

  return null
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

  const exactIdentity = `"${identity}"`
  const exactModel = `"${modelText}"`
  const primaryVariant = modelVariants[0] || modelText
  const quotedModelVariants = modelVariants.slice(0, 6).map((variant) => `"${brandText} ${variant}"`)
  const combinedContext = `${brandText} ${modelText} ${productTitle || ""} ${equipmentType || ""}`.toLowerCase()
  const looksBravilorB10 =
    /\bbravilor|bonamat|bulk\s*brew|coffee|hot\s*water/.test(combinedContext) &&
    /\bb10\s*hw|b10hw/.test(combinedContext.replace(/[-_/]/g, " "))
  const looksArchway4B = /\barchway\b/.test(combinedContext) && /\b4b\b/.test(combinedContext)
  const looksPolarU632 = /\bpolar\b/.test(combinedContext) && /\bu\s*632|u632\b/.test(combinedContext)
  const looksElectroluxEht8g =
    /\belectrolux|green\s*&?\s*clean|hood|pass\s*through|passthrough|dishwasher/.test(combinedContext) &&
    /\beht8\s*g|505103|9cgx\s*505103/.test(combinedContext)
  const looksHatcoTq805 =
    /\bhatco|toast[-\s]?qwik|conveyor\s+toaster|toaster/.test(combinedContext) &&
    /\btq[-\s]?805|tq805\b/.test(combinedContext)

  // Exact model searches go first. CaterBot must search for the data-plate
  // identifier before broad product/category terms, otherwise products such as
  // Polar U632 get drowned by generic fridge/manual results.
  const exactQueries = [
    `${exactIdentity} dimensions weight`,
    `${exactIdentity} manual`,
    `${exactIdentity} instruction manual pdf`,
    `${exactIdentity} specification`,
    `${exactIdentity} gross weight net weight`,
    `${exactIdentity} width depth height`,
    `${exactIdentity} product data sheet`,
    `${exactIdentity} technical specification`,
    `${exactIdentity} ${typeText}`.trim(),
    `${exactModel} ${brandText} manual`,
    `${exactModel} ${brandText} dimensions weight`,
  ]
  exactQueries.forEach(add)
  quotedModelVariants.forEach((quoted) => {
    add(`${quoted} manual`)
    add(`${quoted} spec sheet`)
    add(`${quoted} dimensions`)
    add(`${quoted} gross weight net weight`)
  })
  equipmentTerms.forEach((term) => {
    add(`"${brandText}" "${primaryVariant}" "${term}" manual`)
    add(`"${brandText}" "${primaryVariant}" "${term}" dimensions weight`)
  })

  if (looksBravilorB10) {
    [
      `"B10HW-024"`,
      `"B10 HW" "Bravilor" dimensions`,
      `"Bravilor Bonamat B10 HW" dimensions weight`,
      `"Bravilor B10 HW" manual pdf`,
      `"Bravilor Bonamat B10 HW 2 x 10L"`,
      `"B10 HW" "11.5kW"`,
      `"B10 HW" "400V" "3N"`,
      `"B10 HW" "47 kg"`,
      `site:caterfair.co.uk "B10 HW"`,
      `site:allianceonline.co.uk "B10 HW"`,
      `site:manualslib.com "Bravilor" "B10 HW"`,
      `site:bravilor.com "B10 HW"`,
    ].forEach(add)
  }

  if (looksArchway4B) {
    [
      `"Archway 4B STD" dimensions weight`,
      `"Archway 4B STD NG" manual`,
      `"Archway 4 burner gas doner kebab grill" dimensions`,
      `"Archway 4 Burner Gas Doner Kebab Grill" manual`,
      `"Archway 4B STD" "565" "655" "1100"`,
      `site:angliacateringequipment.com "Archway 4B STD"`,
      `site:caterfair.co.uk "Archway" "4B STD"`,
      `site:catering-appliance.com "Archway 4B"`,
    ].forEach(add)
  }

  if (looksPolarU632) {
    [
      `"Polar U632" dimensions weight`,
      `"Polar U632" manual`,
      `"Polar U632" instruction manual pdf`,
      `"Polar U632" specification`,
      `"Polar U-Series" "U632" "650"`,
      `site:manualslib.com "Polar U632"`,
      `site:catering-appliance.com "Polar U632"`,
      `site:polar-refrigerator.com "U632"`,
      `site:nisbets.co.uk "Polar U632"`,
    ].forEach(add)
  }

  if (looksElectroluxEht8g) {
    [
      `"Electrolux Professional EHT8G" dimensions weight`,
      `"Electrolux Professional EHT8G" manual pdf`,
      `"Electrolux EHT8G 505103" dimensions`,
      `"EHT8G" "505103" "Electrolux"`,
      `"9CGX505103"`,
      `"505103" "EHT8G" "green&clean"`,
      `"Electrolux green&clean hood type dishwasher" "505103"`,
      `"Electrolux EHT8G" "746" "755" "1549"`,
      `site:electroluxprofessional.com "EHT8G" "505103"`,
      `site:electroluxprofessional.com "green&clean" "505103"`,
      `site:caterkwik.co.uk "EHT8G" "505103"`,
      `site:cs-catering-equipment.co.uk "EHT8G" "505103"`,
      `site:cater2.co.uk "EHT8G" "505103"`,
      `site:manualslib.com "Electrolux" "EHT8G"`,
    ].forEach(add)
  }

  if (looksHatcoTq805) {
    [
      `"Hatco TQ-805" dimensions weight`,
      `"Hatco TQ-805" manual pdf`,
      `"Hatco TQ-805" specification`,
      `"Hatco Toast-Qwik TQ-805" dimensions`,
      `"TQ-805" "3330W" "230V"`,
      `"TQ-805" "368" "578" "422"`,
      `"TQ-805" "28 kg"`,
      `"Toast-Qwik Electric Conveyor Toaster TQ-805"`,
      `site:hatcocorp.com "TQ-805"`,
      `site:caterfair.co.uk "TQ-805"`,
      `site:catering-appliance.com "TQ-805"`,
      `site:manualslib.com "Hatco" "TQ-805"`,
      `site:nisbets.co.uk "Hatco TQ-805"`,
    ].forEach(add)
  }

  // Priority 1: Catering Appliance user manuals.
  addDomainQueries("catering-appliance.com", coreTerms)
  addDomainQueries("catering-appliance.com/user-manuals", coreTerms)
  modelVariants.slice(0, 5).forEach((variant) => {
    add(`site:catering-appliance.com "${brandText} ${variant}"`)
    add(`site:catering-appliance.com "${brandText} ${variant}" manual`)
  })

  // Priority 2: ManualsLib.
  addDomainQueries("manualslib.com", [
    ...modelVariants.map((variant) => `${variant} manual`),
    ...equipmentTerms.map((term) => `${modelVariants[0] || modelText} ${term} manual`),
  ])
  modelVariants.slice(0, 5).forEach((variant) => {
    add(`site:manualslib.com "${brandText} ${variant}"`)
    add(`site:manualslib.com "${brandText} ${variant}" manual`)
  })

  // Priority 3: manufacturer site inferred from the detected brand.
  if (manufacturerDomain) {
    addDomainQueries(manufacturerDomain, [
      ...modelVariants,
      `${modelVariants[0] || modelText} manual`,
      `${modelVariants[0] || modelText} datasheet`,
      `${modelVariants[0] || modelText} specification`,
      ...equipmentTerms.map((term) => `${modelVariants[0] || modelText} ${term}`),
    ])
    modelVariants.slice(0, 5).forEach((variant) => {
      add(`site:${manufacturerDomain} "${variant}" "${brandText}"`)
      add(`site:${manufacturerDomain} "${variant}" manual`)
      add(`site:${manufacturerDomain} "${variant}" specification`)
    })
  }

  // Priorities 4-7: trusted UK catering suppliers.
  TRUSTED_UK_SUPPLIER_DOMAINS.forEach((domain) => {
    addDomainQueries(domain, [
      ...modelVariants.slice(0, 5),
      `${modelVariants[0] || modelText} specification`,
      ...equipmentTerms.map((term) => `${modelVariants[0] || modelText} ${term}`),
    ])
    modelVariants.slice(0, 4).forEach((variant) => {
      add(`site:${domain} "${brandText} ${variant}"`)
      add(`site:${domain} "${brandText} ${variant}" specification`)
    })
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
  const provider = process.env.CATERBOT_SEARCH_PROVIDER?.toLowerCase().trim() || "you"
  if (provider !== "you" && provider !== "existing") {
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

  const youController = new AbortController()
  const youTimeout = setTimeout(() => youController.abort(), 10000)
  const response = await fetch(url, {
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
    },
    signal: youController.signal,
  }).finally(() => clearTimeout(youTimeout))

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

async function searchGoogleCseQuery(query: string, maxResults: number): Promise<YouComSearchResponse> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const cx = process.env.GOOGLE_CSE_CX
  if (!apiKey || !cx) {
    return { status: 0, results: [], error: "GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX is missing" }
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1")
  url.searchParams.set("key", apiKey)
  url.searchParams.set("cx", cx)
  url.searchParams.set("q", query)
  url.searchParams.set("num", String(Math.min(10, maxResults)))
  url.searchParams.set("gl", "uk")

  const gController = new AbortController()
  const gTimeout = setTimeout(() => gController.abort(), 10000)
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: gController.signal }).finally(() => clearTimeout(gTimeout))
  if (!response.ok) {
    return { status: response.status, results: [], error: `Google CSE returned HTTP ${response.status}` }
  }

  const data = await response.json()
  const results = (Array.isArray(data?.items) ? data.items : [])
    .map((item: any) => ({
      title: clean(item.title),
      url: validHttpUrl(item.link),
      snippet: clean(item.snippet),
      provider: "Google Programmable Search" as const,
    }))
    .filter((item: CaterBotSearchResult) => Boolean(item.url))
    .slice(0, maxResults)

  return { status: response.status, results, error: "" }
}

async function searchSerperQuery(query: string, maxResults: number): Promise<YouComSearchResponse> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) return { status: 0, results: [], error: "SERPER_API_KEY is missing" }

  const serperController = new AbortController()
  const serperTimeout = setTimeout(() => serperController.abort(), 10000)
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ q: query, gl: "gb", num: Math.min(10, maxResults) }),
    signal: serperController.signal,
  }).finally(() => clearTimeout(serperTimeout))

  if (!response.ok) {
    return { status: response.status, results: [], error: `Serper returned HTTP ${response.status}` }
  }

  const data = await response.json()
  const results = (Array.isArray(data?.organic) ? data.organic : [])
    .map((item: any) => ({
      title: clean(item.title),
      url: validHttpUrl(item.link),
      snippet: clean(item.snippet),
      provider: "Serper" as const,
    }))
    .filter((item: CaterBotSearchResult) => Boolean(item.url))
    .slice(0, maxResults)

  return { status: response.status, results, error: "" }
}

async function searchDataForSeoQuery(query: string, maxResults: number): Promise<YouComSearchResponse> {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) {
    return { status: 0, results: [], error: "DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD is missing" }
  }

  const dfsController = new AbortController()
  const dfsTimeout = setTimeout(() => dfsController.abort(), 10000)
  const response = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify([
      {
        keyword: query,
        location_code: 2826,
        language_code: "en",
        depth: Math.min(10, maxResults),
      },
    ]),
    signal: dfsController.signal,
  }).finally(() => clearTimeout(dfsTimeout))

  if (!response.ok) {
    return { status: response.status, results: [], error: `DataForSEO returned HTTP ${response.status}` }
  }

  const data = await response.json()
  const items = data?.tasks?.[0]?.result?.[0]?.items
  const results = (Array.isArray(items) ? items : [])
    .filter((item: any) => item.type === "organic")
    .map((item: any) => ({
      title: clean(item.title),
      url: validHttpUrl(item.url),
      snippet: clean(item.description),
      provider: "DataForSEO" as const,
    }))
    .filter((item: CaterBotSearchResult) => Boolean(item.url))
    .slice(0, maxResults)

  return { status: response.status, results, error: "" }
}

async function searchConfiguredProviderQuery(query: string, maxResults: number) {
  const provider = configuredProvider()
  if (provider === "google_cse") return searchGoogleCseQuery(query, maxResults)
  if (provider === "serper") return searchSerperQuery(query, maxResults)
  if (provider === "dataforseo") return searchDataForSeoQuery(query, maxResults)
  return searchYouComQuery(query, maxResults)
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
      const queryResponse = await searchConfiguredProviderQuery(query, maxResults)
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
    provider: getConfiguredCaterBotSearchProviderName(),
    configured: true,
    results,
    errors,
  }
}
