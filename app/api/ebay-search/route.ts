import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(
    { items: [], itemSummaries: [], warning: "eBay integration removed." },
    { status: 410 }
  )
}
