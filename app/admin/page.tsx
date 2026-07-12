import AdminDashboard, {
  type AdminAuditLog,
  type AdminBlogPost,
  type AdminFoundingMember,
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

const ADMIN_TABS = ["overview", "listings", "users", "orders", "blog", "verification", "settings", "audit"] as const

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

  // Pre-fetch test user IDs so every subsequent query can exclude them.
  // Done before the main Promise.all because the other queries depend on these IDs.
  const { data: testProfilesData } = await admin.from("profiles").select("id").eq("is_test", true)
  const testUserIds: string[] = (testProfilesData || []).map((p: any) => p.id as string)
  // PostgREST OR-filter string fragments for nullable FK columns.
  // Pattern: keep row when column IS NULL (not a user row) OR column NOT IN testIds.
  const tf = testUserIds.length > 0 ? testUserIds.join(",") : null
  const listingUserFilter  = tf ? `user_id.is.null,user_id.not.in.(${tf})` : null
  const orderBuyerFilter   = tf ? `buyer_id.is.null,buyer_id.not.in.(${tf})` : null
  const orderSellerFilter  = tf ? `seller_id.is.null,seller_id.not.in.(${tf})` : null
  const msgSenderFilter    = tf ? `sender_id.is.null,sender_id.not.in.(${tf})` : null
  const msgRecipFilter     = tf ? `recipient_id.is.null,recipient_id.not.in.(${tf})` : null

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
    messagesTotal,
    specReportsTotal,
    trustReportsTotal,
    blogPostsTotal,
    blogPostsRaw,
    foundingCounterRaw,
    foundingMembersRaw,
  ] = await Promise.all([
    safeCount(
      listingUserFilter
        ? admin.from("listings").select("*", { count: "exact", head: true }).or(listingUserFilter)
        : admin.from("listings").select("*", { count: "exact", head: true }),
      "listings"
    ),
    safeCount(
      listingUserFilter
        ? admin.from("listings").select("*", { count: "exact", head: true }).eq("status", "live").or(listingUserFilter)
        : admin.from("listings").select("*", { count: "exact", head: true }).eq("status", "live"),
      "live listings"
    ),
    safeCount(
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("is_test", false),
      "users"
    ),
    safeCount(
      admin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_test", false)
        .or("verified.eq.true,email_verified.eq.true,is_email_verified.eq.true,verified_user_badge.eq.true"),
      "verified users"
    ),
    safeCount(
      orderBuyerFilter
        ? admin.from("orders").select("*", { count: "exact", head: true }).or(orderBuyerFilter).or(orderSellerFilter!)
        : admin.from("orders").select("*", { count: "exact", head: true }),
      "orders"
    ),
    safeData<AdminListing>(
      listingUserFilter
        ? (admin.from("listings").select("*").or(listingUserFilter).order("created_at", { ascending: false }).limit(80) as any)
        : (admin.from("listings").select("*").order("created_at", { ascending: false }).limit(80) as any),
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
      orderBuyerFilter
        ? (admin.from("orders").select("*").or(orderBuyerFilter).or(orderSellerFilter!).order("created_at", { ascending: false }).limit(80) as any)
        : (admin.from("orders").select("*").order("created_at", { ascending: false }).limit(80) as any),
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
    safeCount(
      msgSenderFilter
        ? admin.from("messages").select("*", { count: "exact", head: true }).or(msgSenderFilter).or(msgRecipFilter!)
        : admin.from("messages").select("*", { count: "exact", head: true }),
      "messages"
    ),
    safeCount(admin.from("equipment_spec_reports" as any).select("*", { count: "exact", head: true }), "equipment spec reports"),
    safeCount(admin.from("trust_moderation_flags" as any).select("*", { count: "exact", head: true }), "trust reports"),
    safeCount(admin.from("blog_posts" as any).select("*", { count: "exact", head: true }), "blog posts"),
    safeData<AdminBlogPost>(
      admin
        .from("blog_posts" as any)
        .select("id,title,slug,category,status,created_at,updated_at,published_at")
        .order("created_at", { ascending: false })
        .limit(80),
      "blog posts"
    ),
    safeData<{ cap: number; sold: number }>(
      admin.from("founding_member_counter" as never).select("cap,sold").limit(1) as any,
      "founding member counter"
    ),
    safeData<AdminFoundingMember>(
      admin
        .from("seller_listing_entitlements")
        .select("id,seller_id,stripe_session_id,created_at")
        .eq("plan_name", "Founding Trade Member")
        .eq("active", true)
        .order("created_at", { ascending: true }),
      "founding members"
    ),
  ])

  const usersById = new Map(usersRaw.map((user) => [user.id, user]))
  const listingsById = new Map(listingsRaw.map((listing) => [listing.id, listing]))
  const foundingCounter = foundingCounterRaw[0] || { cap: 100, sold: 0 }
  const foundingMembers: AdminFoundingMember[] = foundingMembersRaw.map((member) => ({
    ...member,
    email: usersById.get(String((member as any).seller_id || ""))?.email || null,
  }))
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
  const reportsTotal = specReportsTotal + trustReportsTotal
  const marketplaceLive = process.env.NEXT_PUBLIC_MARKETPLACE_LIVE === "true"
  const paymentSettings = normalisePaymentSettings(paymentSettingsRaw[0] || DEFAULT_PAYMENT_SETTINGS)
  const sellerPlans = sellerPlansRaw.length ? sellerPlansRaw.map((plan) => normaliseSellerPlan(plan)) : SELLER_PLANS
  const stats: AdminStat[] = [
    { label: "Listings", value: listingsTotal, hint: "All marketplace listings", href: "/admin?tab=listings" },
    { label: "Live", value: liveListings, hint: "Visible to buyers", href: "/admin?tab=listings&status=live" },
    { label: "Pending", value: listingsRaw.filter((listing) => ["pending", "draft"].includes(String(listing.status || "").toLowerCase())).length, hint: "Draft or pending review", href: "/admin?tab=listings&status=pending" },
    { label: "Featured", value: featuredListings, hint: "Homepage priority", href: "/admin?tab=listings&featured=true" },
    { label: "Users", value: usersTotal, hint: "Profiles created", href: "/admin?tab=users" },
    { label: "Verified", value: verifiedUsers, hint: "Trusted users", href: "/admin?tab=users&verified=true" },
    { label: "Orders", value: ordersTotal, hint: "Checkout records", href: "/admin?tab=orders" },
    { label: "Messages", value: messagesTotal, hint: "Internal messages", href: "/messages" },
    { label: "Reports", value: reportsTotal, hint: "Spec and trust reports", href: "/admin/trust" },
    { label: "Blog Posts", value: blogPostsTotal, hint: "Published and draft posts", href: "/admin?tab=blog" },
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
      blogPosts={blogPostsRaw}
      verifications={verificationsRaw}
      settings={settingDefaults(settingsRaw)}
      paymentSettings={paymentSettings}
      sellerPlans={sellerPlans}
      auditLogs={auditLogsRaw}
      foundingMemberSold={foundingCounter.sold}
      foundingMemberCap={foundingCounter.cap}
      foundingMembers={foundingMembers}
      messagesTotal={messagesTotal}
      reportsTotal={reportsTotal}
      marketplaceLive={marketplaceLive}
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
