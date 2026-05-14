export type CaterBotSourceValidationInput = {
  url: string
  brand?: string | null
  model?: string | null
  equipmentType?: string | null
}

export type CaterBotSourceValidationResult = {
  valid: boolean
  url: string
  sourceName: string
  sourceType: string
  confidence: "high" | "medium" | "low"
  checkedAt: string
  matchNotes: string
  usefulDetails: string[]
  extractedSpecs: {
    dimensions?: string
    weight?: string
    voltage?: string
    phase?: string
    amps?: string
    kwRating?: string
    gasType?: string
    capacity?: string
  }
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

function sourcePriority(url: string) {
  const lowerUrl = url.toLowerCase()

  if (lowerUrl.includes("manualslib.com/manual/")) return 0
  if (lowerUrl.includes("manualslib.com/products/")) return 1
  if (isManualsLibUrl(url)) return 2
  if (lowerUrl.includes("/manual") || lowerUrl.includes("usermanual")) return 3
  if (lowerUrl.includes("spec") || lowerUrl.includes(".pdf")) return 4

  return 5
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

  add(raw)

  const parts = raw.split(/[-\s_/]+/).filter(Boolean)
  for (let index = 1; index < parts.length; index += 1) {
    add(parts.slice(index).join("-"))
  }

  return terms.slice(0, 4)
}

function modelMatchAliases(model: string | null | undefined) {
  return modelSearchTerms(model)
    .map((term) => compactModel(term))
    .filter((term) => term.length >= 4 && hasPlateIdentifierShape(term))
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
    return host.includes("lincat") || host.includes("rational") || host.includes("hobart")
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
  return label ? `${label} manual / spec source (${host})` : `Manual / spec source (${host})`
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

function extractedSpecsFrom(text: string): CaterBotSourceValidationResult["extractedSpecs"] {
  return {
    dimensions: firstMatch(text, [
      /\b(?:dimensions?|size|w\s?x\s?d\s?x\s?h)[^\d]{0,24}(\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?)/i,
      /\b(\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?\s?[x×]\s?\d{2,4}\s?(?:mm|cm)?)\b/i,
    ]),
    weight: firstMatch(text, [/\b(?:weight|net weight|packed weight)[^\d]{0,24}(\d{1,4}(?:\.\d+)?\s?kg)\b/i]),
    voltage: firstMatch(text, [/\b(2[23]0v|240v|400v|415v)\b/i]),
    phase: firstMatch(text, [/\b(single phase|three phase|3 phase|1 phase|3-phase|1-phase)\b/i]),
    amps: firstMatch(text, [/\b(\d{1,3}(?:\.\d+)?\s?a(?:mp|mps)?)\b/i]),
    kwRating: firstMatch(text, [/\b(\d{1,3}(?:\.\d+)?\s?kW)\b/i]),
    gasType: firstMatch(text, [/\b(natural gas|lpg|propane)\b/i]),
    capacity: firstMatch(text, [/\b(?:capacity)[^\d]{0,24}(\d{1,4}(?:\.\d+)?\s?(?:litres?|ltr|trays?|kg))\b/i]),
  }
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

export async function validateCaterBotProductSource({
  url,
  brand,
  model,
  equipmentType,
}: CaterBotSourceValidationInput): Promise<CaterBotSourceValidationResult> {
  const checkedAt = new Date().toISOString()
  const sourceName = sourceNameFor(url, brand || "", model || "")
  const sourceType = sourceTypeFor(url)

  if (isGenericOrBadUrl(url)) {
    return {
      valid: false,
      url: "",
      sourceName,
      sourceType,
      confidence: "low",
      checkedAt,
      matchNotes: "CaterBot rejected this source because it is generic or not a direct product/manual page.",
      usefulDetails: [],
      extractedSpecs: {},
    }
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
      return {
        valid: false,
        url: "",
        sourceName,
        sourceType,
        confidence: "low",
        checkedAt,
        matchNotes: `CaterBot checked the source but it returned HTTP ${response.status}.`,
        usefulDetails: [],
        extractedSpecs: {},
      }
    }

    const contentType = response.headers.get("content-type") || ""
    const finalUrl = response.url || url
    const hostAndUrlText = clean(`${url} ${finalUrl} ${getHostname(finalUrl)}`)
    const brandText = clean(normaliseManualLookupBrand(brand || ""))
    const modelAliases = modelMatchAliases(model)

    let bodyText = ""
    if (!contentType.includes("pdf")) {
      const raw = await response.text()
      bodyText = raw
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 50000)
    }

    const combinedText = clean(`${url} ${finalUrl} ${getHostname(finalUrl)} ${bodyText}`)
    const compactCombinedText = compactModel(`${url} ${finalUrl} ${bodyText}`)
    const brandMatches = !brandText || combinedText.includes(brandText) || hostAndUrlText.includes(brandText)
    const exactModelMatches =
      modelAliases.length > 0 &&
      modelAliases.some(
        (modelText) => compactCombinedText.includes(modelText) || compactModel(finalUrl).includes(modelText)
      )
    const equipmentMatches = sourceMatchesEquipment(combinedText, equipmentType)
    const brandCanBeRelaxed = isManualsLibUrl(finalUrl) && exactModelMatches && equipmentMatches
    const usefulDetails = usefulDetailsFrom(`${finalUrl} ${bodyText}`)
    const extractedSpecs = extractedSpecsFrom(bodyText)

    if (!exactModelMatches || (!brandMatches && !brandCanBeRelaxed)) {
      return {
        valid: false,
        url: "",
        sourceName,
        sourceType,
        confidence: "low",
        checkedAt,
        matchNotes:
          "CaterBot could not verify the same model or GC number on this source.",
        usefulDetails,
        extractedSpecs,
      }
    }

    const confidence: "high" | "medium" =
      equipmentMatches || usefulDetails.length >= 2 ? "high" : "medium"

    return {
      valid: true,
      url: finalUrl,
      sourceName: sourceNameFor(finalUrl, brand || "", model || ""),
      sourceType: sourceTypeFor(finalUrl),
      confidence,
      checkedAt,
      matchNotes: isManualsLibUrl(finalUrl) && !brandMatches
        ? "CaterBot matched the exact data-plate identifier on ManualsLib. The seller should confirm the brand because this may be an OEM or rebranded item."
        : isManualsLibUrl(finalUrl)
        ? "CaterBot matched the same brand and exact data-plate identifier on ManualsLib."
        : confidence === "high"
          ? "CaterBot matched the same brand and exact data-plate identifier on a useful product/manual source."
          : "CaterBot matched the same brand and exact data-plate identifier, but the seller should check the source carefully.",
      usefulDetails,
      extractedSpecs,
    }
  } catch {
    return {
      valid: false,
      url: "",
      sourceName,
      sourceType,
      confidence: "low",
      checkedAt,
      matchNotes: "CaterBot could not load this source reliably.",
      usefulDetails: [],
      extractedSpecs: {},
    }
  }
}

function extractDuckDuckGoUrls(html: string) {
  const urls = new Set<string>()
  const hrefPattern = /href="([^"]+)"/gi
  let match: RegExpExecArray | null

  while ((match = hrefPattern.exec(html)) && urls.size < 12) {
    const href = match[1].replace(/&amp;/g, "&")
    try {
      if (href.includes("uddg=")) {
        const parsed = new URL(href, "https://duckduckgo.com")
        const target = parsed.searchParams.get("uddg")
        if (target && /^https?:\/\//i.test(target)) urls.add(decodeURIComponent(target))
      } else if (/^https?:\/\//i.test(href)) {
        urls.add(href)
      }
    } catch {
      // Ignore malformed result links.
    }
  }

  return Array.from(urls)
}

export async function findValidatedCaterBotSource({
  brand,
  model,
  equipmentType,
  candidateUrls = [],
}: {
  brand?: string | null
  model?: string | null
  equipmentType?: string | null
  candidateUrls?: string[]
}) {
  const brandText = normaliseManualLookupBrand(String(brand || "").trim())
  const modelText = String(model || "").trim()
  if (!modelText) return null

  const candidates = new Set(candidateUrls.filter((url) => !isGenericOrBadUrl(url)))

  const manualsLibCandidates = await findManualsLibCandidateUrls({
    brand: brandText,
    model: modelText,
    equipmentType,
  })
  manualsLibCandidates.forEach((url) => candidates.add(url))

  const queries =
    manualsLibCandidates.length > 0
      ? []
      : [
          ["site:manualslib.com/manual", brandText, modelText].filter(Boolean).join(" "),
          ["site:manualslib.com/products", brandText, modelText].filter(Boolean).join(" "),
          ["site:manualslib.com/manual", brandText, modelText, equipmentType || ""].filter(Boolean).join(" "),
          [brandText, modelText, "manual"].filter(Boolean).join(" "),
          [brandText, modelText, "spec sheet"].filter(Boolean).join(" "),
          [brandText, modelText, "dimensions weight"].filter(Boolean).join(" "),
          [brandText, modelText, "product data sheet"].filter(Boolean).join(" "),
        ]

  for (const query of queries) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 7000)
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent": "CaterBidsUK-CaterBot/1.0 (+https://caterbids.uk)",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))
      if (response.ok) {
        extractDuckDuckGoUrls(await response.text()).forEach((url) => candidates.add(url))
      }
    } catch {
      // Search is a best-effort helper. Validation below is the gate.
    }

    if (candidates.size >= 10) break
  }

  for (const url of Array.from(candidates).sort((a, b) => sourcePriority(a) - sourcePriority(b)).slice(0, 12)) {
    const validation = await validateCaterBotProductSource({
      url,
      brand: brandText,
      model: modelText,
      equipmentType,
    })

    if (validation.valid) return validation
  }

  return null
}
