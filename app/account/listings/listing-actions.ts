'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'

function formatPrice(raw: string): string {
  if (!raw) return ''
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return raw
  return `£${num.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const n = parseFloat(String(value ?? ''))
  return isNaN(n) ? null : n
}

// ── SOFT DELETE ──────────────────────────────────────────────────────────────
// Sets status = 'deleted'. Never removes the row.
// Does NOT refund a free listing claim — claim_free_listing is not called.
export async function sellerDeleteListing(
  listingId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)
  if (!user) return { success: false, error: 'You must be logged in.' }

  // Fetch first so we can verify ownership.
  // Never reveal whether a listing exists for a different user.
  const { data: existing, error: fetchError } = await supabase
    .from('listings')
    .select('id, seller_id, user_id, status')
    .eq('id', listingId)
    .maybeSingle()

  if (fetchError || !existing) return { success: false, error: 'Listing not found.' }

  const isOwner = existing.seller_id === user.id || existing.user_id === user.id
  if (!isOwner) return { success: false, error: 'Listing not found.' }
  if (existing.status === 'deleted') return { success: false, error: 'Listing not found.' }

  // Use the column that matched ownership as the secondary DB-level guard.
  const ownerCol = existing.seller_id === user.id ? 'seller_id' : 'user_id'
  const { error } = await supabase
    .from('listings')
    .update({ status: 'deleted', updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq(ownerCol, user.id)

  if (error) return { success: false, error: 'Could not delete listing. Please try again.' }

  revalidatePath('/account')
  revalidatePath('/listing')
  return { success: true }
}

// ── SELLER UPDATE ─────────────────────────────────────────────────────────────
// Updates all seller-editable fields.
// Does NOT call claim_free_listing — this is an edit, not a new listing.
// Does NOT change created_at. Updates updated_at only.
// Does NOT change the listing's status.
// Writes a listing_price_history row if the price changed.
export async function sellerUpdateListing(
  listingId: string,
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)
  if (!user) return { success: false, error: 'You must be logged in.' }

  // ── Server-side ownership check ───────────────────────────────────────────
  // This is the authoritative ownership gate — not the UI button visibility.
  // Fetching via the user's own Supabase client (RLS applies as a second layer).
  const { data: existing, error: fetchError } = await supabase
    .from('listings')
    .select('id, seller_id, user_id, status, price')
    .eq('id', listingId)
    .maybeSingle()

  if (fetchError || !existing) return { success: false, error: 'Listing not found.' }

  const isOwner = existing.seller_id === user.id || existing.user_id === user.id
  if (!isOwner) return { success: false, error: 'Listing not found.' }
  if (existing.status === 'deleted') return { success: false, error: 'Listing not found.' }

  const ownerCol = existing.seller_id === user.id ? 'seller_id' : 'user_id'

  // ── Parse fields ──────────────────────────────────────────────────────────
  const category = (formData.get('category') as string) || 'Catering Equipment'
  const newPrice = formatPrice((formData.get('price') as string) || '')

  const trailerDetails = (() => {
    if (category !== 'Catering Vans & Trailers') return null
    const raw = formData.get('trailer_details')
    if (!raw) return null
    try { return JSON.parse(raw as string) as Record<string, unknown> } catch { return null }
  })()

  const images = (() => {
    const raw = formData.get('images')
    if (!raw) return []
    try { return JSON.parse(raw as string) as string[] } catch { return [] }
  })()

  const updatePayload: Record<string, unknown> = {
    title:             (formData.get('title') as string)?.trim() || '',
    price:             newPrice,
    location:          (formData.get('location') as string)?.trim() || '',
    city:              (formData.get('city') as string)?.trim() || null,
    category,
    subcategory:       (formData.get('subcategory') as string) || null,
    equipment_type:    (formData.get('equipment_type') as string) || null,
    description:       (formData.get('description') as string) || null,
    condition:         (formData.get('condition') as string) || null,
    power_type:        (formData.get('power_type') as string) || null,
    dimensions:        (formData.get('dimensions') as string)?.trim() || null,
    service_history:   (formData.get('service_history') as string)?.trim() || null,
    warranty_type:     (formData.get('warranty_type') as string) || null,
    manuals_available: formData.get('manuals_available') === 'on',
    tested_status:     (formData.get('tested_status') as string) || null,
    delivery_option:   (formData.get('delivery_option') as string) || null,
    collection_postcode: (formData.get('collection_postcode') as string)?.trim() || null,
    vat_included:      formData.get('vat_included') === 'on',
    weight_kg:         optionalNumber(formData.get('weight_kg')),
    length_cm:         optionalNumber(formData.get('length_cm')),
    width_cm:          optionalNumber(formData.get('width_cm')),
    height_cm:         optionalNumber(formData.get('height_cm')),
    image_url:         images[0] || null,
    images,
    trailer_details:   trailerDetails,
    updated_at:        new Date().toISOString(),
    // created_at intentionally omitted — must not change on edit
    // status intentionally omitted — edit does not change status
  }

  if (!updatePayload.title || !newPrice || !updatePayload.location) {
    return { success: false, error: 'Title, price and location are required.' }
  }

  // ── DB write ──────────────────────────────────────────────────────────────
  const { error } = await supabase
    .from('listings')
    .update(updatePayload)
    .eq('id', listingId)
    .eq(ownerCol, user.id) // ownership enforced at DB level in addition to the pre-check above

  if (error) return { success: false, error: 'Could not save changes. Please try again.' }

  // ── Price history ─────────────────────────────────────────────────────────
  if (newPrice && existing.price && newPrice !== String(existing.price)) {
    const { error: phErr } = await supabase.from('listing_price_history').insert({
      listing_id: listingId,
      seller_id:  user.id,
      old_price:  String(existing.price),
      new_price:  newPrice,
    })
    if (phErr) console.warn('Price history write failed (non-fatal):', phErr.message)
  }

  revalidatePath('/account')
  revalidatePath(`/listing`)
  return { success: true }
}
