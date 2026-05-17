'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runEquipmentSpecPipeline } from '@/lib/equipment-specs/pipeline'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type ListingInput = {
  title: string
  price: string
  location: string
  category: string
  subcategory?: string | null
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
  delivery_available?: boolean | null
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

const optionalListingColumns = [
  'subcategory',
  'delivery_method',
  'caterbids_delivery_available',
  'collection_full_address',
  'collection_city',
  'seller_contact_name',
  'seller_phone',
  'pallet_weight_kg',
  'pallet_length_cm',
  'pallet_width_cm',
  'pallet_height_cm',
  'pallet_count',
  'preferred_collection_date',
  'insurance_value',
  'access_restrictions',
  'delivery_notes',
  'delivery_details_confirmed',
  'estimated_weight',
  'delivery_type',
  'shipping_class',
  'shipping_confidence',
  'shipping_details_confirmed_by_seller',
  'pallet_delivery_recommended',
  'specialist_delivery_recommended',
  'ai_delivery_confidence',
  'manual_source_url',
  'spec_source_url',
  'manual_source_name',
  'manual_source_type',
  'manual_source_validated',
  'manual_source_last_checked_at',
  'manual_source_match_notes',
  'ai_spec_confidence',
  'specs_verified_by_seller',
  'source_rejected_by_seller',
  'specs_last_checked_at',
  'equipment_spec_id',
  'spec_plate_image_url',
  'spec_plate_ocr_text',
  'spec_brand',
  'spec_model',
  'spec_serial_number',
  'spec_gc_number',
  'spec_moderation_status',
  'spec_moderation_notes',
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
): Promise<{ success: false; error: string; code?: string } | void> {
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
    redirect(`/listing?id=${existing.id}`)
  }

  const listingId = crypto.randomUUID()
  const listingPayload = {
    id: listingId,
    title: input.title,
    price: input.price,
    location: input.location,
    city: input.city,
    category: input.category,
    subcategory: input.subcategory,
    description: input.description,
    condition: input.condition,
    power_type: input.power_type,
    dimensions: input.dimensions,
    service_history: input.service_history,
    warranty_type: input.warranty_type,
    manuals_available: input.manuals_available,
    tested_status: input.tested_status,
    delivery_option: input.delivery_option,
    delivery_method: input.delivery_method,
    collection_postcode: input.collection_postcode,
    collection_full_address: input.collection_full_address,
    collection_city: input.collection_city,
    seller_contact_name: input.seller_contact_name,
    seller_phone: input.seller_phone,
    vat_included: input.vat_included,
    weight_kg: input.weight_kg,
    length_cm: input.length_cm,
    width_cm: input.width_cm,
    height_cm: input.height_cm,
    pallet_weight_kg: input.weight_kg,
    pallet_length_cm: input.length_cm,
    pallet_width_cm: input.width_cm,
    pallet_height_cm: input.height_cm,
    pallet_count: input.pallet_count,
    pallet_ready: input.pallet_ready,
    tail_lift_required: input.tail_lift_required,
    forklift_available: input.forklift_available,
    ground_floor_collection: input.ground_floor_collection,
    commercial_premises: input.commercial_premises,
    delivery_available: input.delivery_method === 'caterbids_delivery',
    caterbids_delivery_available: input.delivery_method === 'caterbids_delivery',
    preferred_collection_date: input.preferred_collection_date,
    insurance_value: input.insurance_value,
    access_restrictions: input.access_restrictions,
    delivery_notes: input.delivery_notes,
    delivery_details_confirmed: input.delivery_details_confirmed,
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
    spec_moderation_status: input.spec_brand && input.spec_model ? 'pending' : null,
    spec_moderation_notes: input.spec_brand && input.spec_model ? 'Shipping specs queued for verification.' : null,
    image_url: input.image || input.images?.[0] || null,
    images: input.images || [],
    seller_id: user.id,
    user_id: user.id,
    status: 'live',
  }

  let { data: createdListing, error } = await supabase
    .from('listings')
    .insert(listingPayload as any)
    .select('id')
    .single()

  if (error && isMissingColumnError(error)) {
    console.warn('Supabase listings table is missing newer columns. Retrying publish with core listing columns only.')
    const legacyPayload = withoutOptionalListingColumns(listingPayload)
    const retry = await supabase
      .from('listings')
      .insert(legacyPayload as any)
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

  revalidatePath('/search')
  revalidatePath('/')

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

    redirect(`/listing?id=${createdListing.id}`)
  }
}
