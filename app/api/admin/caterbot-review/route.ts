import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminContext, writeAdminAuditLog } from "@/app/admin/admin-utils"
import { computeModelKey } from "@/lib/caterbot/knowledgeBase"

export const dynamic = "force-dynamic"

// Domains clearly unrelated to catering equipment — the CPAP/ResMed class of hallucination
const SUSPICIOUS_DOMAIN_KEYWORDS = [
  "resmed", "cpap", "sleepdoctor", "sleephq", "respironics",
  "webmd", "drugs.com", "nhs.uk", "medline", "medistore",
]

function isSuspiciousDomain(url: string | null): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    return SUSPICIOUS_DOMAIN_KEYWORDS.some((kw) => host.includes(kw))
  } catch {
    return false
  }
}

type ListingRow = {
  id: string
  title: string | null
  created_at: string | null
  status: string | null
  spec_brand: string | null
  spec_model: string | null
  height_cm: number | null
  width_cm: number | null
  length_cm: number | null
  weight_kg: number | null
  manual_source_url: string | null
  spec_source_url: string | null
  manual_source_name: string | null
  manual_source_type: string | null
  manual_source_validated: boolean | null
  ai_spec_confidence: string | null
  manual_source_match_notes: string | null
  caterbot_admin_verified: boolean | null
}

// Detect listings that were saved before Fix 1 where pallet dims overwrote item dims.
// The 100×120 footprint is the universal pallet standard — if both match, these are
// not item dimensions. The admin UI must not write these through to equipment_models.
function detectPalletDims(row: ListingRow): {
  pallet_dims_detected: boolean
  suggested_height_cm: number | null
  suggested_weight_kg: number | null
} {
  const isPalletFootprint = row.width_cm === 100 && row.length_cm === 120
  if (!isPalletFootprint) return { pallet_dims_detected: false, suggested_height_cm: null, suggested_weight_kg: null }
  return {
    pallet_dims_detected: true,
    suggested_height_cm: row.height_cm != null ? Math.round((row.height_cm - 15) * 10) / 10 : null,
    suggested_weight_kg: row.weight_kg  != null ? Math.round((row.weight_kg  - 20) * 10) / 10 : null,
  }
}

function computeFlags(row: ListingRow): { is_flagged: boolean; flag_reasons: string[] } {
  const reasons: string[] = []
  const conf = (row.ai_spec_confidence || "").toLowerCase()
  if (!conf || conf === "low" || conf === "medium") reasons.push("confidence_low")
  if (!row.height_cm || !row.width_cm || !row.length_cm) reasons.push("missing_dims")
  if (!row.weight_kg) reasons.push("missing_weight")
  if (!row.manual_source_validated || !row.manual_source_url) reasons.push("source_unvalidated")
  const sourceUrl = row.manual_source_url || row.spec_source_url
  if (isSuspiciousDomain(sourceUrl)) reasons.push("source_domain_mismatch")
  const { pallet_dims_detected } = detectPalletDims(row)
  if (pallet_dims_detected) reasons.push("pallet_dims_detected")
  return { is_flagged: reasons.length > 0, flag_reasons: reasons }
}

export async function GET() {
  try {
    const context = await getAdminContext()
    if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("listings")
      .select(
        "id, title, created_at, status, spec_brand, spec_model, height_cm, width_cm, length_cm, weight_kg, manual_source_url, spec_source_url, manual_source_name, manual_source_type, manual_source_validated, ai_spec_confidence, manual_source_match_notes, caterbot_admin_verified"
      )
      .not("spec_brand", "is", null)
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      console.error("CaterBot review GET query failed:", error.message, error.code, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data as ListingRow[]).map((row) => ({
      ...row,
      ...computeFlags(row),
      ...detectPalletDims(row),
    }))
    rows.sort((a, b) => {
      if (a.caterbot_admin_verified !== b.caterbot_admin_verified)
        return a.caterbot_admin_verified ? 1 : -1
      return a.is_flagged === b.is_flagged ? 0 : a.is_flagged ? -1 : 1
    })
    return NextResponse.json({ listings: rows })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("CaterBot review GET threw:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const context = await getAdminContext()
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: {
    listing_id?: string
    width_cm?: number | null
    height_cm?: number | null
    depth_cm?: number | null
    weight_kg?: number | null
    source_url?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // "depth_cm" here is the admin UI's wire-level name; it maps onto the
  // canonical DB column length_cm (see app/api/caterbot/spec-lookup/route.ts).
  const { listing_id, width_cm, height_cm, depth_cm, weight_kg, source_url } = body
  if (!listing_id) return NextResponse.json({ error: "listing_id required" }, { status: 400 })

  const admin = createAdminClient()

  const { data: listing, error: fetchErr } = await (admin as any)
    .from("listings")
    .select("id, spec_brand, spec_model, height_cm, width_cm, length_cm, weight_kg, manual_source_url")
    .eq("id", listing_id)
    .maybeSingle()

  if (fetchErr || !listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 })
  if (!listing.spec_brand || !listing.spec_model)
    return NextResponse.json({ error: "No spec_brand/spec_model on listing" }, { status: 400 })

  const now = new Date().toISOString()
  // Merge: use corrected value if supplied, otherwise keep existing
  const w  = width_cm  !== undefined ? width_cm  : listing.width_cm
  const h  = height_cm !== undefined ? height_cm : listing.height_cm
  const d  = depth_cm  !== undefined ? depth_cm  : listing.length_cm
  const wt = weight_kg !== undefined ? weight_kg : listing.weight_kg
  const url = source_url !== undefined ? source_url : (listing.manual_source_url ?? null)

  // ── 1. Update listings ───────────────────────────────────────────────────────
  const listingUpdate: Record<string, unknown> = {
    ai_spec_confidence: "HIGH",
    manual_source_validated: url ? true : listing.manual_source_validated,
    caterbot_admin_verified: true,
    updated_at: now,
  }
  if (width_cm  !== undefined) listingUpdate.width_cm  = w
  if (height_cm !== undefined) listingUpdate.height_cm = h
  if (depth_cm  !== undefined) listingUpdate.length_cm = d
  if (weight_kg !== undefined) listingUpdate.weight_kg = wt
  if (source_url !== undefined) { listingUpdate.manual_source_url = url; listingUpdate.spec_source_url = url }
  if (w && h && d) listingUpdate.dimensions = `${h} H x ${w} W x ${d} D cm`

  const { error: listingErr } = await (admin as any)
    .from("listings").update(listingUpdate).eq("id", listing_id)
  if (listingErr) return NextResponse.json({ error: listingErr.message }, { status: 500 })

  // ── 2. Upsert equipment_models as admin_verified ─────────────────────────────
  const modelKey = computeModelKey(listing.spec_brand, listing.spec_model)
  let kbUpdated = false
  let kbError: string | null = null

  if (modelKey) {
    const { data: existing } = await (admin as any)
      .from("equipment_models").select("*").eq("model_key", modelKey).maybeSingle()

    const dimString = (w && h && d)
      ? `${w}cm (W) x ${d}cm (D) x ${h}cm (H)`
      : (existing?.dimensions ?? null)

    const { error: kbErr } = await (admin as any).from("equipment_models").upsert(
      {
        model_key: modelKey,
        brand: listing.spec_brand,
        model: listing.spec_model,
        dimensions: dimString,
        weight_net:   wt != null ? `${wt} kg` : (existing?.weight_net   ?? null),
        weight_gross: wt != null ? `${wt} kg` : (existing?.weight_gross ?? null),
        source_url:  url ?? existing?.source_url ?? null,
        source_name: existing?.source_name ?? "Admin Review",
        // Admin-verified markers
        source_type: "admin_verified",
        validation_score: 100,
        needs_review: false,
        last_verified_at: now,
        updated_at: now,
        times_seen: (existing?.times_seen ?? 0) + 1,
        created_at: existing?.created_at ?? now,
        // Preserve non-corrected KB fields
        gc_number:          existing?.gc_number          ?? null,
        category:           existing?.category           ?? null,
        equipment_type:     existing?.equipment_type     ?? null,
        fuel_type:          existing?.fuel_type          ?? null,
        phase:              existing?.phase              ?? null,
        voltage:            existing?.voltage            ?? null,
        amps:               existing?.amps               ?? null,
        kw_rating:          existing?.kw_rating          ?? null,
        electrical_phase:   existing?.electrical_phase   ?? null,
        gas_type:           existing?.gas_type           ?? null,
        capacity:           existing?.capacity           ?? null,
        packed_dimensions:  existing?.packed_dimensions  ?? null,
        suggested_pallet_l_cm: existing?.suggested_pallet_l_cm ?? null,
        suggested_pallet_w_cm: existing?.suggested_pallet_w_cm ?? null,
        suggested_pallet_h_cm: existing?.suggested_pallet_h_cm ?? null,
        tail_lift_suggested: existing?.tail_lift_suggested ?? false,
        forklift_suggested:  existing?.forklift_suggested  ?? false,
      },
      { onConflict: "model_key" }
    )

    if (kbErr) {
      kbError = kbErr.message || "Unknown KB write error"
      console.error("CaterBot KB admin write failed:", modelKey, kbError)
    } else {
      kbUpdated = true
    }
  }

  // ── 3. Audit log ─────────────────────────────────────────────────────────────
  await writeAdminAuditLog({
    adminUserId: context.userId,
    adminEmail: context.email,
    action: kbUpdated ? "caterbot_spec_correction" : "caterbot_spec_correction_kb_failed",
    entityType: "listing",
    entityId: listing_id,
    metadata: {
      brand: listing.spec_brand,
      model: listing.spec_model,
      corrected: { w, h, d, wt, url },
      kb_model_key: modelKey,
      kb_updated: kbUpdated,
      kb_error: kbError,
    },
  })

  return NextResponse.json({ listing_updated: true, kb_updated: kbUpdated, kb_error: kbError })
}
