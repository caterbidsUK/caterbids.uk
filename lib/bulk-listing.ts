'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getSellerCredits } from '@/lib/entitlements/usage'
import { TRADE_PLAN_NAME } from '@/lib/pricing'
import { parseListingPrice, priceKey } from '@/lib/price'
import { subcategoriesForCategory } from '@/lib/categories'

export type BulkListingRow = {
  title: string
  price: string
  location: string
  category?: string | null
  subcategory?: string | null
  condition?: string | null
  description?: string | null
}

export type BulkRowResult = {
  index: number
  title: string
  listingId: string | null
  isDuplicate: boolean
  error: string | null
}

export type BulkListingResponse =
  | { success: false; error: string }
  | {
      success: true
      results: BulkRowResult[]
      created: number
      duplicates: number
      failed: number
    }

const MAX_ROWS = 100

export async function createBulkListings(
  rows: BulkListingRow[]
): Promise<BulkListingResponse> {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)
  if (!user) return { success: false, error: 'You must be logged in.' }

  // Gate: Founding Trade Members and Trade Plan subscribers only.
  // Never check entitlements here — every row is inserted as payment_pending.
  // The credit is consumed later when the seller publishes each draft individually.
  const admin = createAdminClient()
  const credits = await getSellerCredits(admin, user.id)
  const allowed =
    credits.planType === 'founding' ||
    (credits.planType === 'subscription' && credits.planName === TRADE_PLAN_NAME)
  if (!allowed) {
    return {
      success: false,
      error: 'Bulk upload requires a Trade Plan or Founding Trade Membership.',
    }
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, error: 'No rows to import.' }
  }

  const batch = rows.slice(0, MAX_ROWS)

  // One query to load existing non-deleted listings for duplicate detection.
  // Prices are normalised via priceKey so "£1,200", "1200", "£1200" all match.
  const { data: existing } = await supabase
    .from('listings')
    .select('title, price, location, category')
    .eq('user_id', user.id)
    .not('status', 'eq', 'deleted')

  const existingKeys = new Set(
    (existing || []).map((l) =>
      [
        (l.title ?? '').toLowerCase(),
        priceKey(l.price),
        (l.location ?? '').toLowerCase(),
        (l.category ?? '').toLowerCase(),
      ].join('|')
    )
  )

  const results: BulkRowResult[] = []
  let created = 0
  let duplicates = 0
  let failed = 0

  for (let i = 0; i < batch.length; i++) {
    const row = batch[i]
    const title = (row.title ?? '').trim()
    const rawPrice = (row.price ?? '').trim()
    const location = (row.location ?? '').trim()
    const category = (row.category ?? '').trim() || 'Catering Equipment'
    const subcategory = (row.subcategory ?? '').trim() || null

    // Validate all required fields before touching the DB.
    const errors: string[] = []
    if (!title) errors.push('Missing: title')
    if (!rawPrice) {
      errors.push('Missing: price')
    } else if (parseListingPrice(rawPrice) === null) {
      errors.push('Ambiguous price — write it as 15 or 15000')
    }
    if (!location) errors.push('Missing: location')
    if (subcategoriesForCategory(category).length > 0 && !subcategory) {
      errors.push('Missing subcategory')
    }

    if (errors.length) {
      results.push({
        index: i,
        title: title || '(no title)',
        listingId: null,
        isDuplicate: false,
        error: errors.join('; '),
      })
      failed++
      continue
    }

    const parsedPrice = parseListingPrice(rawPrice)!
    const price = `£${parsedPrice % 1 === 0 ? parsedPrice : parsedPrice.toFixed(2)}`

    const dupKey = [title, priceKey(rawPrice), location, category]
      .map((s) => s.toLowerCase())
      .join('|')
    const isDuplicate = existingKeys.has(dupKey)

    const listingId = crypto.randomUUID()

    const { error: insertError } = await supabase.from('listings').insert({
      id: listingId,
      title,
      price,
      location,
      category,
      subcategory,
      condition: row.condition || null,
      description: row.description || null,
      user_id: user.id,
      seller_id: user.id,
      status: 'payment_pending',
      images: [],
      image_url: null,
    } as Record<string, unknown>)

    if (insertError) {
      results.push({
        index: i,
        title,
        listingId: null,
        isDuplicate,
        error: insertError.message,
      })
      failed++
      continue
    }

    // Add to the key set so later rows in the same batch flag each other.
    existingKeys.add(dupKey)
    if (isDuplicate) duplicates++
    created++
    results.push({ index: i, title, listingId, isDuplicate, error: null })
  }

  return { success: true, results, created, duplicates, failed }
}
