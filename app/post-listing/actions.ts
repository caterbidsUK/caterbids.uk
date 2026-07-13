'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runEquipmentSpecPipeline } from '@/lib/equipment-specs/pipeline'
import { entitlementHasAllowance, normalisePaymentSettings, sellerCanPublishForFree, type SellerListingEntitlement } from '@/lib/pricing'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type ListingInput = {
  title: string
  price: string
  location: string
  category: string
  subcategory?: string | null
  equipment_type?: string | null
  description?: string | null
  condition?: string | null
  power_type?: string | null
  dimensions?: string | null
  service_history?: string | null
  warranty_type?: string | null
  manuals_available?: boolean | null
  tested_status?: string | null
  delivery_option?: string | null
  delivery_method?: string | null
  delivery_provider?: string | null
  collection_postcode?: string | null
  collection_full_address?: string | null
  collection_city?: string | null
  seller_contact_name?: string | null
  seller_phone?: string | null
  vat_included?: boolean | null
  weight_kg?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  pallet_size?: string | null
  pallet_count?: number | null
  preferred_collection_date?: string | null
  insurance_value?: number | null
  access_restrictions?: string | null
  delivery_notes?: string | null
  delivery_details_confirmed?: boolean | null
  estimated_weight?: string | null
  delivery_type?: string | null
  shipping_class?: string | null
  shipping_confidence?: string | null
  shipping_details_confirmed_by_seller?: boolean | null
  pallet_delivery_recommended?: boolean | null
  specialist_delivery_recommended?: boolean | null
  pallet_ready?: boolean | null
  tail_lift_required?: boolean | null
  forklift_available?: boolean | null
  ground_floor_collection?: boolean | null
  commercial_premises?: boolean | null
  shrink_wrapped_confirmed?: boolean | null
  pallet_preparation_confirmed?: boolean | null
  delivery_available?: boolean | null
  collection_enabled?: boolean | null
  buyer_arranges_enabled?: boolean | null
  manual_source_url?: string | null
  spec_source_url?: string | null
  manual_source_name?: string | null
  manual_source_type?: string | null
  manual_source_validated?: boolean | null
  manual_source_last_checked_at?: string | null
  manual_source_match_notes?: string | null
  ai_spec_confidence?: string | null
  specs_verified_by_seller?: boolean | null
  source_rejected_by_seller?: boolean | null
  spec_plate_image_url?: string | null
  spec_brand?: string | null
  spec_model?: string | null
  spec_serial_number?: string | null
  spec_gc_number?: string | null
  spec_category?: string | null
  spec_power_type?: string | null
  spec_phase?: string | null
  spec_voltage?: string | null
  spec_current_a?: number | null
  spec_gas_type?: string | null
  spec_gas_connection?: string | null
  spec_height_cm?: number | null
  spec_width_cm?: number | null
  spec_depth_cm?: number | null
  spec_weight_kg?: number | null
  spec_forklift_required?: boolean | null
  spec_condition_notes?: string | null
  image?: string | null
  images?: string[] | null
  city?: string | null
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const message = 'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : ''
  const code = 'code' in error && typeof error.code === 'string' ? error.code : ''

  return code === 'PGRST204' || message.includes('schema cache') || message.includes('column')
}

// Columns that may not exist in older DB schemas — stripped from the retry insert
// if the full insert fails due to a missing column. Remove from this list once
// a column is confirmed in the DB (i.e. after migration has been applied).
const optionalListingColumns = [
  // Delivery / pallet columns not yet in all DB schemas
  'subcategory',
  'delivery_provider',
  'caterbids_delivery_available',
  'collection_full_address',
  'collection_city',
  'seller_contact_name',
  'seller_phone',
  'pallet_weight_kg',
  'pallet_length_cm',
  'pallet_width_cm',
  'pallet_height_cm',
  'pallet_size',
  'pallet_count',
  'shrink_wrapped_confirmed',
  'pallet_preparation_confirmed',
  'preferred_collection_date',
  'insurance_value',
  'access_restrictions',
  'delivery_details_confirmed',
  'estimated_weight',
  'shipping_class',
  'shipping_confidence',
  'shipping_details_confirmed_by_seller',
  'specialist_delivery_recommended',
  'ai_delivery_confidence',
  // CaterBot spec columns not yet confirmed in all DB schemas
  'specs_last_checked_at',
  'equipment_spec_id',
  'spec_plate_image_url',
  'spec_gc_number',
  'spec_moderation_status',
  'spec_moderation_notes',
  'collection_enabled',
  'buyer_arranges_enabled',
  'equipment_type',
] as const

function withoutOptionalListingColumns(payload: Record<string, unknown>) {
  const nextPayload = { ...payload }
  for (const column of optionalListingColumns) {
    delete nextPayload[column]
  }
  return nextPayload
}

function formatPrice(price: string) {
  const value = price.trim()
  if (!value) return ''
  return value.startsWith('£') ? value : `£${value}`
}

function optionalNumber(value: FormDataEntryValue | null) {
  const numberValue = Number(value || '')
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null
}

function parseImageUrls(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === 'string' && Boolean(url)) : []
  } catch {
    return []
  }
}



export async function createListing(
  formData: FormData
): Promise<{ success: false; error: string; code?: string; redirectTo?: string } | { success: true; listingId: string; redirectTo: string } | void> {
  const supabase = await createClient()

  // Get current user
  const user = await getCurrentUser(supabase)
  if (!user) {
    redirect('/login?redirect=/post-listing')
  }

  const input: ListingInput = {
    title: (formData.get('title') as string)?.trim() || '',
    price: formatPrice((formData.get('price') as string) || ''),
    location: (formData.get('location') as string)?.trim() || '',
    city: (formData.get('city') as string)?.trim() || null,
    category: (formData.get('category') as string) || 'Catering Equipment',
    subcategory: (formData.get('subcategory') as string) || null,
    equipment_type: (formData.get('equipment_type') as string) || null,
    description: (formData.get('description') as string) || null,
    condition: (formData.get('condition') as string) || null,
    power_type: (formData.get('power_type') as string) || null,
    dimensions: (formData.get('dimensions') as string)?.trim() || null,
    service_history: (formData.get('service_history') as string)?.trim() || null,
    warranty_type: (formData.get('warranty_type') as string) || null,
    manuals_available: formData.get('manuals_available') === 'on',
    tested_status: (formData.get('tested_status') as string) || null,
    delivery_option: (formData.get('delivery_option') as string) || null,
    delivery_method: (formData.get('delivery_method') as string) || 'collection_only',
    collection_enabled: formData.get('collection_enabled') === 'on',
    buyer_arranges_enabled: formData.get('buyer_arranges_enabled') === 'on',
    delivery_provider: (formData.get('delivery_provider') as string)?.trim() || null,
    collection_postcode: (formData.get('collection_postcode') as string)?.trim() || null,
    collection_full_address: (formData.get('collection_full_address') as string)?.trim() || null,
    collection_city: (formData.get('collection_city') as string)?.trim() || null,
    seller_contact_name: (formData.get('seller_contact_name') as string)?.trim() || null,
    seller_phone: (formData.get('seller_phone') as string)?.trim() || null,
    vat_included: formData.get('vat_included') === 'on',
    weight_kg: optionalNumber(formData.get('weight_kg')),
    length_cm: optionalNumber(formData.get('length_cm')),
    width_cm: optionalNumber(formData.get('width_cm')),
    height_cm: optionalNumber(formData.get('height_cm')),
    pallet_size: (formData.get('pallet_size') as string)?.trim() || null,
    pallet_count: optionalNumber(formData.get('pallet_count')) || 1,
    preferred_collection_date: (formData.get('preferred_collection_date') as string) || null,
    insurance_value: optionalNumber(formData.get('insurance_value')),
    access_restrictions: (formData.get('access_restrictions') as string)?.trim() || null,
    delivery_notes: (formData.get('delivery_notes') as string)?.trim() || null,
    delivery_details_confirmed: formData.get('delivery_details_confirmed') === 'on',
    estimated_weight: (formData.get('estimated_weight') as string)?.trim() || null,
    delivery_type: (formData.get('delivery_type') as string)?.trim() || null,
    shipping_class: (formData.get('shipping_class') as string)?.trim() || null,
    shipping_confidence: (formData.get('shipping_confidence') as string)?.trim() || null,
    shipping_details_confirmed_by_seller: formData.get('shipping_details_confirmed_by_seller') === 'true',
    pallet_delivery_recommended: formData.get('pallet_delivery_recommended') === 'true',
    specialist_delivery_recommended: formData.get('specialist_delivery_recommended') === 'true',
    manual_source_url: (formData.get('manual_source_url') as string)?.trim() || null,
    spec_source_url: (formData.get('spec_source_url') as string)?.trim() || null,
    manual_source_name: (formData.get('manual_source_name') as string)?.trim() || null,
    manual_source_type: (formData.get('manual_source_type') as string)?.trim() || null,
    manual_source_validated: formData.get('manual_source_validated') === 'true',
    manual_source_last_checked_at: (formData.get('manual_source_last_checked_at') as string)?.trim() || null,
    manual_source_match_notes: (formData.get('manual_source_match_notes') as string)?.trim() || null,
    ai_spec_confidence: (formData.get('ai_spec_confidence') as string)?.trim() || null,
    specs_verified_by_seller: formData.get('specs_verified_by_seller') === 'on',
    source_rejected_by_seller: formData.get('source_rejected_by_seller') === 'true',
    spec_plate_image_url: (formData.get('spec_plate_image_url') as string)?.trim() || null,
    spec_brand: (formData.get('spec_brand') as string)?.trim() || null,
    spec_model: (formData.get('spec_model') as string)?.trim() || null,
    spec_serial_number: (formData.get('spec_serial_number') as string)?.trim() || null,
    spec_gc_number: (formData.get('spec_gc_number') as string)?.trim() || null,
    spec_category: (formData.get('spec_category') as string)?.trim() || null,
    spec_power_type: (formData.get('spec_power_type') as string)?.trim() || null,
    spec_phase: (formData.get('spec_phase') as string)?.trim() || null,
    spec_voltage: (formData.get('spec_voltage') as string)?.trim() || null,
    spec_current_a: optionalNumber(formData.get('spec_current_a')),
    spec_gas_type: (formData.get('spec_gas_type') as string)?.trim() || null,
    spec_gas_connection: (formData.get('spec_gas_connection') as string)?.trim() || null,
    spec_height_cm: optionalNumber(formData.get('spec_height_cm')),
    spec_width_cm: optionalNumber(formData.get('spec_width_cm')),
    spec_depth_cm: optionalNumber(formData.get('spec_depth_cm')),
    spec_weight_kg: optionalNumber(formData.get('spec_weight_kg')),
    spec_forklift_required: formData.get('spec_forklift_required') === 'on',
    spec_condition_notes: (formData.get('spec_condition_notes') as string)?.trim() || null,
    pallet_ready: formData.get('pallet_ready') === 'on',
    tail_lift_required: formData.get('tail_lift_required') === 'on',
    forklift_available: formData.get('forklift_available') === 'on',
    ground_floor_collection: formData.get('ground_floor_collection') === 'on',
    commercial_premises: formData.get('commercial_premises') === 'on',
    shrink_wrapped_confirmed: formData.get('shrink_wrapped_confirmed') === 'on',
    pallet_preparation_confirmed: formData.get('pallet_preparation_confirmed') === 'on',
    delivery_available: formData.get('delivery_available') === 'on',
    image: (formData.get('image') as string) || null,
    images: parseImageUrls(formData.get('images')),
  }

  if (!input.title || !input.price || !input.location) {
    console.warn('Title, price, and location are required')
    return {
      success: false,
      error: 'Please add title, price and location.',
      code: 'VALIDATION_ERROR',
    }
  }

  const { data: sellerProfile } = await supabase
    .from('profiles')
    .select('phone,phone_number')
    .eq('id', user.id)
    .maybeSingle()
  const sellerAccountPhone = sellerProfile?.phone_number || sellerProfile?.phone

  if (!sellerAccountPhone && !input.seller_phone) {
    return {
      success: false,
      error: 'Add a mobile number in Account > Trust & Verification before publishing. Manual admin verification can stay pending during launch.',
      code: 'PHONE_REQUIRED',
    }
  }

  const sourceCanBePublished =
    Boolean(input.manual_source_validated) &&
    Boolean(input.specs_verified_by_seller) &&
    !input.source_rejected_by_seller &&
    Boolean(input.manual_source_url || input.spec_source_url)

  // Check for duplicate: exact match on title, price, location, category, user_id (case insensitive for text fields)
  const { data: existing } = await supabase
    .from('listings')
    .select('id')
    .eq('user_id', user.id)
    .ilike('title', input.title)
    .ilike('price', input.price)
    .ilike('location', input.location)
    .ilike('category', input.category)
    .maybeSingle()

  if (existing) {
    console.warn('This listing already exists.')
    redirect(`/account?published=existing&listing=${existing.id}`)
  }

  let paidEntitlementToUse: SellerListingEntitlement | null = null
  let isFoundingMember = false

  try {
    const admin = createAdminClient()
    const [{ data: paymentSettingsRow }, { count: sellerLiveListingCount }, { data: profileForEntitlement }] = await Promise.all([
      admin.from('payment_settings' as never).select('*').limit(1).maybeSingle(),
      // TODO: route this gate through countLiveListings() in lib/entitlements/usage.ts (also adds seller_id fallback + status null)
      admin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['live', 'active', 'pending_payment']),
      admin.from('profiles').select('is_founding_member').eq('id', user.id).maybeSingle(),
    ])
    const paymentSettings = normalisePaymentSettings(paymentSettingsRow as Record<string, unknown> | null)
    const currentLiveListings = sellerLiveListingCount || 0
    isFoundingMember = Boolean((profileForEntitlement as any)?.is_founding_member)

    if (isFoundingMember && currentLiveListings < 30) {
      // Founding Trade Member fast-path: up to 30 concurrent live listings, free.
      // paidEntitlementToUse stays null — no entitlement consumed.
    } else if (!sellerCanPublishForFree(paymentSettings, currentLiveListings)) {
      const { data: entitlements } = await admin
        .from('seller_listing_entitlements')
        .select('*')
        .eq('seller_id', user.id)
        .eq('active', true)
        .order('expires_at', { ascending: true })

      const usableEntitlement = ((entitlements || []) as Record<string, unknown>[])
        .map((entitlement) => ({
          id: String(entitlement.id || ''),
          seller_id: String(entitlement.seller_id || ''),
          plan_id: typeof entitlement.plan_id === 'string' ? entitlement.plan_id : null,
          plan_name: String(entitlement.plan_name || 'Seller plan'),
          stripe_session_id: typeof entitlement.stripe_session_id === 'string' ? entitlement.stripe_session_id : null,
          listing_count_total: Number(entitlement.listing_count_total || 0),
          listing_count_used: Number(entitlement.listing_count_used || 0),
          monthly: Boolean(entitlement.monthly),
          expires_at: typeof entitlement.expires_at === 'string' ? entitlement.expires_at : null,
          active: Boolean(entitlement.active),
        }))
        .find(entitlementHasAllowance)

      if (usableEntitlement) {
        paidEntitlementToUse = usableEntitlement
      } else {
        const monthlyAtLimit = ((entitlements || []) as Record<string, unknown>[])
          .map((e) => ({
            id: String(e.id || ''),
            plan_name: String(e.plan_name || ''),
            listing_count_total: Number(e.listing_count_total || 0),
            listing_count_used: Number(e.listing_count_used || 0),
            monthly: Boolean(e.monthly),
            expires_at: typeof e.expires_at === 'string' ? e.expires_at : null,
            active: Boolean(e.active),
          }))
          .find((e) => {
            if (!e.active || !e.monthly) return false
            if (e.expires_at && new Date(e.expires_at) < new Date()) return false
            return e.listing_count_used >= e.listing_count_total
          })
        if (monthlyAtLimit) {
          const { data: planRow } = await (admin.from('seller_plans' as never) as any)
            .select('overage_price')
            .eq('name', monthlyAtLimit.plan_name)
            .eq('active', true)
            .maybeSingle()
          const overagePrice = Number((planRow as Record<string, unknown> | null)?.overage_price || 0)
          if (overagePrice > 0) {
            return {
              success: false,
              error: `You've used all ${monthlyAtLimit.listing_count_total} listings in your ${monthlyAtLimit.plan_name}. Add 1 more for £${overagePrice.toFixed(2)}.`,
              code: 'OVERAGE_REQUIRED',
            }
          }
        }
        return {
          success: false,
          error:
            'Your free listing allowance has been used. Choose a listing pack or monthly plan before publishing.',
          code: 'PAYMENT_REQUIRED',
          redirectTo: '/pricing?payment_required=1',
        }
      }
    }
  } catch (error) {
    console.warn('Payment settings unavailable. Allowing listing publish in launch free mode:', error)
  }

  const listingId = crypto.randomUUID()
  const usesPalletDelivery = input.delivery_method === 'pallet_delivery'
  // spec_* fields carry raw item dimensions from CaterBot; weight_kg/height_cm/etc.
  // carry pallet-adjusted delivery values entered by the seller. Item dims take
  // priority so the KB and admin review see spec values, not pallet offsets.
  // Pallet dims fall through when CaterBot found nothing (delivery safety net).
  const resolvedWeightKg = input.spec_weight_kg || input.weight_kg
  const resolvedLengthCm = input.spec_depth_cm  || input.length_cm
  const resolvedWidthCm  = input.spec_width_cm  || input.width_cm
  const resolvedHeightCm = input.spec_height_cm || input.height_cm
  // Pallet delivery dims (seller-confirmed). Written to pallet_* columns when
  // those exist in the schema; silently ignored otherwise.
  const palletWeightKg = input.weight_kg
  const palletLengthCm = input.length_cm
  const palletWidthCm  = input.width_cm
  const palletHeightCm = input.height_cm
  const listingPayload = {
    id: listingId,
    title: input.title,
    price: input.price,
    location: input.location,
    city: input.city,
    category: input.category,
    subcategory: input.subcategory,
    equipment_type: input.equipment_type,
    description: input.description,
    condition: input.condition,
    power_type: input.power_type,
    dimensions: input.dimensions,
    service_history: input.service_history,
    warranty_type: input.warranty_type,
    manuals_available: input.manuals_available,
    tested_status: input.tested_status,
    delivery_option: input.delivery_option || (usesPalletDelivery ? 'CaterBids Pallet Delivery' : input.delivery_method === 'buyer_arranges' ? 'Buyer arranges delivery' : 'Collection only'),
    delivery_provider: usesPalletDelivery ? 'Interparcel' : null,
    collection_postcode: usesPalletDelivery ? input.collection_postcode : null,
    collection_full_address: usesPalletDelivery ? input.collection_full_address : null,
    collection_city: usesPalletDelivery ? input.collection_city : null,
    seller_contact_name: usesPalletDelivery ? input.seller_contact_name : null,
    seller_phone: usesPalletDelivery ? input.seller_phone : null,
    vat_included: input.vat_included,
    weight_kg: resolvedWeightKg,
    length_cm: resolvedLengthCm,
    width_cm: resolvedWidthCm,
    height_cm: resolvedHeightCm,
    pallet_weight_kg: usesPalletDelivery ? palletWeightKg : null,
    pallet_length_cm: usesPalletDelivery ? palletLengthCm : null,
    pallet_width_cm:  usesPalletDelivery ? palletWidthCm  : null,
    pallet_height_cm: usesPalletDelivery ? palletHeightCm : null,
    pallet_size: usesPalletDelivery ? input.pallet_size : null,
    pallet_count: input.pallet_count,
    pallet_ready: usesPalletDelivery ? input.pallet_ready : false,
    tail_lift_required: usesPalletDelivery ? input.tail_lift_required : false,
    forklift_available: usesPalletDelivery ? input.forklift_available : false,
    ground_floor_collection: usesPalletDelivery ? input.ground_floor_collection : false,
    commercial_premises: usesPalletDelivery ? input.commercial_premises : false,
    shrink_wrapped_confirmed: usesPalletDelivery ? input.shrink_wrapped_confirmed : false,
    pallet_preparation_confirmed: usesPalletDelivery ? input.pallet_preparation_confirmed : false,
    delivery_available: usesPalletDelivery,
    caterbids_delivery_available: usesPalletDelivery,
    collection_enabled: input.collection_enabled ?? false,
    buyer_arranges_enabled: input.buyer_arranges_enabled ?? false,
    preferred_collection_date: usesPalletDelivery ? input.preferred_collection_date : null,
    insurance_value: usesPalletDelivery ? input.insurance_value : null,
    access_restrictions: usesPalletDelivery ? input.access_restrictions : null,
    delivery_notes: usesPalletDelivery ? input.delivery_notes : null,
    delivery_details_confirmed: usesPalletDelivery ? input.delivery_details_confirmed : false,
    estimated_weight: input.estimated_weight,
    delivery_type: input.delivery_type,
    shipping_class: input.shipping_class,
    shipping_confidence: input.shipping_confidence,
    shipping_details_confirmed_by_seller: input.shipping_details_confirmed_by_seller,
    pallet_delivery_recommended: input.pallet_delivery_recommended,
    specialist_delivery_recommended: input.specialist_delivery_recommended,
    ai_delivery_confidence: null,
    manual_source_url: sourceCanBePublished ? input.manual_source_url : null,
    spec_source_url: sourceCanBePublished ? input.spec_source_url : null,
    manual_source_name: sourceCanBePublished ? input.manual_source_name : null,
    manual_source_type: sourceCanBePublished ? input.manual_source_type : null,
    manual_source_validated: sourceCanBePublished,
    manual_source_last_checked_at: sourceCanBePublished
      ? input.manual_source_last_checked_at || new Date().toISOString()
      : input.manual_source_last_checked_at,
    manual_source_match_notes: input.manual_source_match_notes,
    ai_spec_confidence: sourceCanBePublished ? input.ai_spec_confidence : 'low',
    specs_verified_by_seller: sourceCanBePublished,
    specs_last_checked_at: sourceCanBePublished ? new Date().toISOString() : null,
    source_rejected_by_seller: Boolean(input.source_rejected_by_seller),
    spec_plate_image_url: input.spec_plate_image_url,
    spec_brand: input.spec_brand,
    spec_model: input.spec_model,
    spec_serial_number: input.spec_serial_number,
    spec_gc_number: input.spec_gc_number,
    spec_moderation_status: (input.spec_brand && input.spec_model) ? 'pending' : null,
    spec_moderation_notes: (input.spec_brand && input.spec_model)
      ? 'Shipping specs queued for verification.'
      : null,
    image_url: input.image || input.images?.[0] || null,
    images: input.images || [],
    seller_id: user.id,
    user_id: user.id,
    status: 'live',
  }

  let { data: createdListing, error } = await supabase
    .from('listings')
    .insert(listingPayload as Record<string, unknown>)
    .select('id')
    .single()

  if (error && isMissingColumnError(error)) {
    console.warn('Supabase listings table is missing newer columns. Retrying publish with core listing columns only.')
    const legacyPayload = withoutOptionalListingColumns(listingPayload)
    const retry = await supabase
      .from('listings')
      .insert(legacyPayload as Record<string, unknown>)
      .select('id')
      .single()

    createdListing = retry.data
    error = retry.error
  }

  if (error) {
    console.warn('Insert error:', error)
    return {
      success: false,
      error: error.message || 'Could not publish listing.',
      code: error.code,
    }
  }

  if (paidEntitlementToUse) {
    try {
      const admin = createAdminClient()
      await admin
        .from('seller_listing_entitlements')
        .update({
          listing_count_used: paidEntitlementToUse.listing_count_used + 1,
          active: paidEntitlementToUse.listing_count_used + 1 < paidEntitlementToUse.listing_count_total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paidEntitlementToUse.id)
    } catch (entitlementError) {
      console.warn('Listing published but paid seller allowance was not updated:', entitlementError)
    }
  }

  // PART 2: Founding Member free feature — apply inline at creation if requested.
  // Non-fatal: listing is already live; a failed feature is recoverable from the dashboard.
  if (createdListing?.id && isFoundingMember && formData.get('founding_free_feature') === 'on') {
    try {
      const admin = createAdminClient()
      // Re-check that no other listing already holds the slot (race-safe within reason).
      const { count: existingSlotCount } = await admin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('featured_type', 'founding_free')
      if ((existingSlotCount || 0) === 0) {
        await admin
          .from('listings')
          .update({
            featured: true,
            featured_type: 'founding_free',
            featured_at: new Date().toISOString(),
          } as never)
          .eq('id', createdListing.id)
      }
    } catch (featureError) {
      console.warn('Founding free feature could not be applied at creation:', featureError)
    }
  }

  revalidatePath('/search')
  revalidatePath('/')
  revalidatePath('/account')
  revalidatePath('/listing')

  if (createdListing?.id) {
    if (input.spec_brand && input.spec_model) {
      try {
        await runEquipmentSpecPipeline(createAdminClient(), {
          listingId: createdListing.id,
          sellerId: user.id,
          brand: input.spec_brand,
          model: input.spec_model,
          serialNumber: input.spec_serial_number,
          gcNumber: input.spec_gc_number,
          category: input.spec_category || input.subcategory || input.category,
          specPlateImageUrl: input.spec_plate_image_url,
          powerType: input.spec_power_type,
          voltage: input.spec_voltage,
          phase: input.spec_phase,
          currentA: input.spec_current_a,
          gasType: input.spec_gas_type,
          gasConnection: input.spec_gas_connection,
          heightCm: input.spec_height_cm || input.height_cm,
          widthCm: input.spec_width_cm || input.width_cm,
          depthCm: input.spec_depth_cm || input.length_cm,
          weightKg: input.spec_weight_kg || input.weight_kg,
          forkliftRequired: input.spec_forklift_required,
          conditionNotes: input.spec_condition_notes || input.delivery_notes,
          sourceUrl: input.spec_source_url || input.manual_source_url,
          listingTitle: input.title,
        })
      } catch (error) {
        console.warn('Equipment specs verification could not complete:', error)
      }
    }

    return {
      success: true,
      listingId: createdListing.id,
      redirectTo: `/post-listing/success?id=${createdListing.id}`,
    }
  }
}
