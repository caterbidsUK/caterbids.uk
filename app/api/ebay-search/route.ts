import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function getEbayToken() {
  const clientId = process.env.EBAY_APP_ID
  const clientSecret = process.env.EBAY_CERT_ID

  console.log("EBAY_APP_ID:", clientId)
  console.log("EBAY_CERT_ID exists:", !!clientSecret)

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q") || "commercial catering equipment"

    const token = await getEbayToken()

    const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search")
    url.searchParams.set("q", query)
    url.searchParams.set("limit", "20")
    url.searchParams.set("filter", "itemLocationCountry:GB,deliveryCountry:GB")

    const ebayRes = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB",
      },
    })

    const data = await ebayRes.json()

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
