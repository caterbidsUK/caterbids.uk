import AdminDashboard, {
  type AdminAuditLog,
  type AdminListing,
  type AdminOrder,
  type AdminPaymentSettings,
  type AdminSellerPlan,
  type AdminSiteSetting,
  type AdminStat,
  type AdminTab,
  type AdminUser,
  type AdminVerification,
} from "./AdminDashboard"
import { requireAdmin } from "./admin-utils"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEFAULT_PAYMENT_SETTINGS, SELLER_PLANS, normalisePaymentSettings, normaliseSellerPlan } from "@/lib/pricing"

export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>

const ADMIN_TABS = ["overview", "listings", "users", "orders", "verification", "settings", "audit"] as const

async function safeCount(query: PromiseLike<any>, label: string) {
  try {
    const result = await query
    if (result.error) {
      console.warn(`Admin ${label} count failed:`, result.error.message)
      return 0
    }
    return result.count || 0
  } catch (error) {
    console.warn(`Admin ${label} count unavailable:`, error)
    return 0
  }
}

async function safeData<T>(query: PromiseLike<any>, label: string) {
  try {
    const result = await query
    if (result.error) {
      console.warn(`Admin ${label} query failed:`, result.error.message)
      return [] as T[]
    }
    return (result.data || []) as T[]
  } catch (error) {
    console.warn(`Admin ${label} query unavailable:`, error)
    return [] as T[]
  }
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function selectedTabFromParams(params: SearchParams): AdminTab {
  const tab = firstParam(params.tab)
  return ADMIN_TABS.includes(tab as AdminTab) ? (tab as AdminTab) : "overview"
}

function isFeaturedListing(listing: AdminListing) {
  return Boolean(listing.featured || listing.is_featured)
}

function isUrgentListing(listing: AdminListing) {
  const anyListing = listing as any
  return Boolean(anyListing.urgent || anyListing.is_urgent || anyListing.featured_type === "urgent")
}

function listingOwnerId(listing: AdminListing) {
  return listing.user_id || listing.seller_id || ""
}

function profileDisplayName(profile: AdminUser) {
  return profile.full_name || profile.name || profile.business || profile.email || "User"
}

function settingDefaults(settings: AdminSiteSetting[]) {
  const required: AdminSiteSetting[] = [
    {
      key: "homepage_notice",
      value: { text: "" },
      description: "",
      updated_at: null,
    },
    {
      key: "support_email",
      value: { text: "caterbidsuk@gmail.com" },
      description: "",
      updated_at: null,
    },
    {
      key: "launch_offer",
      value: { text: "First 100 listings free" },
      description: "",
      updated_at: null,
    },
    {
      key: "maintenance_mode",
      value: { text: "off", value: false, type: "boolean" },
      description: "",
      updated_at: null,
    },
  ]

  const byKey = new Map(settings.map((setting) => [setting.key, setting]))
  return required.map((fallback) => ({ ...fallback, ...(byKey.get(fallback.key) || {}) }))
}

function orderUserEmail(order: AdminOrder, usersById: Map<string, AdminUser>, field: "buyer_id" | "seller_id") {
  const id = order[field]
  if (!id) return ""
  return usersById.get(id)?.email || id
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) || {}
  const selectedTab = selectedTabFromParams(params)
  const statusFilter = firstParam(params.status) || ""
  const featuredFilter = firstParam(params.featured) === "true"
  const verifiedFilter = firstParam(params.verified) === "true"
  const userFilter = firstParam(params.user) || ""
  const setupParam = firstParam(params.setup) || ""

  const context = await requireAdmin("/admin")
  const admin = createAdminClient()

  const [
    listingsTotal,
    liveListings,
    usersTotal,
    verifiedUsers,
    ordersTotal,
    listingsRaw,
    usersRaw,
    ordersRaw,
    verificationsRaw,
    settingsRaw,
    paymentSettingsRaw,
    sellerPlansRaw,
    auditLogsRaw,
  ] = await Promise.all([
    safeCount(admin.from("listings").select("*", { count: "exact", head: true }), "listings"),
    safeCount(admin.from("listings").select("*", { count: "exact", head: true }).eq("status", "live"), "live listings"),
    safeCount(admin.from("profiles").select("*", { count: "exact", head: true }), "users"),
    safeCount(
      admin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .or("verified.eq.true,email_verified.eq.true,is_email_verified.eq.true,verified_user_badge.eq.true"),
      "verified users"
    ),
    safeCount(admin.from("orders").select("*", { count: "exact", head: true }), "orders"),
    safeData<AdminListing>(
      admin
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80) as any,
      "listings"
    ),
    safeData<AdminUser>(
      admin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(120) as any,
      "users"
    ),
    safeData<AdminOrder>(
      admin
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80) as any,
      "orders"
    ),
    safeData<AdminVerification>(
      admin
        .from("user_verifications" as any)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(80),
      "verification"
    ),
    safeData<AdminSiteSetting>(
      admin
        .from("site_settings" as any)
        .select("*")
        .order("key", { ascending: true })
        .limit(100),
      "site settings"
    ),
    safeData<AdminPaymentSettings>(
      admin
        .from("payment_settings" as never)
        .select("*")
        .limit(1),
      "payment settings"
    ),
    safeData<AdminSellerPlan>(
      admin
        .from("seller_plans" as never)
        .select("*")
        .eq("active", true)
        .order("price", { ascending: true }),
      "seller plans"
    ),
    safeData<AdminAuditLog>(
      admin
        .from("admin_audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      "audit logs"
    ),
  ])

  const usersById = new Map(usersRaw.map((user) => [user.id, user]))
  const listingsById = new Map(listingsRaw.map((listing) => [listing.id, listing]))
  const activeListingCounts = new Map<string, number>()
  const setupWarnings: string[] = []

  const listingFeatureColumnProbe = await admin
    .from("listings")
    .select("id,featured,is_featured,featured_until,featured_type,featured_at,featured_by")
    .limit(1)
  const listingUrgentColumnProbe = await admin
    .from("listings")
    .select("id,urgent,is_urgent")
    .limit(1)

  const listingFeatureControlsReady = !listingFeatureColumnProbe.error
  const listingUrgentControlsReady = !listingUrgentColumnProbe.error
  if (!listingFeatureControlsReady || setupParam === "listing_feature_columns") {
    setupWarnings.push(
      "Featured listing controls need the featured listing columns added in Supabase. Other listing controls still work."
    )
  }
  if (!listingUrgentControlsReady) {
    setupWarnings.push(
      "Urgent listing controls need urgent and is_urgent columns added in Supabase. Feature controls can still work without them."
    )
  }

  for (const listing of listingsRaw) {
    const ownerId = listingOwnerId(listing)
    const status = String(listing.status || "live").toLowerCase()
    if (ownerId && ["live", "payment_pending"].includes(status)) {
      activeListingCounts.set(ownerId, (activeListingCounts.get(ownerId) || 0) + 1)
    }
  }

  const listings = listingsRaw
    .filter((listing) => !statusFilter || String(listing.status || "").toLowerCase() === statusFilter.toLowerCase())
    .filter((listing) => !featuredFilter || isFeaturedListing(listing))
    .filter((listing) => !userFilter || listingOwnerId(listing) === userFilter)
    .map((listing) => {
      const ownerId = listingOwnerId(listing)
      return {
        ...listing,
        seller_email: ownerId ? usersById.get(ownerId)?.email || null : null,
        urgent: isUrgentListing(listing),
      }
    })

  const users = usersRaw
    .filter((user) => !verifiedFilter || Boolean(user.verified || user.email_verified || user.is_email_verified || user.verified_user_badge))
    .map((user) => ({
      ...user,
      active_listings_count: activeListingCounts.get(user.id) || 0,
    }))

  const orders = ordersRaw.map((order) => {
    const listing = listingsById.get(String(order.listing_id || ""))
    return {
      ...order,
      buyer_email: orderUserEmail(order, usersById, "buyer_id"),
      seller_email: orderUserEmail(order, usersById, "seller_id"),
      listing_title: listing?.title || order.item_title || null,
    }
  })

  const featuredListings = listingsRaw.filter(isFeaturedListing).length
  const paymentSettings = normalisePaymentSettings(paymentSettingsRaw[0] || DEFAULT_PAYMENT_SETTINGS)
  const sellerPlans = sellerPlansRaw.length ? sellerPlansRaw.map((plan) => normaliseSellerPlan(plan)) : SELLER_PLANS
  const stats: AdminStat[] = [
    { label: "Listings", value: listingsTotal, hint: "All marketplace listings", href: "/admin?tab=listings" },
    { label: "Live", value: liveListings, hint: "Visible to buyers", href: "/admin?tab=listings&status=live" },
    { label: "Featured", value: featuredListings, hint: "Homepage priority", href: "/admin?tab=listings&featured=true" },
    { label: "Users", value: usersTotal, hint: "Profiles created", href: "/admin?tab=users" },
    { label: "Verified", value: verifiedUsers, hint: "Trusted users", href: "/admin?tab=users&verified=true" },
    { label: "Orders", value: ordersTotal, hint: "Checkout records", href: "/admin?tab=orders" },
  ]

  const adminName =
    context.profile.full_name ||
    context.profile.name ||
    context.profile.business ||
    context.email ||
    "Admin"

  return (
    <AdminDashboard
      adminEmail={context.email}
      adminId={context.userId}
      adminName={adminName}
      adminRole={context.profile.role || "admin"}
      selectedTab={selectedTab}
      stats={stats}
      listings={listings}
      users={users}
      orders={orders}
      verifications={verificationsRaw}
      settings={settingDefaults(settingsRaw)}
      paymentSettings={paymentSettings}
      sellerPlans={sellerPlans}
      auditLogs={auditLogsRaw}
      setupWarnings={setupWarnings}
      listingFeatureControlsReady={listingFeatureControlsReady}
      listingUrgentControlsReady={listingUrgentControlsReady}
      filters={{
        status: statusFilter,
        featured: featuredFilter,
        verified: verifiedFilter,
        user: userFilter,
      }}
    />
  )
}
