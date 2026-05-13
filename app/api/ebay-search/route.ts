import { NextResponse } from "next/server"
import { analyseSearchQuery } from "@/lib/search-intelligence"
import { buildEbayQuery, filterAndRankResults } from "@/lib/search/caterbidsSearchRules"

export const dynamic = "force-dynamic"

const EBAY_CONDITION_FILTERS: Record<string, string> = {
  new: "conditionIds:{1000|1500}",
  used: "conditionIds:{3000}",
  refurbished: "conditionIds:{2000|2010|2020|2030|2500}",
}

const EBAY_PAGE_SIZE = 50
const EBAY_OFFSETS = [0]
const MAX_RETURNED_EBAY_RESULTS = 50

type EbaySummary = {
  itemId?: string
  itemWebUrl?: string
  title?: string
  city?: string
  location?: string
  itemLocation?: {
    city?: string
    postalCode?: string
    country?: string
  }
  [key: string]: unknown
}

function ebayItemKey(item: EbaySummary) {
  return item.itemId || item.itemWebUrl || item.title || crypto.randomUUID()
}

function dedupeEbayItems<T extends EbaySummary>(items: T[]) {
  return Array.from(new Map(items.map((item) => [ebayItemKey(item), item])).values())
}

function ebayLocationMatches(item: EbaySummary, city: string) {
  const location = [
    item.itemLocation?.city,
    item.itemLocation?.postalCode,
    item.itemLocation?.country,
    item.location,
    item.city,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return location.includes(city)
}

async function getEbayToken() {
  const clientId = process.env.EBAY_APP_ID
  const clientSecret = process.env.EBAY_CERT_ID

  if (!clientId || !clientSecret) {
    throw new Error("Missing EBAY_APP_ID or EBAY_CERT_ID")
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  })

  const data = await res.json()

  if (!data.access_token) {
    throw new Error(JSON.stringify(data))
  }

  return data.access_token
}

async function fetchEbayQuery(ebayQuery: string, token: string, filters: string[], offset: number) {
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search")
  url.searchParams.set("q", ebayQuery)
  url.searchParams.set("limit", String(EBAY_PAGE_SIZE))
  url.searchParams.set("offset", String(offset))
  url.searchParams.set("fieldgroups", "EXTENDED")
  url.searchParams.set("filter", filters.join(","))

  try {
    const ebayRes = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB",
      },
    })

    if (!ebayRes.ok) {
      const body = await ebayRes.text()
      console.warn(`eBay query failed (${ebayRes.status}) for "${ebayQuery}":`, body)
      return []
    }

    const data = await ebayRes.json()
    return Array.isArray(data.itemSummaries) ? data.itemSummaries : []
  } catch (error) {
    console.warn(`eBay query fetch failed for "${ebayQuery}":`, error)
    return []
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q") || "commercial catering equipment"
  const condition = searchParams.get("condition") || "all"
  const category = searchParams.get("category") || "all"
  const city = searchParams.get("city")?.toLowerCase().trim() || ""
  const searchAnalysis = analyseSearchQuery(query)

  try {
    const token = await getEbayToken()

    const filters = ["itemLocationCountry:GB", "deliveryCountry:GB"]
    const conditionFilter = EBAY_CONDITION_FILTERS[condition]
    if (conditionFilter) {
      filters.push(conditionFilter)
    }

    const ebayQueries = buildEbayQuery(category, query, condition)
    const responseItems = await Promise.all(
      ebayQueries.flatMap((ebayQuery) =>
        EBAY_OFFSETS.map((offset) => fetchEbayQuery(ebayQuery, token, filters, offset))
      )
    )
    const rawItems = responseItems.flat()
    const mappedItems: EbaySummary[] = rawItems.map((item) => {
      const location =
        item.itemLocation?.city ||
        item.itemLocation?.postalCode ||
        item.itemLocation?.country ||
        "UK"

      return {
        ...item,
        city: location,
        location,
      }
    })
    const matchingCityItems = city ? mappedItems.filter((item) => ebayLocationMatches(item, city)) : []
    const cityFirstItems = city
      ? dedupeEbayItems([
          ...matchingCityItems,
          ...mappedItems.filter((item) => !matchingCityItems.some((match) => ebayItemKey(match) === ebayItemKey(item))),
        ])
      : mappedItems
    const uniqueItems = dedupeEbayItems(cityFirstItems)
    const rankedItems = filterAndRankResults(uniqueItems, {
      category,
      query,
      allowParts: searchAnalysis.allowParts,
    }).slice(0, MAX_RETURNED_EBAY_RESULTS)

    return NextResponse.json({
      items: rankedItems,
      itemSummaries: rankedItems,
      analysis: searchAnalysis,
    })
  } catch (error) {
    console.warn("eBay API error:", error)
    return NextResponse.json({
      items: [],
      itemSummaries: [],
      analysis: searchAnalysis,
      warning: "Live eBay results are temporarily unavailable.",
    })
  }
}
