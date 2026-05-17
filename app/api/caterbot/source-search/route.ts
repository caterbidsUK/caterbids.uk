import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { findValidatedCaterBotSource } from "@/lib/caterbot/sourceValidation"
import {
  getConfiguredCaterBotSearchProviderName,
  isCaterBotWebSearchConfigured,
} from "@/lib/caterbot/webSearch"

export const runtime = "nodejs"

function clean(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : ""
}

function devUserId(req: NextRequest) {
  return process.env.NODE_ENV === "development" && req.cookies.get("caterbids_dev_auth")?.value === "1"
    ? "local-beta"
    : ""
}

function numberFrom(value: string | undefined) {
  const match = String(value || "").match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function dimensionsFrom(value: string | undefined) {
  const match = String(value || "").match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/)
  if (!match) return null
  const raw = [Number(match[1]), Number(match[2]), Number(match[3])]
  const convertFromMm = /mm/i.test(value || "") || raw.some((numberValue) => numberValue > 300)
  const [width, depth, height] = raw.map((numberValue) =>
    Number.isFinite(numberValue) && numberValue > 0
      ? Number((convertFromMm ? numberValue / 10 : numberValue).toFixed(1))
      : null
  )
  return width && depth && height ? { width, depth, height } : null
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : ""
  const code = "code" in error && typeof error.code === "string" ? error.code : ""
  return code === "PGRST204" || message.includes("schema cache") || message.includes("column")
}

const optionalSourceMetadataColumns = [
  "caterbot_source_url",
  "caterbot_source_title",
  "caterbot_source_domain",
  "caterbot_source_confidence_score",
  "caterbot_source_verified_at",
  "caterbot_source_matched_fields",
  "caterbot_source_priority_rank",
] as const

function withoutOptionalSourceMetadata(payload: Record<string, unknown>) {
  const nextPayload = { ...payload }
  optionalSourceMetadataColumns.forEach((column) => {
    delete nextPayload[column]
  })
  return nextPayload
}

function shippingRecommendation({
  equipmentType,
  fuelType,
  dimensions,
  weightKg,
}: {
  equipmentType: string
  fuelType: string
  dimensions: ReturnType<typeof dimensionsFrom>
  weightKg: number | null
}) {
  const text = `${equipmentType} ${fuelType}`.toLowerCase()
  const maxDimension = dimensions ? Math.max(dimensions.width, dimensions.depth, dimensions.height) : 0
  const missingDimensions = !dimensions
  const missingWeight = !weightKg
  const specialist =
    /gas|lpg|natural gas|propane|refrigeration|fridge|freezer|chiller|canopy|extraction|ventilation|van|trailer/.test(text) ||
    missingDimensions ||
    missingWeight ||
    (weightKg || 0) > 150 ||
    maxDimension > 220

  let deliveryType = "Seller confirmation needed"
  let shippingClass = "Needs seller check"
  if (weightKg && dimensions) {
    if (weightKg <= 30 && maxDimension <= 120) {
      deliveryType = "Parcel courier"
      shippingClass = "Small item"
    } else if (weightKg <= 75 && maxDimension <= 180) {
      deliveryType = "Heavy parcel or small pallet"
      shippingClass = "Medium item"
    } else {
      deliveryType = "Pallet courier"
      shippingClass = "Large item"
    }
  } else if (dimensions || weightKg) {
    deliveryType = "Heavy parcel or small pallet"
    shippingClass = "Medium item"
  }

  const notes = [
    missingDimensions || missingWeight
      ? "Seller must confirm exact dimensions, weight, access, and collection requirements before courier booking."
      : "",
    !missingDimensions && !missingWeight && ((weightKg || 0) > 150 || maxDimension > 220)
      ? "Specialist delivery or collection recommended for heavy or oversized catering equipment."
      : "",
    /gas|lpg|natural gas|propane/.test(text)
      ? "Gas equipment may require specialist disconnection/installation checks. Buyer should confirm suitability before purchase."
      : "",
    /refrigeration|fridge|freezer|chiller/.test(text)
      ? "Refrigeration equipment may need upright transport and specialist handling."
      : "",
    /canopy|extraction|ventilation/.test(text)
      ? "Extraction equipment may require specialist delivery due to size and installation requirements."
      : "",
  ].filter(Boolean)

  return {
    deliveryType,
    shippingClass,
    palletDeliveryRecommended: shippingClass === "Large item" || specialist,
    specialistDeliveryRecommended: specialist,
    forkliftRequired: specialist || (weightKg || 0) > 75,
    tailLiftRequired: specialist || (weightKg || 0) > 30,
    twoPersonLiftRecommended: (weightKg || 0) > 30 && (weightKg || 0) <= 75,
    shippingConfidence: dimensions && weightKg ? "High" : dimensions || weightKg ? "Medium" : "Low",
    deliveryNotes: notes.join(" "),
  }
}

async function saveListingSearchState({
  supabase,
  listingId,
  userId,
  payload,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  listingId: string
  userId: string
  payload: Record<string, unknown>
}) {
  if (!listingId) return { saved: false, error: "" }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id,user_id,seller_id")
    .eq("id", listingId)
    .maybeSingle()

  if (listingError || !listing) {
    return { saved: false, error: listingError?.message || "Listing not found" }
  }

  if (listing.user_id !== userId && listing.seller_id !== userId) {
    return { saved: false, error: "Listing does not belong to the current seller" }
  }

  let { error } = await supabase.from("listings").update(payload as any).eq("id", listingId)
  if (error && isMissingColumnError(error)) {
    const retry = await supabase
      .from("listings")
      .update(withoutOptionalSourceMetadata(payload) as any)
      .eq("id", listingId)
    error = retry.error
  }
  return { saved: !error, error: error?.message || "" }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userId = user?.id || devUserId(req)

    if (!userId) {
      return NextResponse.json({ error: "Please log in before checking a source." }, { status: 401 })
    }

    const body = await req.json()
    const listingId = clean(body.listing_id || body.listingId)
    const brand = clean(body.brand)
    const model = clean(body.model)
    const productTitle = clean(body.product_title || body.productTitle || body.title)
    const category = clean(body.category)
    const equipmentType = clean(body.equipment_type || body.equipmentType)
    const fuelType = clean(body.fuel_type || body.fuelType)
    const checkedAt = new Date().toISOString()

    if (!brand || !model) {
      return NextResponse.json({ error: "Brand and model are required before CaterBot can search sources." }, { status: 400 })
    }

    if (!isCaterBotWebSearchConfigured()) {
      const saveResult = await saveListingSearchState({
        supabase,
        listingId,
        userId,
        payload: {
          manual_source_last_checked_at: checkedAt,
          manual_source_validated: false,
          manual_source_match_notes:
            "CaterBot source search is not connected yet. Add YOU_API_KEY to enable live manual/spec lookup.",
          ai_spec_confidence: "low",
          caterbot_source_verified_at: checkedAt,
        },
      })

      return NextResponse.json(
        {
          success: false,
          sourceFound: false,
          error: "CaterBot source search is not connected yet. Add YOU_API_KEY to enable live manual/spec lookup.",
          searchProvider: getConfiguredCaterBotSearchProviderName(),
          checkedAt,
          sourceStatus: "Not connected",
          saved: saveResult.saved,
          saveError: saveResult.error,
        },
        { status: 503 }
      )
    }

    const source = await findValidatedCaterBotSource({
      brand,
      model,
      serial: clean(body.serial),
      productTitle,
      category,
      equipmentType,
      fuelType,
      voltage: clean(body.voltage),
      phase: clean(body.phase),
      amps: clean(body.amps),
      powerRating: clean(body.power_rating || body.powerRating),
      gasRating: clean(body.gas_rating || body.gasRating),
    })

    if (!source || !source.valid) {
      const saveResult = await saveListingSearchState({
        supabase,
        listingId,
        userId,
        payload: {
          manual_source_url: null,
          spec_source_url: null,
          manual_source_name: null,
          manual_source_type: null,
          manual_source_validated: false,
          manual_source_last_checked_at: checkedAt,
          manual_source_match_notes: "CaterBot could not verify an exact manual/spec source. Please add a link manually.",
          ai_spec_confidence: "low",
          specs_verified_by_seller: false,
          caterbot_source_url: null,
          caterbot_source_title: null,
          caterbot_source_domain: null,
          caterbot_source_confidence_score: null,
          caterbot_source_verified_at: checkedAt,
          caterbot_source_matched_fields: [],
          caterbot_source_priority_rank: null,
        },
      })

      return NextResponse.json({
        success: true,
        sourceFound: false,
        error: "CaterBot could not verify an exact manual/spec source. Please add a link manually.",
        searchProvider: getConfiguredCaterBotSearchProviderName(),
        checkedAt,
        sourceStatus: "Search completed — no reliable match",
        saved: saveResult.saved,
        saveError: saveResult.error,
      })
    }

    const externalDimensions = dimensionsFrom(source.extractedSpecs.dimensions)
    const packedDimensions = dimensionsFrom(source.extractedSpecs.packedDimensions)
    const shippingDimensions = packedDimensions || externalDimensions
    const netWeightKg = numberFrom(source.extractedSpecs.weight)
    const grossWeightKg = numberFrom(source.extractedSpecs.grossWeight)
    const weightKg = grossWeightKg || netWeightKg
    const shipping = shippingRecommendation({
      equipmentType,
      fuelType: fuelType || source.extractedSpecs.gasType || "",
      dimensions: shippingDimensions,
      weightKg,
    })
    const saveResult = await saveListingSearchState({
      supabase,
      listingId,
      userId,
      payload: {
        manual_source_url: source.url,
        spec_source_url: source.url,
        manual_source_name: source.sourceName,
        manual_source_type: source.sourceType,
        manual_source_validated: true,
        manual_source_last_checked_at: source.checkedAt,
        manual_source_match_notes: source.matchNotes,
        ai_spec_confidence: source.confidence,
        caterbot_source_url: source.url,
        caterbot_source_title: source.sourceTitle,
        caterbot_source_domain: source.sourceDomain,
        caterbot_source_confidence_score: source.confidenceScore,
        caterbot_source_verified_at: source.checkedAt,
        caterbot_source_matched_fields: source.matchedFields,
        caterbot_source_priority_rank: source.sourcePriorityRank,
        specs_verified_by_seller: false,
        source_rejected_by_seller: false,
        dimensions: source.extractedSpecs.dimensions !== "Needs seller check" ? source.extractedSpecs.dimensions : null,
        width_cm: externalDimensions?.width || null,
        depth_cm: externalDimensions?.depth || null,
        height_cm: externalDimensions?.height || null,
        packed_dimensions: source.extractedSpecs.packedDimensions !== "Needs seller check" ? source.extractedSpecs.packedDimensions : null,
        packed_width_cm: packedDimensions?.width || null,
        packed_depth_cm: packedDimensions?.depth || null,
        packed_height_cm: packedDimensions?.height || null,
        length_cm: shippingDimensions?.depth || null,
        estimated_weight_kg: weightKg,
        gross_weight_kg: grossWeightKg,
        weight_kg: weightKg,
        delivery_type: shipping.deliveryType,
        shipping_class: shipping.shippingClass,
        delivery_notes: shipping.deliveryNotes || null,
        pallet_delivery_recommended: shipping.palletDeliveryRecommended,
        specialist_delivery_recommended: shipping.specialistDeliveryRecommended,
        forklift_required: shipping.forkliftRequired,
        tail_lift_required: shipping.tailLiftRequired,
        two_person_lift_recommended: shipping.twoPersonLiftRecommended,
        shipping_confidence: shipping.shippingConfidence,
      },
    })

    console.info("CaterBot source search final result", {
      bestSelectedUrl: source.url,
      extractedDimensions: source.extractedSpecs.dimensions,
      extractedWeight: source.extractedSpecs.grossWeight || source.extractedSpecs.weight,
      shippingRecommendation: shipping,
      finalConfidence: source.confidence,
      saved: saveResult.saved,
      saveError: saveResult.error,
    })

    return NextResponse.json({
      success: true,
      sourceFound: true,
      searchProvider: getConfiguredCaterBotSearchProviderName(),
      checkedAt: source.checkedAt,
      sourceStatus: "Verified source found",
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
      shipping,
      saved: saveResult.saved,
      saveError: saveResult.error,
    })
  } catch (error) {
    console.error("CaterBot source search failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not search manual/spec sources." },
      { status: 500 }
    )
  }
}
