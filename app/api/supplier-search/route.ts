import { NextResponse } from "next/server"

export const revalidate = 3600

type SupplierItem = {
  id: string
  title: string
  snippet: string
  link: string
  source: string
  domain: string
  image: string | null
  imageType: "product" | "supplier-logo" | "fallback"
  badge: "Used supplier" | "Supplier search shortcut"
  fallback?: boolean
}

type TrustedSupplier = {
  name: string
  domain: string
  baseUrl: string
  searchPath?: string
  searchParam?: string
  snippet: string
}

type SearchApiOrganicResult = {
  title?: string
  snippet?: string
  link?: string
  source?: string
  displayed_link?: string
  domain?: string
  thumbnail?: string
  image?: string
  favicon?: string
}

const SEARCHAPI_ENDPOINT = "https://www.searchapi.io/api/v1/search"

const FALLBACK_IMAGES = {
  sink: "/supplier-placeholders/sink.jpg",
  fryer: "/supplier-placeholders/fryer.jpg",
  oven: "/supplier-placeholders/oven.jpg",
  fridge: "/supplier-placeholders/fridge.jpg",
  glasswasher: "/supplier-placeholders/glasswasher.jpg",
  kebab: "/supplier-placeholders/kebab-machine.jpg",
  prepTable: "/supplier-placeholders/prep-table.jpg",
  default: "/supplier-placeholders/catering-equipment.jpg",
}

const SUPPLIER_LOGOS: Record<string, string> = {
  "caterquip.co.uk": "/supplier-logos/caterquip.png",
  "adexa.co.uk": "/supplier-logos/adexa.png",
  "caterbay.co.uk": "/supplier-logos/caterbay.png",
  "caterfair.co.uk": "/supplier-logos/caterfair.png",
  "cenlimited.co.uk": "/supplier-logos/cen.png",
  "catercombi.com": "/supplier-logos/catercombi.png",
  "islandcatering.co.uk": "/supplier-logos/island-catering.png",
  "redhotchilli.catering": "/supplier-logos/red-hot-chilli.png",
  "kitchenclearanceuk.co.uk": "/supplier-logos/kitchen-clearance-uk.png",
  "caterkwik.co.uk": "/supplier-logos/caterkwik.png",
  "herits.co.uk": "/supplier-logos/herits.png",
  "gmse.co.uk": "/supplier-logos/gmse.png",
  "caterlineltd.co.uk": "/supplier-logos/caterline.png",
  "stevescateringbuyerssellers.co.uk": "/supplier-logos/steves-catering.png",
}

const TRUSTED_USED_SUPPLIER_DOMAINS = [
  "caterquip.co.uk",
  "adexa.co.uk",
  "caterbay.co.uk",
  "caterfair.co.uk",
  "cenlimited.co.uk",
  "catercombi.com",
  "islandcatering.co.uk",
  "redhotchilli.catering",
  "kitchenclearanceuk.co.uk",
  "caterkwik.co.uk",
  "herits.co.uk",
  "gmse.co.uk",
  "caterlineltd.co.uk",
  "stevescateringbuyerssellers.co.uk",
]

const FALLBACK_SUPPLIERS: TrustedSupplier[] = [
  {
    name: "CaterQuip",
    domain: "caterquip.co.uk",
    baseUrl: "https://www.caterquip.co.uk",
    searchPath: "/search",
    searchParam: "q",
    snippet: "Used and reconditioned commercial catering equipment from a trusted UK supplier.",
  },
  {
    name: "Adexa",
    domain: "adexa.co.uk",
    baseUrl: "https://www.adexa.co.uk",
    searchPath: "/search",
    searchParam: "search",
    snippet: "Commercial kitchen machines, stainless steel equipment and catering clearance lines.",
  },
  {
    name: "Caterbay",
    domain: "caterbay.co.uk",
    baseUrl: "https://www.caterbay.co.uk",
    searchPath: "/search",
    searchParam: "q",
    snippet: "Second-hand catering equipment marketplace and supplier search shortcut.",
  },
  {
    name: "Caterfair",
    domain: "caterfair.co.uk",
    baseUrl: "https://www.caterfair.co.uk",
    searchPath: "/search",
    searchParam: "q",
    snippet: "Used catering equipment and commercial kitchen stock from UK sellers.",
  },
  {
    name: "CEN Limited",
    domain: "cenlimited.co.uk",
    baseUrl: "https://www.cenlimited.co.uk",
    searchPath: "/search",
    searchParam: "q",
    snippet: "Catering equipment, servicing and used commercial kitchen equipment supply.",
  },
  {
    name: "CaterCombi",
    domain: "catercombi.com",
    baseUrl: "https://www.catercombi.com",
    searchPath: "/search",
    searchParam: "q",
    snippet: "Specialist combi oven and refurbished catering equipment supplier.",
  },
  {
    name: "Island Catering",
    domain: "islandcatering.co.uk",
    baseUrl: "https://www.islandcatering.co.uk",
    searchPath: "/search",
    searchParam: "q",
    snippet: "UK supplier for catering equipment, reconditioned appliances and kitchen kit.",
  },
  {
    name: "Red Hot Chilli",
    domain: "redhotchilli.catering",
    baseUrl: "https://redhotchilli.catering",
    searchPath: "/search",
    searchParam: "q",
    snippet: "Used catering equipment and commercial kitchen clearance stock.",
  },
  {
    name: "Kitchen Clearance UK",
    domain: "kitchenclearanceuk.co.uk",
    baseUrl: "https://www.kitchenclearanceuk.co.uk",
    searchPath: "/search",
    searchParam: "q",
    snippet: "Commercial kitchen clearance and second-hand catering equipment.",
  },
  {
    name: "Caterkwik",
    domain: "caterkwik.co.uk",
    baseUrl: "https://www.caterkwik.co.uk",
    searchPath: "/shop/search",
    searchParam: "search_query",
    snippet: "Commercial catering equipment including clearance, refrigeration and warewashing.",
  },
  {
    name: "Herits",
    domain: "herits.co.uk",
    baseUrl: "https://www.herits.co.uk",
    searchPath: "/search",
    searchParam: "q",
    snippet: "Used catering equipment and refurbished commercial kitchen supplies.",
  },
  {
    name: "GMS Equipment",
    domain: "gmse.co.uk",
    baseUrl: "https://www.gmse.co.uk",
    searchPath: "/search",
    searchParam: "q",
    snippet: "Second-hand and refurbished catering equipment supplier.",
  },
]

function supplierSearchUrl(supplier: TrustedSupplier, query: string) {
  if (!supplier.searchPath || !supplier.searchParam) {
    return supplier.baseUrl
  }

  const url = new URL(supplier.searchPath, supplier.baseUrl)
  url.searchParams.set(supplier.searchParam, query.trim() || "used catering equipment")
  return url.toString()
}

function fallbackSupplierItems(query: string): SupplierItem[] {
  const cleanQuery = query.trim() || "used catering equipment"

  return FALLBACK_SUPPLIERS.map((supplier) => {
    const logo = getSupplierLogo(supplier.domain)

    return {
      id: `fallback-${supplier.domain}`,
      title: `${supplier.name}: search ${cleanQuery}`,
      snippet: supplier.snippet,
      link: supplierSearchUrl(supplier, cleanQuery),
      source: supplier.domain,
      domain: supplier.domain,
      image: logo || getFallbackImage(`${supplier.name} ${supplier.snippet}`, cleanQuery),
      imageType: logo ? "supplier-logo" : "fallback",
      badge: "Supplier search shortcut",
      fallback: true,
    }
  })
}

function domainFor(url: string, fallbackDomain = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    return fallbackDomain.replace(/^www\./, "").toLowerCase()
  }
}

function isTrustedDomain(domain: string) {
  return TRUSTED_USED_SUPPLIER_DOMAINS.some((trustedDomain) =>
    domain === trustedDomain || domain.endsWith(`.${trustedDomain}`)
  )
}

function cleanDisplayedDomain(value = "") {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    .toLowerCase()
}

function getSupplierLogo(domain: string): string | null {
  const cleanDomain = domain.replace(/^www\./, "").toLowerCase()
  const directLogo = SUPPLIER_LOGOS[cleanDomain]
  if (directLogo) return directLogo

  const matchedDomain = Object.keys(SUPPLIER_LOGOS).find((supplierDomain) =>
    cleanDomain === supplierDomain || cleanDomain.endsWith(`.${supplierDomain}`)
  )

  return matchedDomain ? SUPPLIER_LOGOS[matchedDomain] : null
}

function isLikelySupplierLogo(imageUrl: string) {
  return /(logo|favicon|sprite|placeholder|no-image|noimage|payment|trustpilot|klarna|paypal|rating|rated|review|stars?|years?|warranty|guarantee|finance|interest[-_\s]?free|iwoca|delivery|shipping|fast-e|banner|icon|red[-_]?hot[-_]?chilli[-_]?white|catercombi[_-]?png)/i.test(imageUrl)
}

function isBadProductImage(imageUrl = "") {
  if (!imageUrl) return true
  if (!/^https?:\/\//i.test(imageUrl)) return true
  if (/\.(svg|ico)(\?|#|$)/i.test(imageUrl)) return true
  if (/encrypted-tbn\d*\.gstatic\.com/i.test(imageUrl)) return true
  if (isLikelySupplierLogo(imageUrl)) return true
  if (/(^|[?&])(w|width|h|height)=([1-9][0-9]|1[0-9]{2}|2[0-4][0-9])(\D|$)/i.test(imageUrl)) return true
  if (/[-_/](\d{1,2}|1\d{2}|2[0-4]\d)x(\d{1,2}|1\d{2}|2[0-4]\d)(\D|$)/i.test(imageUrl)) return true

  return false
}

function resultImage(result: SearchApiOrganicResult) {
  const image = result.thumbnail || result.image || ""
  return isBadProductImage(image) ? null : image
}

function getFallbackImage(title: string, query: string) {
  const value = `${title} ${query}`.toLowerCase()

  if (/(sink|bowl|wash basin|washbasin)/.test(value)) return FALLBACK_IMAGES.sink
  if (/(fryer|chip fryer)/.test(value)) return FALLBACK_IMAGES.fryer
  if (/(oven|combi|rational)/.test(value)) return FALLBACK_IMAGES.oven
  if (/(fridge|freezer|refrigeration|chiller|chilled)/.test(value)) return FALLBACK_IMAGES.fridge
  if (/(glasswasher|dishwasher|warewasher|warewashing)/.test(value)) return FALLBACK_IMAGES.glasswasher
  if (/(kebab|doner|gyro|gyros)/.test(value)) return FALLBACK_IMAGES.kebab
  if (/(stainless|table|prep|preparation)/.test(value)) return FALLBACK_IMAGES.prepTable

  return FALLBACK_IMAGES.default
}

function imageCategory(value: string) {
  const text = decodeURIComponent(value).toLowerCase()

  if (/(sink|bowl|wash basin|washbasin)/.test(text)) return "sink"
  if (/(fryer|chip fryer)/.test(text)) return "fryer"
  if (/(oven|combi|rational|boiling|hob|griddle|cooker)/.test(text)) return "oven"
  if (/(fridge|freezer|refrigeration|chiller|chilled|refrigerator)/.test(text)) return "fridge"
  if (/(glasswasher|dishwasher|warewasher|warewashing)/.test(text)) return "glasswasher"
  if (/(kebab|doner|gyro|gyros)/.test(text)) return "kebab"
  if (/(stainless|table|prep|preparation)/.test(text)) return "prep"

  return ""
}

function isImageRelevantToSearch(imageUrl: string, title: string, query: string) {
  if (!imageUrl) return false

  const expectedCategory = imageCategory(query) || imageCategory(title)
  const imageUrlCategory = imageCategory(imageUrl)

  if (expectedCategory) return imageUrlCategory === expectedCategory
  return true
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function attributeValue(tag: string, attribute: string) {
  const match = tag.match(new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "i"))
  return match?.[1] ? decodeHtml(match[1].trim()) : ""
}

function resolveImageUrl(imageUrl: string, pageUrl: string) {
  if (!imageUrl) return null

  try {
    const resolved = new URL(decodeHtml(imageUrl), pageUrl)
    if (!["http:", "https:"].includes(resolved.protocol)) return null
    if (resolved.toString() === pageUrl) return null
    return resolved.toString()
  } catch {
    return null
  }
}

function findMetaImage(html: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || []
  const names = ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src", "image"]

  for (const name of names) {
    for (const tag of metaTags) {
      const property = attributeValue(tag, "property") || attributeValue(tag, "name") || attributeValue(tag, "itemprop")
      if (property.toLowerCase() !== name.toLowerCase()) continue

      const content = attributeValue(tag, "content")
      if (content) return content
    }
  }

  return ""
}

function firstJsonLdImageValue(value: unknown): string {
  if (!value) return ""
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = firstJsonLdImageValue(item)
      if (image) return image
    }
  }
  if (typeof value === "object") {
    const objectValue = value as { url?: unknown; image?: unknown; "@type"?: unknown; name?: unknown }
    if (typeof objectValue.url === "string") return objectValue.url
    if (objectValue.image) return firstJsonLdImageValue(objectValue.image)
  }

  return ""
}

function findJsonLdImage(html: string) {
  const scripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || []

  for (const script of scripts) {
    const jsonText = script
      .replace(/<script\b[^>]*>/i, "")
      .replace(/<\/script>/i, "")
      .trim()

    try {
      const parsed = JSON.parse(jsonText)
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed]

      while (stack.length > 0) {
        const current = stack.shift()
        if (!current || typeof current !== "object") continue

        const image = firstJsonLdImageValue((current as { image?: unknown }).image)
        if (image) return image

        for (const value of Object.values(current)) {
          if (Array.isArray(value)) stack.push(...value)
          else if (value && typeof value === "object") stack.push(value)
        }
      }
    } catch {
      // Supplier pages sometimes include malformed structured data.
    }
  }

  return ""
}

function findProductImg(html: string, title: string, query: string) {
  const imgTags = html.match(/<img\b[^>]*>/gi) || []
  const terms = `${title} ${query}`.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 3)

  for (const tag of imgTags) {
    const src =
      attributeValue(tag, "src") ||
      attributeValue(tag, "data-src") ||
      attributeValue(tag, "data-original") ||
      attributeValue(tag, "data-lazy-src") ||
      attributeValue(tag, "data-zoom-image")
    const label = [
      attributeValue(tag, "alt"),
      attributeValue(tag, "title"),
      attributeValue(tag, "class"),
      attributeValue(tag, "id"),
      src,
    ].join(" ").toLowerCase()

    if (!src || isLikelySupplierLogo(label)) continue
    if (/(product|category|catalog|collection|media|image|photo|zoom)/.test(label)) return src
    if (terms.some((term) => label.includes(term))) return src
  }

  return ""
}

async function getPageImage(url: string, title = "", query = ""): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "CaterBidsUKBot/1.0 (+https://caterbids.uk)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })

    if (!response.ok) return null
    if (!(response.headers.get("content-type") || "").includes("text/html")) return null

    const html = (await response.text()).slice(0, 300000)
    const candidate =
      findMetaImage(html) ||
      findJsonLdImage(html) ||
      findProductImg(html, title, query)
    const image = resolveImageUrl(candidate, url)

    return image && !isBadProductImage(image) && isImageRelevantToSearch(image, title, query) ? image : null
  } catch {
    return null
  }
}

function mapOrganicResult(result: SearchApiOrganicResult, index: number): SupplierItem | null {
  const link = result.link || ""
  if (!link) return null

  const displayedDomain = cleanDisplayedDomain(result.displayed_link || result.source || result.domain || "")
  const domain = domainFor(link, displayedDomain)
  if (!domain) return null

  return {
    id: link || `${domain}-${index}`,
    title: result.title || "Used supplier page",
    snippet: result.snippet || "",
    link,
    source: domain,
    domain,
    image: resultImage(result),
    imageType: "product",
    badge: "Used supplier",
  }
}

async function finaliseSupplierImage(item: SupplierItem, query: string) {
  const apiImage = item.image && isImageRelevantToSearch(item.image, item.title, query) ? item.image : null
  const pageImage = apiImage ? null : await getPageImage(item.link, item.title, query)
  const supplierLogo = getSupplierLogo(item.domain)
  const fallbackImage = getFallbackImage(item.title, query)

  const finalImage = apiImage || pageImage || supplierLogo || fallbackImage
  const imageType = apiImage || pageImage ? "product" : supplierLogo ? "supplier-logo" : "fallback"

  return {
    ...item,
    image: finalImage,
    imageType,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || ""
  const cleanQuery = query.trim() || "used catering equipment"
  const apiKey = process.env.SEARCHAPI_KEY

  if (!apiKey) {
    return NextResponse.json({
      items: fallbackSupplierItems(cleanQuery),
      fallback: true,
      warning: "Supplier search is using shortcut cards because SearchAPI.io is not configured.",
    })
  }

  const url = new URL(SEARCHAPI_ENDPOINT)
  url.searchParams.set("engine", "google")
  url.searchParams.set("q", `${cleanQuery} second hand used refurbished catering equipment UK`)
  url.searchParams.set("gl", "gb")
  url.searchParams.set("hl", "en")
  url.searchParams.set("api_key", apiKey)

  try {
    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn("SearchAPI supplier search failed:", response.status, errorText)
      return NextResponse.json({
        items: fallbackSupplierItems(cleanQuery),
        fallback: true,
        warning: "Supplier search is using shortcut cards because live used supplier search failed.",
      })
    }

    const data = await response.json()
    const organicResults = (Array.isArray(data.organic_results) ? data.organic_results : []) as SearchApiOrganicResult[]
    const mappedResults = organicResults
      .map(mapOrganicResult)
      .filter((item): item is SupplierItem => Boolean(item))

    const trustedResults = mappedResults.filter((item) => isTrustedDomain(item.domain))
    const selectedResults = (trustedResults.length > 0 ? trustedResults : mappedResults).slice(0, 12)

    if (selectedResults.length === 0) {
      return NextResponse.json({
        items: fallbackSupplierItems(cleanQuery),
        fallback: true,
        warning: "Supplier search is using shortcut cards because no live used supplier results were returned.",
      })
    }

    const itemsWithImages = await Promise.all(
      selectedResults.map((item) => finaliseSupplierImage(item, cleanQuery))
    )

    return NextResponse.json(
      {
        items: itemsWithImages,
        fallback: false,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    )
  } catch (error) {
    console.warn("SearchAPI supplier search error:", error)
    return NextResponse.json({
      items: fallbackSupplierItems(cleanQuery),
      fallback: true,
      warning: "Supplier search is using shortcut cards because live used supplier search failed.",
    })
  }
}
