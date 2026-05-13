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

function isGenericOrBadUrl(url: string) {
  const lower = url.toLowerCase()
  if (!/^https?:\/\//i.test(url)) return true
  if (lower.includes("google.com/search")) return true
  if (lower.includes("bing.com/search")) return true
  if (lower.includes("duckduckgo.com")) return true
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
    })
    clearTimeout(timeout)

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
    const hostAndUrlText = clean(`${finalUrl} ${getHostname(finalUrl)}`)
    const brandText = clean(brand)
    const modelText = clean(model)
    const compactModelText = compactModel(model)

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

    const combinedText = clean(`${finalUrl} ${getHostname(finalUrl)} ${bodyText}`)
    const compactCombinedText = compactModel(`${finalUrl} ${bodyText}`)
    const brandMatches = !brandText || combinedText.includes(brandText) || hostAndUrlText.includes(brandText)
    const exactModelMatches =
      Boolean(compactModelText) &&
      (compactCombinedText.includes(compactModelText) || compactModel(finalUrl).includes(compactModelText))
    const equipmentMatches = !equipmentType || combinedText.includes(clean(equipmentType))
    const usefulDetails = usefulDetailsFrom(`${finalUrl} ${bodyText}`)
    const extractedSpecs = extractedSpecsFrom(bodyText)

    if (!brandMatches || !exactModelMatches) {
      return {
        valid: false,
        url: "",
        sourceName,
        sourceType,
        confidence: "low",
        checkedAt,
        matchNotes:
          "CaterBot could not verify the same brand and exact model number on this source.",
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
      matchNotes:
        confidence === "high"
          ? "CaterBot matched the same brand and exact model on a useful product/manual source."
          : "CaterBot matched the same brand and exact model, but the seller should check the source carefully.",
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
  const brandText = String(brand || "").trim()
  const modelText = String(model || "").trim()
  if (!brandText || !modelText) return null

  const candidates = new Set(candidateUrls.filter((url) => !isGenericOrBadUrl(url)))
  const queries = [
    `${brandText} ${modelText} manual`,
    `${brandText} ${modelText} spec sheet`,
    `${brandText} ${modelText} dimensions weight`,
    `${brandText} ${modelText} product data sheet`,
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
      })
      clearTimeout(timeout)
      if (response.ok) {
        extractDuckDuckGoUrls(await response.text()).forEach((url) => candidates.add(url))
      }
    } catch {
      // Search is a best-effort helper. Validation below is the gate.
    }

    if (candidates.size >= 10) break
  }

  for (const url of Array.from(candidates).slice(0, 10)) {
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
