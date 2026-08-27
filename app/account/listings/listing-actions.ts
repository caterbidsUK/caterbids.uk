'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/auth'
import { revalidatePath } from 'next/cache'
import { entitlementHasAllowance, type SellerListingEntitlement } from '@/lib/pricing'

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

  const businessDetails = (() => {
    if (category !== 'Catering Businesses') return null
    const raw = formData.get('business_details')
    if (!raw) return null
    try { return JSON.parse(raw as string) as Record<string, unknown> } catch { return null }
  })()

  const isConfidential = category === 'Catering Businesses'
    ? formData.get('is_confidential') === 'true'
    : false

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
    business_details:  businessDetails,
    is_confidential:   isConfidential,
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

// ── PUBLISH PENDING ──────────────────────────────────────────────────────────
// Activates a payment_pending listing by consuming a paid entitlement or a
// free listing slot. The listing and entitlement are updated in sequence;
// the listing goes live first so a failed entitlement write is recoverable
// by admin, but not the reverse (entitlement spent, listing still pending).
export async function publishPendingListing(
  listingId: string
): Promise<{ success: true } | { success: false; error: string; redirectTo?: string }> {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)
  if (!user) return { success: false, error: 'You must be logged in.' }

  const { data: existing, error: fetchError } = await supabase
    .from('listings')
    .select('id, seller_id, user_id, status')
    .eq('id', listingId)
    .maybeSingle()

  if (fetchError || !existing) return { success: false, error: 'Listing not found.' }
  const isOwner = existing.seller_id === user.id || existing.user_id === user.id
  if (!isOwner) return { success: false, error: 'Listing not found.' }
  if (existing.status !== 'payment_pending') {
    return { success: false, error: 'This listing is not waiting to be published.' }
  }

  const admin = createAdminClient()
  const ownerCol = existing.seller_id === user.id ? 'seller_id' : 'user_id'

  // ── Try paid entitlement first ────────────────────────────────────────────
  const { data: entitlements } = await admin
    .from('seller_listing_entitlements')
    .select('id, plan_name, listing_count_total, listing_count_used, monthly, expires_at, active')
    .eq('seller_id', user.id)
    .eq('active', true)
    .order('expires_at', { ascending: true })

  const usableEntitlement = ((entitlements ?? []) as SellerListingEntitlement[])
    .find(entitlementHasAllowance)

  if (usableEntitlement) {
    const { error: listingErr } = await admin
      .from('listings')
      .update({ status: 'live', updated_at: new Date().toISOString() })
      .eq('id', listingId)
      .eq(ownerCol, user.id)

    if (listingErr) return { success: false, error: 'Could not publish listing. Please try again.' }

    const newUsed = usableEntitlement.listing_count_used + 1
    await admin
      .from('seller_listing_entitlements')
      .update({
        listing_count_used: newUsed,
        active: newUsed < usableEntitlement.listing_count_total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', usableEntitlement.id)

    revalidatePath('/account')
    revalidatePath('/listing')
    return { success: true }
  }

  // ── Try free listing slot ─────────────────────────────────────────────────
  const { data: settingsRow } = await (admin.from('payment_settings' as never) as any)
    .select('free_listing_mode')
    .limit(1)
    .maybeSingle()

  if (settingsRow?.free_listing_mode) {
    const { data: eligible } = await (admin as any).rpc('can_claim_free_listing', {
      p_seller_id: user.id,
    })

    if (eligible) {
      const { error: listingErr } = await admin
        .from('listings')
        .update({ status: 'live', updated_at: new Date().toISOString() })
        .eq('id', listingId)
        .eq(ownerCol, user.id)

      if (listingErr) return { success: false, error: 'Could not publish listing. Please try again.' }

      const { data: claimGranted } = await (admin as any).rpc('claim_free_listing', {
        p_seller_id: user.id,
        p_listing_id: listingId,
      })

      if (!claimGranted) {
        // Race: revert listing to payment_pending
        await admin
          .from('listings')
          .update({ status: 'payment_pending', updated_at: new Date().toISOString() })
          .eq('id', listingId)
        return {
          success: false,
          error: 'The last free listing slot was just taken. Choose a listing pack to publish.',
          redirectTo: '/pricing?payment_required=1',
        }
      }

      revalidatePath('/account')
      revalidatePath('/listing')
      return { success: true }
    }
  }

  return {
    success: false,
    error: 'You need a listing pack or plan to publish. Your draft is saved.',
    redirectTo: '/pricing?payment_required=1',
  }
}
