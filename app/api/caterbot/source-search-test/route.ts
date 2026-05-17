import { NextResponse } from "next/server"
import { searchYouComQuery } from "@/lib/caterbot/webSearch"

export const runtime = "nodejs"

const TEST_QUERY = "Imperial CEFS-40 manual spec sheet dimensions weight"

async function runTest() {
  const apiKeyPresent = Boolean(process.env.YOU_API_KEY)

  if (!apiKeyPresent) {
    return NextResponse.json({
      connected: false,
      provider: "you.com",
      apiKeyPresent: false,
      status: 0,
      resultCount: 0,
      results: [],
      error: "YOU_API_KEY is missing",
    })
  }

  const response = await searchYouComQuery(TEST_QUERY, 10)

  return NextResponse.json({
    connected: response.status >= 200 && response.status < 300 && !response.error,
    provider: "you.com",
    apiKeyPresent: true,
    status: response.status,
    resultCount: response.results.length,
    results: response.results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet || "",
    })),
    error: response.error,
  })
}

export async function GET() {
  try {
    return await runTest()
  } catch (error) {
    return NextResponse.json({
      connected: false,
      provider: "you.com",
      apiKeyPresent: Boolean(process.env.YOU_API_KEY),
      status: 0,
      resultCount: 0,
      results: [],
      error: error instanceof Error ? error.message : "You.com source search test failed",
    })
  }
}

export async function POST() {
  return GET()
}
