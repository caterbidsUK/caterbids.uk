export const PAYMENT_SETTINGS_ID = "00000000-0000-0000-0000-000000000001"
export const PAYMENTS_DISABLED_MESSAGE = "Payments are currently disabled — free listing mode is active."

export type PaymentSettings = {
  id: string
  payments_enabled: boolean
  free_listing_mode: boolean
  free_listing_limit: number
  listing_packs_enabled: boolean
  subscriptions_enabled: boolean
  featured_boosts_enabled: boolean
  test_mode: boolean
  currency: string
  created_at?: string | null
  updated_at?: string | null
}

export type SellerPlanType = "single_pack" | "subscription"

export type SellerPlan = {
  id?: string
  name: string
  type: SellerPlanType
  price: number
  listing_count: number
  duration_days: number | null
  monthly: boolean
  features: string[]
  active: boolean
}

export type SellerListingEntitlement = {
  id: string
  seller_id: string
  plan_id?: string | null
  plan_name: string
  stripe_session_id?: string | null
  listing_count_total: number
  listing_count_used: number
  monthly: boolean
  expires_at?: string | null
  active: boolean
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  id: PAYMENT_SETTINGS_ID,
  payments_enabled: false,
  free_listing_mode: true,
  free_listing_limit: 100,
  listing_packs_enabled: true,
  subscriptions_enabled: true,
  featured_boosts_enabled: true,
  test_mode: true,
  currency: "GBP",
  created_at: null,
  updated_at: null,
}

export const SELLER_PLANS: SellerPlan[] = [
  {
    name: "Single Listing",
    type: "single_pack",
    price: 5,
    listing_count: 1,
    duration_days: 30,
    monthly: false,
    features: ["30 days live", "Up to 10 photos", "Buyer messages included"],
    active: true,
  },
  {
    name: "3 Listings Pack",
    type: "single_pack",
    price: 12,
    listing_count: 3,
    duration_days: 30,
    monthly: false,
    features: ["Save £3", "For small clear-outs"],
    active: true,
  },
  {
    name: "10 Listings Pack",
    type: "single_pack",
    price: 35,
    listing_count: 10,
    duration_days: 30,
    monthly: false,
    features: ["Save £15", "For trade sellers"],
    active: true,
  },
  {
    name: "Starter Plan",
    type: "subscription",
    price: 9.99,
    listing_count: 3,
    duration_days: 30,
    monthly: true,
    features: ["3 listings included", "£4 extra listing"],
    active: true,
  },
  {
    name: "Pro Plan",
    type: "subscription",
    price: 24.99,
    listing_count: 10,
    duration_days: 30,
    monthly: true,
    features: ["10 listings included", "AI listing tools", "1 featured boost"],
    active: true,
  },
  {
    name: "Trade Plan",
    type: "subscription",
    price: 49.99,
    listing_count: 30,
    duration_days: 30,
    monthly: true,
    features: ["30 listings included", "Bulk tools", "Priority support"],
    active: true,
  },
]

type PaymentSettingsRow = Partial<Record<keyof PaymentSettings, unknown>>
type SellerPlanRow = Partial<Record<keyof SellerPlan, unknown>>

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalisePaymentSettings(row?: PaymentSettingsRow | null): PaymentSettings {
  if (!row) return DEFAULT_PAYMENT_SETTINGS

  return {
    id: typeof row.id === "string" ? row.id : DEFAULT_PAYMENT_SETTINGS.id,
    payments_enabled: booleanValue(row.payments_enabled, DEFAULT_PAYMENT_SETTINGS.payments_enabled),
    free_listing_mode: booleanValue(row.free_listing_mode, DEFAULT_PAYMENT_SETTINGS.free_listing_mode),
    free_listing_limit: Math.max(0, Math.floor(numberValue(row.free_listing_limit, DEFAULT_PAYMENT_SETTINGS.free_listing_limit))),
    listing_packs_enabled: booleanValue(row.listing_packs_enabled, DEFAULT_PAYMENT_SETTINGS.listing_packs_enabled),
    subscriptions_enabled: booleanValue(row.subscriptions_enabled, DEFAULT_PAYMENT_SETTINGS.subscriptions_enabled),
    featured_boosts_enabled: booleanValue(row.featured_boosts_enabled, DEFAULT_PAYMENT_SETTINGS.featured_boosts_enabled),
    test_mode: booleanValue(row.test_mode, DEFAULT_PAYMENT_SETTINGS.test_mode),
    currency: typeof row.currency === "string" && row.currency.trim() ? row.currency.trim().toUpperCase() : DEFAULT_PAYMENT_SETTINGS.currency,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  }
}

export function normaliseSellerPlan(row: SellerPlanRow): SellerPlan {
  const fallback = SELLER_PLANS.find((plan) => plan.name === row.name) || SELLER_PLANS[0]
  const rawFeatures = row.features
  const features = Array.isArray(rawFeatures)
    ? rawFeatures.filter((feature): feature is string => typeof feature === "string")
    : fallback.features

  return {
    id: typeof row.id === "string" ? row.id : undefined,
    name: typeof row.name === "string" && row.name.trim() ? row.name : fallback.name,
    type: row.type === "subscription" ? "subscription" : "single_pack",
    price: numberValue(row.price, fallback.price),
    listing_count: Math.max(1, Math.floor(numberValue(row.listing_count, fallback.listing_count))),
    duration_days: row.duration_days === null ? null : Math.max(1, Math.floor(numberValue(row.duration_days, fallback.duration_days || 30))),
    monthly: booleanValue(row.monthly, fallback.monthly),
    features,
    active: booleanValue(row.active, true),
  }
}

export function formatPlanPrice(plan: SellerPlan) {
  const amount = plan.price.toLocaleString("en-GB", {
    minimumFractionDigits: plan.price % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return `£${amount}${plan.monthly ? "/mo" : ""}`
}

export function sellerCanPublishForFree(settings: PaymentSettings, sellerLiveListingCount: number) {
  if (!settings.payments_enabled) return true
  if (!settings.free_listing_mode) return false
  return sellerLiveListingCount < settings.free_listing_limit
}

export function entitlementHasAllowance(entitlement: Pick<SellerListingEntitlement, "listing_count_total" | "listing_count_used" | "expires_at" | "active">) {
  if (!entitlement.active) return false
  if (entitlement.expires_at && new Date(entitlement.expires_at).getTime() < Date.now()) return false
  return entitlement.listing_count_used < entitlement.listing_count_total
}

export function paymentStatusLabel(settings: PaymentSettings) {
  if (!settings.payments_enabled) return "Payments OFF / Testing Mode"
  if (settings.test_mode) return "Payments test mode"
  return "Payments LIVE"
}
