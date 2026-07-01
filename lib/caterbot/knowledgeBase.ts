import { createAdminClient } from "@/lib/supabase/admin"
import type { CaterBotSourceValidationResult } from "@/lib/caterbot/sourceValidation"

// ── Row type ──────────────────────────────────────────────────────────────────
// Mirrors the equipment_models table exactly (not yet in generated Database types).

export type EquipmentModelRow = {
  id: string
  model_key: string
  brand: string
  model: string
  gc_number: string | null
  category: string | null
  equipment_type: string | null
  fuel_type: string | null
  phase: string | null
  voltage: string | null
  amps: string | null
  kw_rating: string | null
  electrical_phase: string | null
  gas_type: string | null
  capacity: string | null
  dimensions: string | null
  packed_dimensions: string | null
  weight_net: string | null
  weight_gross: string | null
  suggested_pallet_l_cm: number | null
  suggested_pallet_w_cm: number | null
  suggested_pallet_h_cm: number | null
  tail_lift_suggested: boolean
  forklift_suggested: boolean
  source_url: string | null
  source_name: string | null
  source_type: string | null
  validation_score: number
  times_seen: number
  needs_review: boolean
  last_verified_at: string
  created_at: string
  updated_at: string
}

// Subset of QuickListAiSuggestion that the write function needs.
// Structurally compatible — no explicit cast required at call sites.
export type KBSuggestionInput = {
  brand: string
  model: string
  gc_number: string
  category: string
  subcategory?: string
  voltage: string
  amps: string
  kw_rating: string
  electrical_phase: string
  gas_type: string
  power_type: string
  dimensions: string
  weight: string
  estimated_weight_kg?: string | number
  pallet_length_cm?: string | number
  pallet_width_cm?: string | number
  pallet_height_cm?: string | number
  tail_lift_required?: boolean | string
  forklift_available?: boolean | string
  condition?: string
}

// ── Key normalisation ─────────────────────────────────────────────────────────
// Mirrors normaliseManualLookupBrand + compactModel from sourceValidation.ts so
// the key matches what the scoring engine uses for model matching.

function normaliseBrandForKey(brand: string): string {
  const cleaned = brand
    .replace(/\b(commercial\s+)?catering\s+equipment\b/gi, " ")
    .replace(/\b(commercial\s+)?kitchen\s+equipment\b/gi, " ")
    .replace(/\bequipment\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  const base = cleaned.length >= 3 ? cleaned : brand.trim()
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

function compactModelForKey(model: string): string {
  return model.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function computeModelKey(brand: string, model: string): string {
  const normBrand = normaliseBrandForKey(brand)
  const compModel = compactModelForKey(model)
  if (!normBrand || !compModel) return ""
  return `${normBrand}:${compModel}`
}

// ── Source-type helpers ───────────────────────────────────────────────────────

export function isTrustedSourceType(sourceType: string | null | undefined): boolean {
  if (!sourceType) return false
  return /manualslib|manufacturer|pdf manual|manual page/i.test(sourceType)
}

export function isWithinSixMonths(isoDate: string | null | undefined): boolean {
  if (!isoDate) return false
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return false
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 6)
  return date > cutoff
}

// ── Disagreement detection ────────────────────────────────────────────────────

function extractSortedNumbers(text: string): number[] {
  return Array.from(text.matchAll(/(\d+(?:[.,]\d+)?)/g))
    .map((m) => Number(m[1].replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)
}

function numbersDisagreeByMore(aText: string, bText: string, tolerance: number): boolean {
  const a = extractSortedNumbers(aText)
  const b = extractSortedNumbers(bText)
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return false
  return a.some((val, i) => {
    const ref = b[i]
    return ref > 0 && Math.abs(val - ref) / ref > tolerance
  })
}

function extractWeightKgFromText(text: unknown): number | null {
  const str =
    typeof text === "number" && Number.isFinite(text) ? `${text}kg` : String(text ?? "")
  const kg = str.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)
  if (kg?.[1]) return Number(kg[1].replace(",", "."))
  const bare = str.match(/^(\d+(?:[.,]\d+)?)$/)
  if (bare?.[1]) return Number(bare[1].replace(",", "."))
  return null
}

function palletCm(value: string | number | undefined | null): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(1)) : null
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function lookupEquipmentModel(
  brand: string,
  model: string
): Promise<EquipmentModelRow | null> {
  const modelKey = computeModelKey(brand, model)
  if (!modelKey) return null

  try {
    const admin = createAdminClient()
    const { data, error } = await (admin as any)
      .from("equipment_models")
      .select("*")
      .eq("model_key", modelKey)
      .maybeSingle()

    if (error) {
      console.warn("CaterBot KB lookup error (non-fatal):", error.message)
      return null
    }
    return (data as EquipmentModelRow) ?? null
  } catch (err) {
    console.warn("CaterBot KB lookup failed (non-fatal):", err)
    return null
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────
// Fire-and-forget — caller must NOT await this. All errors are caught internally.
//
// Quality gate (all must pass before any write):
//   source.valid === true
//   source.score >= 85
//   source.matchedFields includes "exact_model"
//   final.model is non-empty (real plate model, not GC-number-only)
//
// Upsert logic:
//   New row  → INSERT with all spec fields.
//   Existing → ALWAYS bump times_seen + last_verified_at.
//     Higher new score + no disagreement → overwrite specs.
//     Lower new score                    → keep stored specs.
//     Specs disagree (>12% dims / >15% weight) → set needs_review = true,
//                                                  keep higher-score version.

export async function writeToEquipmentKnowledgeBase(
  final: KBSuggestionInput,
  source: CaterBotSourceValidationResult
): Promise<void> {
  // Quality gate
  if (!source.valid) return
  if (source.score < 85) return
  if (!source.matchedFields.includes("exact_model")) return
  const model = final.model?.trim()
  if (!model) return
  const brand = final.brand?.trim()
  if (!brand) return

  const modelKey = computeModelKey(brand, model)
  if (!modelKey) return

  try {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    const { data: existing, error: readError } = await (admin as any)
      .from("equipment_models")
      .select("*")
      .eq("model_key", modelKey)
      .maybeSingle()

    if (readError) {
      console.warn("CaterBot KB read-before-write error (non-fatal):", readError.message)
      return
    }

    const existingRow = existing as EquipmentModelRow | null
    const storedScore = existingRow?.validation_score ?? 0
    const newScoreBeatsStored = source.score > storedScore

    // Disagreement detection — compare new scan against stored record
    let needsReview = existingRow?.needs_review ?? false
    if (existingRow) {
      const newDims = final.dimensions ?? ""
      const storedDims = existingRow.dimensions ?? ""
      if (newDims && storedDims && numbersDisagreeByMore(newDims, storedDims, 0.12)) {
        needsReview = true
      }
      const newWeightKg = extractWeightKgFromText(final.estimated_weight_kg ?? final.weight)
      const storedWeightKg = extractWeightKgFromText(
        existingRow.weight_gross ?? existingRow.weight_net
      )
      if (
        newWeightKg !== null &&
        storedWeightKg !== null &&
        storedWeightKg > 0 &&
        Math.abs(newWeightKg - storedWeightKg) / storedWeightKg > 0.15
      ) {
        needsReview = true
      }
    }

    if (!existingRow) {
      await (admin as any).from("equipment_models").insert({
        model_key: modelKey,
        brand,
        model,
        gc_number: final.gc_number || null,
        category: final.category || null,
        equipment_type: final.subcategory || null,
        fuel_type: final.gas_type || final.power_type || null,
        phase: final.electrical_phase || null,
        voltage: final.voltage || source.extractedSpecs.voltage || null,
        amps: final.amps || source.extractedSpecs.amps || null,
        kw_rating: final.kw_rating || source.extractedSpecs.kwRating || null,
        electrical_phase: final.electrical_phase || source.extractedSpecs.phase || null,
        gas_type: final.gas_type || source.extractedSpecs.gasType || null,
        capacity: source.extractedSpecs.capacity || null,
        dimensions: final.dimensions || source.extractedSpecs.dimensions || null,
        packed_dimensions: source.extractedSpecs.packedDimensions || null,
        weight_net: source.extractedSpecs.weight || null,
        weight_gross: source.extractedSpecs.grossWeight || null,
        suggested_pallet_l_cm: palletCm(final.pallet_length_cm),
        suggested_pallet_w_cm: palletCm(final.pallet_width_cm),
        suggested_pallet_h_cm: palletCm(final.pallet_height_cm),
        tail_lift_suggested: Boolean(final.tail_lift_required),
        forklift_suggested: Boolean(final.forklift_available),
        source_url: source.url,
        source_name: source.sourceName,
        source_type: source.sourceType,
        validation_score: source.score,
        times_seen: 1,
        needs_review: false,
        last_verified_at: now,
        created_at: now,
        updated_at: now,
      })
    } else {
      const update: Record<string, unknown> = {
        times_seen: (existingRow.times_seen ?? 1) + 1,
        last_verified_at: now,
        updated_at: now,
        needs_review: needsReview,
      }

      // Only overwrite specs when the new source beats the stored score AND
      // there is no disagreement. If specs disagree we keep the higher-score
      // version and let the admin review flag surface the conflict.
      if (newScoreBeatsStored && !needsReview) {
        Object.assign(update, {
          gc_number: final.gc_number || existingRow.gc_number,
          category: final.category || existingRow.category,
          equipment_type: final.subcategory || existingRow.equipment_type,
          fuel_type: final.gas_type || final.power_type || existingRow.fuel_type,
          phase: final.electrical_phase || source.extractedSpecs.phase || existingRow.phase,
          voltage: final.voltage || source.extractedSpecs.voltage || existingRow.voltage,
          amps: final.amps || source.extractedSpecs.amps || existingRow.amps,
          kw_rating: final.kw_rating || source.extractedSpecs.kwRating || existingRow.kw_rating,
          electrical_phase:
            final.electrical_phase ||
            source.extractedSpecs.phase ||
            existingRow.electrical_phase,
          gas_type: final.gas_type || source.extractedSpecs.gasType || existingRow.gas_type,
          capacity: source.extractedSpecs.capacity || existingRow.capacity,
          dimensions:
            final.dimensions || source.extractedSpecs.dimensions || existingRow.dimensions,
          packed_dimensions:
            source.extractedSpecs.packedDimensions || existingRow.packed_dimensions,
          weight_net: source.extractedSpecs.weight || existingRow.weight_net,
          weight_gross: source.extractedSpecs.grossWeight || existingRow.weight_gross,
          suggested_pallet_l_cm:
            palletCm(final.pallet_length_cm) ?? existingRow.suggested_pallet_l_cm,
          suggested_pallet_w_cm:
            palletCm(final.pallet_width_cm) ?? existingRow.suggested_pallet_w_cm,
          suggested_pallet_h_cm:
            palletCm(final.pallet_height_cm) ?? existingRow.suggested_pallet_h_cm,
          tail_lift_suggested: Boolean(final.tail_lift_required),
          forklift_suggested: Boolean(final.forklift_available),
          source_url: source.url,
          source_name: source.sourceName,
          source_type: source.sourceType,
          validation_score: source.score,
        })
      }

      await (admin as any)
        .from("equipment_models")
        .update(update)
        .eq("model_key", modelKey)
    }

    // Record a sighting in price observations. Listed price is null at scan time
    // (the seller hasn't priced the item yet); sold_price populated separately.
    await (admin as any).from("equipment_price_observations").insert({
      model_key: modelKey,
      listing_id: null,
      listed_price: null,
      sold_price: null,
      condition: final.condition || null,
      currency: "GBP",
      observed_at: now,
    })
  } catch (err) {
    // Must never propagate — this is fire-and-forget.
    console.warn("CaterBot knowledge base write failed (non-fatal):", err)
  }
}
