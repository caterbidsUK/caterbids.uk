import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  findValidatedCaterBotSource,
  validateCaterBotProductSource,
} from "@/lib/caterbot/sourceValidation"
import {
  getConfiguredCaterBotSearchProviderName,
  isCaterBotWebSearchConfigured,
} from "@/lib/caterbot/webSearch"

export const runtime = "nodejs"

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function devUserId(req: NextRequest) {
  return process.env.NODE_ENV === "development" && req.cookies.get("caterbids_dev_auth")?.value === "1"
    ? "local-beta"
    : ""
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !devUserId(req)) {
      return NextResponse.json({ error: "Please log in before checking a source." }, { status: 401 })
    }

    const body = await req.json()
    const brand = clean(body.brand)
    const model = clean(body.model)
    const productTitle = clean(body.productTitle || body.product_title || body.title)
    const category = clean(body.category)
    const equipmentType = clean(body.equipmentType || body.equipment_type)
    const fuelType = clean(body.fuelType || body.fuel_type)
    const sourceUrl = clean(body.sourceUrl)

    if (!brand || !model) {
      return NextResponse.json({ error: "Brand and model are required before checking a source." }, { status: 400 })
    }

    const source = sourceUrl
      ? await validateCaterBotProductSource({
          url: sourceUrl,
          brand,
          model,
          equipmentType,
          fuelType,
        })
      : await findValidatedCaterBotSource({
          brand,
          model,
          productTitle,
          category,
          equipmentType,
          serial: clean(body.serial),
          fuelType,
          voltage: clean(body.voltage),
          phase: clean(body.phase),
          amps: clean(body.amps),
          powerRating: clean(body.powerRating || body.power_rating),
          gasRating: clean(body.gasRating || body.gas_rating),
        })

    if (!source || !source.valid) {
      const sourceSearchUnavailable = !sourceUrl && !isCaterBotWebSearchConfigured()

      return NextResponse.json(
        {
          error: sourceSearchUnavailable
            ? "CaterBot source search is not connected yet. You can still list using plate details."
            : "CaterBot could not verify an exact manual/spec source. Please add a link manually.",
          source: source || null,
          searchProvider: getConfiguredCaterBotSearchProviderName(),
        },
        { status: sourceSearchUnavailable ? 503 : 422 }
      )
    }

    return NextResponse.json({
      success: true,
      source: {
        url: source.url,
        sourceName: source.sourceName,
        sourceType: source.sourceType,
        confidence: source.confidence,
        score: source.score,
        sourceTitle: source.sourceTitle,
        sourceDomain: source.sourceDomain,
        confidenceScore: source.confidenceScore,
        matchedFields: source.matchedFields,
        sourcePriorityRank: source.sourcePriorityRank,
        checkedAt: source.checkedAt,
        matchNotes: source.matchNotes,
        usefulDetails: source.usefulDetails,
        extractedSpecs: source.extractedSpecs,
      },
      searchProvider: getConfiguredCaterBotSearchProviderName(),
    })
  } catch (error) {
    console.error("CaterBot source validation failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not check manual/spec source." },
      { status: 500 }
    )
  }
}
