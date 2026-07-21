"use client"

import Link from "next/link"
import SiteLogo from "@/components/SiteLogo"
import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react"
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  Flag,
  FlaskConical,
  Globe2,
  Eye,
  EyeOff,
  LayoutDashboard,
  ListChecks,
  MailCheck,
  Menu,
  MessageSquare,
  PauseCircle,
  Pencil,
  PhoneCall,
  PieChart,
  Plus,
  PoundSterling,
  Power,
  Save,
  Search,
  Sparkles,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Trash2,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react"
import {
  adminSaveListingEdits,
  createBlogPost,
  deleteBlogPost,
  updateBlogPost,
  setPhoneVerificationStatus,
  setUserTestFlag,
  setUserVerificationFlag,
  setUserVerified,
  toggleListingFeatured,
  toggleListingUrgent,
  updateListingStatus,
  updatePaymentSettings,
  updateSellerPlan,
  updateSiteSetting,
  updateUserRole,
} from "./actions"
import { type PaymentSettings, type SellerPlan, formatPlanPrice, paymentStatusLabel } from "@/lib/pricing"
import { CONDITION_OPTIONS, DELIVERY_OPTION_OPTIONS, POWER_TYPE_OPTIONS, TESTED_STATUS_OPTIONS, WARRANTY_TYPE_OPTIONS } from "@/lib/listing-trust"
import { MARKETPLACE_CATEGORY_TITLES, categoryByTitle, subcategoriesForCategory } from "@/lib/categories"

export type AdminTab = "overview" | "listings" | "users" | "orders" | "blog" | "verification" | "settings" | "audit"

export type AdminStat = {
  label: string
  value: number
  hint: string
  href: string
}

export type AdminListing = {
  id: string
  seller_id?: string | null
  user_id?: string | null
  title?: string | null
  price?: string | number | null
  location?: string | null
  city?: string | null
  status?: string | null
  category?: string | null
  subcategory?: string | null
  equipment_type?: string | null
  image_url?: string | null
  images?: string[] | null
  featured?: boolean | null
  is_featured?: boolean | null
  featured_type?: string | null
  urgent?: boolean | null
  is_urgent?: boolean | null
  created_at?: string | null
  seller_email?: string | null
  condition?: string | null
  power_type?: string | null
  dimensions?: string | null
  service_history?: string | null
  warranty_type?: string | null
  manuals_available?: boolean | null
  tested_status?: string | null
  delivery_option?: string | null
  collection_postcode?: string | null
  vat_included?: boolean | null
  weight_kg?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  pallet_ready?: boolean | null
  tail_lift_required?: boolean | null
  forklift_available?: boolean | null
  ground_floor_collection?: boolean | null
  commercial_premises?: boolean | null
  delivery_available?: boolean | null
  caterbids_delivery_available?: boolean | null
  description?: string | null
}

export type AdminUser = {
  id: string
  email?: string | null
  name?: string | null
  full_name?: string | null
  business?: string | null
  phone?: string | null
  phone_number?: string | null
  role?: string | null
  verified?: boolean | null
  email_verified?: boolean | null
  is_email_verified?: boolean | null
  phone_verified?: boolean | null
  is_phone_verified?: boolean | null
  phone_verified_at?: string | null
  phone_verification_method?: string | null
  phone_verification_status?: string | null
  verified_user_badge?: boolean | null
  verified_dealer?: boolean | null
  is_test?: boolean | null
  created_at?: string | null
  active_listings_count?: number
}

export type AdminOrder = {
  id: string
  listing_id?: string | null
  listing_title?: string | null
  buyer_id?: string | null
  buyer_email?: string | null
  seller_id?: string | null
  seller_email?: string | null
  item_title?: string | null
  item_price?: number | string | null
  delivery_price?: number | string | null
  total_price?: number | string | null
  payment_status?: string | null
  order_status?: string | null
  delivery_status?: string | null
  stripe_session_id?: string | null
  stripe_payment_intent_id?: string | null
  created_at?: string | null
}

export type AdminVerification = {
  id?: string | null
  user_id?: string | null
  email_verified?: boolean | null
  phone?: string | null
  phone_verified?: boolean | null
  phone_verified_at?: string | null
  id_verification_status?: string | null
  business_verification_status?: string | null
  updated_at?: string | null
  created_at?: string | null
}

export type AdminSiteSetting = {
  key: string
  value: { text?: string; value?: string | number | boolean | null; type?: string } | string | number | boolean | null
  description?: string | null
  updated_at?: string | null
}

export type AdminPaymentSettings = PaymentSettings
export type AdminSellerPlan = SellerPlan

export type AdminFoundingMember = {
  id: string
  seller_id?: string | null
  stripe_session_id?: string | null
  created_at?: string | null
  email?: string | null
}

export type AdminAuditLog = {
  id: string
  admin_user_id?: string | null
  admin_id?: string | null
  admin_email?: string | null
  action?: string | null
  entity_type?: string | null
  entity_id?: string | null
  target_table?: string | null
  target_id?: string | null
  metadata?: Record<string, unknown> | null
  details?: Record<string, unknown> | null
  created_at?: string | null
}

export type AdminBlogPost = {
  id: string
  title?: string | null
  slug?: string | null
  category?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
  published_at?: string | null
  meta_title?: string | null
  meta_description?: string | null
  target_keywords?: string[] | null
  article_markdown?: string | null
}

type AdminDashboardProps = {
  adminEmail: string
  adminId: string
  adminName: string
  adminRole: string
  selectedTab: AdminTab
  stats: AdminStat[]
  listings: AdminListing[]
  users: AdminUser[]
  orders: AdminOrder[]
  blogPosts: AdminBlogPost[]
  verifications: AdminVerification[]
  settings: AdminSiteSetting[]
  paymentSettings: AdminPaymentSettings
  sellerPlans: AdminSellerPlan[]
  auditLogs: AdminAuditLog[]
  foundingMemberSold: number
  foundingMemberCap: number
  foundingMembers: AdminFoundingMember[]
  messagesTotal: number
  reportsTotal: number
  marketplaceLive: boolean
  setupWarnings: string[]
  listingFeatureControlsReady: boolean
  listingUrgentControlsReady: boolean
  filters: {
    status: string
    featured: boolean
    verified: boolean
    user: string
  }
}

const USER_ROLES = ["user", "seller", "dealer", "admin", "super_admin"]
const PROTECTED_SUPER_ADMIN_EMAIL = "caterbidsuk@gmail.com"
const ADMIN_ACTION_BUTTON =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-sm font-black text-white transition hover:border-[#FF6B00]/45 hover:bg-[#FF6B00]/12"
const ADMIN_ACTION_LINK = ADMIN_ACTION_BUTTON

const TABS: { key: AdminTab; label: string; href: string; icon: ReactNode }[] = [
  { key: "overview", label: "Overview", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "listings", label: "Listings", href: "/admin?tab=listings", icon: <ListChecks className="h-4 w-4" /> },
  { key: "users", label: "Users", href: "/admin?tab=users", icon: <Users className="h-4 w-4" /> },
  { key: "orders", label: "Orders", href: "/admin?tab=orders", icon: <ShoppingCart className="h-4 w-4" /> },
  { key: "blog", label: "Blog", href: "/admin?tab=blog", icon: <FileText className="h-4 w-4" /> },
  { key: "verification", label: "Verification", href: "/admin?tab=verification", icon: <BadgeCheck className="h-4 w-4" /> },
  { key: "settings", label: "Site Settings", href: "/admin?tab=settings", icon: <Settings className="h-4 w-4" /> },
  { key: "audit", label: "Audit Log", href: "/admin?tab=audit", icon: <ShieldCheck className="h-4 w-4" /> },
]

const SETTING_CONFIG: Record<
  string,
  {
    title: string
    inputLabel: string
    placeholder: string
    notePlaceholder: string
    valueType: "text" | "number" | "boolean"
    connected?: boolean
  }
> = {
  homepage_notice: {
    title: "Homepage Notice",
    inputLabel: "Homepage banner text",
    placeholder: "First 100 listings are FREE on CaterBidsUK",
    notePlaceholder: "Internal note only, not shown publicly",
    valueType: "text",
    connected: false,
  },
  support_email: {
    title: "Support Email",
    inputLabel: "Public support email",
    placeholder: "caterbidsuk@gmail.com",
    notePlaceholder: "Main email customers use for help",
    valueType: "text",
    connected: false,
  },
  launch_offer: {
    title: "Launch Offer",
    inputLabel: "Launch offer text",
    placeholder: "First 100 listings free",
    notePlaceholder: "Current seller signup offer",
    valueType: "text",
    connected: false,
  },
  maintenance_mode: {
    title: "Maintenance Mode",
    inputLabel: "Maintenance mode",
    placeholder: "Off",
    notePlaceholder: "Temporarily hide public selling/listing actions while testing",
    valueType: "boolean",
    connected: false,
  },
}

function formatDate(value?: string | null) {
  if (!value) return "Not available"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not available"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(date)
}

function formatMoney(value?: string | number | null) {
  const numberValue = Number(String(value ?? "").replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(numberValue) || numberValue <= 0) return "No price"
  return `£${numberValue.toLocaleString("en-GB")}`
}

function settingText(value: AdminSiteSetting["value"]) {
  if (value === null || typeof value === "undefined") return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  return String(value.text ?? value.value ?? "")
}

function listingLocation(listing: AdminListing) {
  return listing.city || listing.location || "UK"
}

function listingImage(listing: AdminListing) {
  if (listing.image_url) return listing.image_url
  const images = Array.isArray(listing.images) ? listing.images : []
  return images.find((image) => typeof image === "string" && image.trim()) || ""
}

function userName(user: AdminUser) {
  return user.full_name || user.name || user.business || user.email || "User"
}

function isUserVerified(user: AdminUser) {
  return Boolean(user.verified || user.email_verified || user.is_email_verified || user.verified_user_badge)
}

function isProtectedSuperAdmin(user: AdminUser, adminEmail: string, adminId: string) {
  return adminEmail.toLowerCase() === PROTECTED_SUPER_ADMIN_EMAIL && user.id === adminId
}

function numberFromPrice(value?: string | number | null) {
  const numberValue = Number(String(value ?? "").replace(/[^0-9.]/g, ""))
  return Number.isFinite(numberValue) ? numberValue : 0
}

function statValue(stats: AdminStat[], label: string) {
  return stats.find((stat) => stat.label.toLowerCase() === label.toLowerCase())?.value || 0
}

function statusCount(listings: AdminListing[], status: string) {
  return listings.filter((listing) => String(listing.status || "").toLowerCase() === status).length
}

function paidOrders(orders: AdminOrder[]) {
  return orders.filter((order) =>
    ["paid", "succeeded", "complete", "completed"].includes(String(order.payment_status || order.order_status || "").toLowerCase())
  )
}

function orderRevenue(orders: AdminOrder[]) {
  return paidOrders(orders).reduce((total, order) => total + numberFromPrice(order.total_price), 0)
}

function formatMetricMoney(value: number) {
  if (!value) return "£0"
  return `£${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`
}

function lastSevenDays() {
  const today = new Date()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return date
  })
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

function listingTrend(listings: AdminListing[]) {
  const days = lastSevenDays()
  return days.map((day) => {
    const newCount = listings.filter((listing) => listing.created_at && sameDay(new Date(listing.created_at), day)).length
    const activeCount = listings.filter((listing) => {
      const created = listing.created_at ? new Date(listing.created_at) : null
      const status = String(listing.status || "").toLowerCase()
      return created && created <= day && ["live", "active", "payment_pending"].includes(status)
    }).length

    return {
      label: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(day),
      newCount,
      activeCount,
    }
  })
}

function categoryBreakdown(listings: AdminListing[]) {
  const counts = new Map<string, number>()
  for (const listing of listings) {
    const category = listing.category || "Uncategorised"
    counts.set(category, (counts.get(category) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
}

export default function AdminDashboard({
  adminEmail,
  adminId,
  adminName,
  adminRole,
  selectedTab,
  stats,
  listings,
  users,
  orders,
  blogPosts,
  verifications,
  settings,
  paymentSettings,
  sellerPlans,
  auditLogs,
  foundingMemberSold,
  foundingMemberCap,
  foundingMembers,
  messagesTotal,
  reportsTotal,
  marketplaceLive,
  setupWarnings,
  listingFeatureControlsReady,
  listingUrgentControlsReady,
  filters,
}: AdminDashboardProps) {
  const totalListings = statValue(stats, "Listings")
  const liveListings = statValue(stats, "Live")
  const totalUsers = statValue(stats, "Users")
  const totalOrders = statValue(stats, "Orders")
  const paidRevenue = orderRevenue(orders)
  const trend = listingTrend(listings)
  const categories = categoryBreakdown(listings)
  const pendingListings = statusCount(listings, "pending") + statusCount(listings, "draft")
  const completedOrders = orders.filter((order) => String(order.order_status || "").toLowerCase() === "paid").length
  const pendingOrders = orders.filter((order) => /pending/i.test(String(order.order_status || order.payment_status || ""))).length

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#083D70_0,#001A35_38%,#000D1F_100%)] text-white">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#001A35]/90 p-5 lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link href="/admin">
              <SiteLogo size="sm" />
            </Link>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-white/45">Admin</p>
            <nav className="mt-3 space-y-1">
              {TABS.map((tab) => (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                    selectedTab === tab.key
                      ? "bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/20"
                      : "text-white/72 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {tab.icon}
                  {tab.label === "Overview" ? "Dashboard" : tab.label}
                </Link>
              ))}
              <Link href="/admin/trust" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-white/72 hover:bg-white/8 hover:text-white">
                <ShieldCheck className="h-4 w-4" />
                Trust Admin
              </Link>
              <Link href="/admin/caterbot-review" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-white/72 hover:bg-white/8 hover:text-white">
                <Bot className="h-4 w-4" />
                CaterBot Review
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <p className="font-black">Need help?</p>
              <p className="mt-1 text-sm leading-relaxed text-white/55">Visit support if admin help centre content is needed.</p>
              <Link href="/contact" className="mt-3 inline-flex rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-white">
                Contact Support
              </Link>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <p className="truncate font-black">{adminName}</p>
              <p className="mt-1 truncate text-sm text-white/55">{adminEmail}</p>
              <p className="mt-2 inline-flex rounded-full bg-[#FF6B00]/15 px-3 py-1 text-xs font-black capitalize text-orange-100">
                {adminRole === "super_admin" ? "Super Administrator" : adminRole}
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 pb-24 lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#001A35]/92 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex items-center gap-3">
              <button className="grid h-11 w-11 place-items-center rounded-2xl border border-white/12 bg-white/8 lg:hidden" aria-label="Open admin menu">
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/admin" className="lg:hidden">
                <SiteLogo size="sm" />
              </Link>
              <form action="/admin" className="ml-auto hidden max-w-xl flex-1 lg:block">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/45" />
                  <input
                    name="q"
                    placeholder="Search listings, users, orders..."
                    className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-12 py-3 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-[#FF6B00]/60"
                  />
                </label>
              </form>
              <div className="ml-auto flex items-center gap-2 lg:ml-4">
                <span className="hidden rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-black text-white/80 lg:inline-flex">
                  Last 7 days
                </span>
                <span className="relative grid h-11 w-11 place-items-center rounded-2xl border border-white/12 bg-white/[0.06]">
                  <Bell className="h-5 w-5" />
                </span>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-8">
            <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-[-0.04em] md:text-4xl">
                  {selectedTab === "overview" ? "Dashboard" : TABS.find((tab) => tab.key === selectedTab)?.label || "Dashboard"}
                </h1>
                <p className="mt-1 text-sm font-semibold text-white/60">Overview of your marketplace.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/admin?tab=listings" className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-black text-white/80">
                  Listings
                </Link>
                <Link href="/admin?tab=verification" className="rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/20">
                  Verifications
                </Link>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AdminMetricCard label="Total Listings" value={totalListings.toLocaleString("en-GB")} icon={<ListChecks className="h-5 w-5" />} tone="blue" helper="Current total" href="/admin?tab=listings" />
              <AdminMetricCard label="Total Users" value={totalUsers.toLocaleString("en-GB")} icon={<Users className="h-5 w-5" />} tone="green" helper="Profiles created" href="/admin?tab=users" />
              <AdminMetricCard label="Total Orders" value={totalOrders.toLocaleString("en-GB")} icon={<ShoppingCart className="h-5 w-5" />} tone="orange" helper="Checkout records" href="/admin?tab=orders" />
              <AdminMetricCard label="Paid Revenue" value={formatMetricMoney(paidRevenue)} icon={<PoundSterling className="h-5 w-5" />} tone="purple" helper="Paid loaded orders" href="/admin?tab=orders" />
              <AdminMetricCard label="Active Listings" value={liveListings.toLocaleString("en-GB")} icon={<BadgeCheck className="h-5 w-5" />} tone="cyan" helper="Visible to buyers" href="/admin?tab=listings&status=live" />
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AdminControlCard label="Pending Listings" value={pendingListings.toLocaleString("en-GB")} helper="Draft or pending review" icon={<ClipboardList className="h-5 w-5" />} href="/admin?tab=listings&status=pending" />
              <AdminControlCard label="Messages" value={messagesTotal.toLocaleString("en-GB")} helper="Internal message rows" icon={<MessageSquare className="h-5 w-5" />} href="/messages" />
              <AdminControlCard label="Reported Items" value={reportsTotal.toLocaleString("en-GB")} helper="Spec/trust reports loaded" icon={<Flag className="h-5 w-5" />} href="/admin/trust" />
              <AdminControlCard label="Blog Posts" value={blogPosts.length.toLocaleString("en-GB")} helper="Published and draft posts" icon={<FileText className="h-5 w-5" />} href="/admin?tab=blog" />
              <AdminControlCard label="Marketplace" value={marketplaceLive ? "Live" : "Hidden"} helper={marketplaceLive ? "Public browsing enabled" : "Private setup mode"} icon={<Globe2 className="h-5 w-5" />} href="/marketplace" />
            </section>

        {setupWarnings.length > 0 && (
          <section className="rounded-3xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm font-bold text-amber-50">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFB15A]">Admin setup needed</p>
            <div className="mt-2 space-y-2">
              {setupWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/65">
              Run the featured-listing SQL migration in Supabase to enable Feature and Urgent buttons.
            </p>
          </section>
        )}

        {filters.status || filters.featured || filters.verified || filters.user ? (
          <div className="rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-4 py-3 text-sm font-bold text-orange-100">
            Filter active: {filters.status && `status ${filters.status} `}
            {filters.featured && "featured "}
            {filters.verified && "verified users "}
            {filters.user && `user ${filters.user}`}
            <Link href="/admin" className="ml-3 underline">Clear</Link>
          </div>
        ) : null}

        {selectedTab === "overview" && (
          <>
            <section className="grid gap-5 xl:grid-cols-[1.2fr_0.95fr]">
              <ListingTrendChart data={trend} />
              <CategoryBreakdownPanel categories={categories} total={listings.length} />
            </section>
            <section className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
              <RecentListingsTable listings={listings.slice(0, 6)} />
              <RecentUsersList users={users.slice(0, 6)} />
            </section>
            <section className="grid gap-5 xl:grid-cols-3">
              <AdminSummaryPanel title="Orders Overview" icon={<ShoppingCart className="h-5 w-5" />} rows={[
                ["Total Orders", totalOrders.toLocaleString("en-GB")],
                ["Completed", completedOrders.toLocaleString("en-GB")],
                ["Pending", pendingOrders.toLocaleString("en-GB")],
              ]} />
              <AdminSummaryPanel title="Revenue Overview" icon={<PoundSterling className="h-5 w-5" />} rows={[
                ["Paid revenue", formatMetricMoney(paidRevenue)],
                ["Source", "Paid orders table"],
                ["Unpaid orders", String(Math.max(orders.length - paidOrders(orders).length, 0))],
              ]} />
              <AdminSummaryPanel title="System Overview" icon={<BarChart3 className="h-5 w-5" />} rows={[
                ["Admin access", "Protected"],
                ["Database", "Connected for loaded panels"],
                ["Pending listings", pendingListings.toLocaleString("en-GB")],
                ["Monitoring", "Not configured"],
              ]} />
            </section>
          </>
        )}

        {selectedTab === "listings" && (
          <ListingsPanel
            listings={listings}
            title="Listings"
            listingFeatureControlsReady={listingFeatureControlsReady}
            listingUrgentControlsReady={listingUrgentControlsReady}
          />
        )}
        {selectedTab === "users" && <UsersPanel users={users} adminEmail={adminEmail} adminId={adminId} />}
        {selectedTab === "orders" && <OrdersPanel orders={orders} />}
        {selectedTab === "blog" && <BlogPostsPanel posts={blogPosts} />}
        {selectedTab === "verification" && (
          <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <UsersPanel users={users} adminEmail={adminEmail} adminId={adminId} compact />
            <VerificationPanel verifications={verifications} users={users} />
          </section>
        )}
        {selectedTab === "settings" && (
          <section className="grid gap-5">
            <FoundingMembersPanel sold={foundingMemberSold} cap={foundingMemberCap} members={foundingMembers} />
            <PaymentSettingsPanel settings={paymentSettings} sellerPlans={sellerPlans} adminRole={adminRole} adminEmail={adminEmail} />
            <SettingsPanel settings={settings} />
          </section>
        )}
        {selectedTab === "audit" && <AuditPanel auditLogs={auditLogs} />}

        {selectedTab === "overview" && (
          <section className="grid gap-5 xl:grid-cols-2">
            <PaymentStatusPanel settings={paymentSettings} sellerPlans={sellerPlans} />
            <AuditPanel auditLogs={auditLogs.slice(0, 8)} compact />
          </section>
        )}

            <footer className="flex flex-wrap gap-3 pb-6 text-sm font-black text-white/70">
              <Link href="/admin/trust" className="rounded-2xl border border-white/10 bg-white/8 px-4 py-2">Trust admin</Link>
              <Link href="/account" className="rounded-2xl border border-white/10 bg-white/8 px-4 py-2">Account</Link>
              <Link href="/" className="rounded-2xl border border-white/10 bg-white/8 px-4 py-2">Home</Link>
            </footer>
          </div>
          <MobileAdminNav selectedTab={selectedTab} />
        </div>
      </div>
    </main>
  )
}

function AdminMetricCard({
  label,
  value,
  icon,
  tone,
  helper,
  href,
}: {
  label: string
  value: string
  icon: ReactNode
  tone: "blue" | "green" | "orange" | "purple" | "cyan"
  helper: string
  href: string
}) {
  const tones = {
    blue: "from-blue-500/20 to-blue-500/5 text-blue-100",
    green: "from-emerald-500/20 to-emerald-500/5 text-emerald-100",
    orange: "from-[#FF6B00]/25 to-[#FF6B00]/5 text-orange-100",
    purple: "from-violet-500/20 to-violet-500/5 text-violet-100",
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-100",
  }

  return (
    <Link href={href} className="rounded-3xl border border-white/10 bg-[#062747]/85 p-4 shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:border-[#FF6B00]/45">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${tones[tone]}`}>
          {icon}
        </span>
        <span className="text-xs font-black text-emerald-200">Current</span>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-white/45">{helper}</p>
    </Link>
  )
}

function AdminControlCard({
  label,
  value,
  helper,
  icon,
  href,
}: {
  label: string
  value: string
  helper: string
  icon: ReactNode
  href: string
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-white/10 bg-[#082D50]/70 p-4 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:border-[#FF6B00]/45"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FF6B00]/18 text-orange-100">
          {icon}
        </span>
        <ChevronAccent />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-white/45">{helper}</p>
    </Link>
  )
}

function ChevronAccent() {
  return <span className="text-lg font-black text-[#FF6B00]">›</span>
}

function ListingTrendChart({ data }: { data: Array<{ label: string; newCount: number; activeCount: number }> }) {
  const maxValue = Math.max(1, ...data.map((item) => Math.max(item.newCount, item.activeCount)))

  return (
    <Panel title="Listings Overview" icon={<BarChart3 className="h-5 w-5" />}>
      {data.every((item) => item.newCount === 0 && item.activeCount === 0) ? (
        <EmptyState text="Listing trend data is not available yet." />
      ) : (
        <div className="space-y-4">
          <div className="flex h-64 items-end gap-3 rounded-3xl border border-white/10 bg-[#001A35]/55 p-4">
            {data.map((item) => (
              <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end justify-center gap-1">
                  <span
                    className="w-3 rounded-t-full bg-[#FF6B00]"
                    style={{ height: `${Math.max(4, (item.newCount / maxValue) * 100)}%` }}
                    title={`${item.newCount} new listings`}
                  />
                  <span
                    className="w-3 rounded-t-full bg-blue-400"
                    style={{ height: `${Math.max(4, (item.activeCount / maxValue) * 100)}%` }}
                    title={`${item.activeCount} active listings`}
                  />
                </div>
                <span className="truncate text-[10px] font-bold text-white/45">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-black text-white/65">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#FF6B00]" /> New listings</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-400" /> Active listings</span>
          </div>
        </div>
      )}
    </Panel>
  )
}

function CategoryBreakdownPanel({ categories, total }: { categories: Array<{ label: string; value: number }>; total: number }) {
  return (
    <Panel title="Listings by Category" icon={<PieChart className="h-5 w-5" />}>
      {categories.length === 0 ? (
        <EmptyState text="No listing category data yet." />
      ) : (
        <div className="space-y-4">
          <div className="mx-auto grid h-40 w-40 place-items-center rounded-full border-[24px] border-[#FF6B00]/80 bg-[#001A35] shadow-inner shadow-black/30">
            <div className="text-center">
              <p className="text-3xl font-black">{total}</p>
              <p className="text-xs font-bold text-white/50">loaded</p>
            </div>
          </div>
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div key={category.label} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-bold text-white/82">{category.label}</p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={index === 0 ? "h-full rounded-full bg-[#FF6B00]" : "h-full rounded-full bg-blue-400"}
                      style={{ width: `${Math.max(6, (category.value / Math.max(total, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="font-black text-white">{category.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

function RecentListingsTable({ listings }: { listings: AdminListing[] }) {
  return (
    <Panel title="Recent Listings" icon={<ClipboardList className="h-5 w-5" />}>
      {listings.length === 0 ? (
        <EmptyState text="No recent listings found." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10">
          {listings.map((listing) => (
            <Link key={listing.id} href={`/listing?id=${encodeURIComponent(listing.id)}`} className="grid gap-3 border-b border-white/10 bg-[#062747]/60 p-3 last:border-b-0 sm:grid-cols-[64px_1fr_auto] sm:items-center">
              <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white/8">
                {listingImage(listing) ? <img src={listingImage(listing)} alt={listing.title || "Listing"} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <p className="truncate font-black">{listing.title || "Untitled listing"}</p>
                <p className="mt-1 text-xs font-semibold text-white/50">{listing.category || "No category"} • {listing.seller_email || "Seller"}</p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <span className="font-black text-[#FF9A4A]">{formatMoney(listing.price)}</span>
                <Badge label={listing.status || "status"} orange={String(listing.status || "").toLowerCase() === "live"} />
              </div>
            </Link>
          ))}
          <Link href="/admin?tab=listings" className="block bg-white/[0.04] px-4 py-3 text-center text-sm font-black text-white">
            View all listings
          </Link>
        </div>
      )}
    </Panel>
  )
}

function RecentUsersList({ users }: { users: AdminUser[] }) {
  return (
    <Panel title="Recent Users" icon={<Users className="h-5 w-5" />}>
      {users.length === 0 ? (
        <EmptyState text="No recent users found." />
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Link key={user.id} href={`/admin?tab=users#user-${user.id}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#062747]/60 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FF6B00]/20 text-sm font-black text-orange-100">
                {userName(user).slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-white">{userName(user)}</span>
                <span className="block truncate text-xs font-semibold text-white/45">{user.email || "No email"}</span>
              </span>
              <span className="text-xs font-bold text-white/45">{formatDate(user.created_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  )
}

function AdminSummaryPanel({ title, icon, rows }: { title: string; icon: ReactNode; rows: Array<[string, string]> }) {
  return (
    <Panel title={title} icon={icon}>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#062747]/60 px-4 py-3">
            <span className="text-sm font-semibold text-white/55">{label}</span>
            <span className="font-black text-white">{value}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function MobileAdminNav({ selectedTab }: { selectedTab: AdminTab }) {
  const items = TABS.slice(0, 4)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#001A35]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((tab) => (
          <Link key={tab.key} href={tab.href} className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black ${selectedTab === tab.key ? "text-[#FF6B00]" : "text-white/58"}`}>
            {tab.icon}
            <span>{tab.label === "Overview" ? "Dashboard" : tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

function ListingsPanel({
  listings,
  title,
  listingFeatureControlsReady,
  listingUrgentControlsReady,
}: {
  listings: AdminListing[]
  title: string
  listingFeatureControlsReady: boolean
  listingUrgentControlsReady: boolean
}) {
  return (
    <Panel title={title} icon={<ClipboardList className="h-5 w-5" />}>
      <div className="space-y-3">
        {listings.length === 0 ? (
          <EmptyState text="No listings found." />
        ) : (
          listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              listingFeatureControlsReady={listingFeatureControlsReady}
              listingUrgentControlsReady={listingUrgentControlsReady}
            />
          ))
        )}
      </div>
    </Panel>
  )
}

function AdminListingEditModal({ listing, onClose }: { listing: AdminListing; onClose: () => void }) {
  const [state, action, pending] = useActionState(adminSaveListingEdits, null)
  const [selectedCategory, setSelectedCategory] = useState(listing.category || "Catering Equipment")
  const [selectedSubcategory, setSelectedSubcategory] = useState(listing.subcategory || "")
  const [selectedEquipmentType, setSelectedEquipmentType] = useState(listing.equipment_type || "")

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(onClose, 800)
      return () => clearTimeout(timer)
    }
  }, [state?.success, onClose])

  const subcategories = subcategoriesForCategory(selectedCategory)
  const level3Options = categoryByTitle(selectedSubcategory)?.subcategories ?? []
  const inp = "w-full rounded-2xl border border-white/10 bg-[#001A35] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#FF6B00]/50 focus:outline-none"
  const lbl = "mb-1 block text-xs font-black uppercase tracking-wide text-white/45"
  const sec = "space-y-3 rounded-3xl border border-white/10 bg-[#002448]/60 p-4"

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-8 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="mb-8 w-full max-w-2xl rounded-3xl border border-white/10 bg-[#001A35] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Edit listing — admin</h2>
            <p className="mt-0.5 text-xs text-white/40">Bypasses owner check · writes audit log</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-2 text-xs font-black text-white/75 transition hover:bg-white/12">
            ✕ Close
          </button>
        </div>

        {state?.error && (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="mb-4 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-300">
            Saved — closing…
          </div>
        )}

        <form action={action} className="space-y-4">
          <input type="hidden" name="listing_id" value={listing.id} />
          <input type="hidden" name="image_url" value={listing.image_url || ""} />
          <input type="hidden" name="images_json" value={listing.images ? JSON.stringify(listing.images) : ""} />

          <div className={sec}>
            <p className="text-xs font-black uppercase tracking-widest text-white/40">Basic info</p>
            <div>
              <label className={lbl}>Title</label>
              <input name="title" defaultValue={listing.title || ""} required className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Price</label>
                <input name="price" defaultValue={String(listing.price || "")} required placeholder="£1500" className={inp} />
              </div>
              <div>
                <label className={lbl}>VAT included?</label>
                <label className="flex h-9 items-center gap-2 text-sm text-white">
                  <input type="checkbox" name="vat_included" defaultChecked={Boolean(listing.vat_included)} className="h-4 w-4 accent-[#FF6B00]" />
                  VAT included
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Location</label>
                <input name="location" defaultValue={listing.location || ""} required className={inp} />
              </div>
              <div>
                <label className={lbl}>City</label>
                <input name="city" defaultValue={listing.city || ""} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Category</label>
                <select name="category" value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubcategory(""); setSelectedEquipmentType("") }} className={inp}>
                  {MARKETPLACE_CATEGORY_TITLES.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Type (Level 2)</label>
                <select
                  name="subcategory"
                  value={selectedSubcategory}
                  onChange={(e) => { setSelectedSubcategory(e.target.value); setSelectedEquipmentType("") }}
                  className={inp}
                >
                  <option value="">— None —</option>
                  {subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {level3Options.length > 0 && (
              <div>
                <label className={lbl}>Subcategory (Level 3)</label>
                <select
                  name="equipment_type"
                  value={selectedEquipmentType}
                  onChange={(e) => setSelectedEquipmentType(e.target.value)}
                  className={inp}
                >
                  <option value="">— None —</option>
                  {level3Options.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className={sec}>
            <p className="text-xs font-black uppercase tracking-widest text-white/40">Item details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Condition</label>
                <select name="condition" defaultValue={listing.condition || "Used"} className={inp}>
                  {CONDITION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Power type</label>
                <select name="power_type" defaultValue={listing.power_type || "Unknown"} className={inp}>
                  {POWER_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Tested status</label>
                <select name="tested_status" defaultValue={listing.tested_status || "Untested"} className={inp}>
                  {TESTED_STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Warranty</label>
                <select name="warranty_type" defaultValue={listing.warranty_type || "No warranty"} className={inp}>
                  {WARRANTY_TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={lbl}>Dimensions (H × W × D)</label>
              <input name="dimensions" defaultValue={listing.dimensions || ""} placeholder="e.g. 90cm × 60cm × 60cm" className={inp} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className={lbl}>Weight kg</label>
                <input name="weight_kg" type="number" step="0.1" min="0" defaultValue={listing.weight_kg ?? ""} className={inp} />
              </div>
              <div>
                <label className={lbl}>Length cm</label>
                <input name="length_cm" type="number" step="1" min="0" defaultValue={listing.length_cm ?? ""} className={inp} />
              </div>
              <div>
                <label className={lbl}>Width cm</label>
                <input name="width_cm" type="number" step="1" min="0" defaultValue={listing.width_cm ?? ""} className={inp} />
              </div>
              <div>
                <label className={lbl}>Height cm</label>
                <input name="height_cm" type="number" step="1" min="0" defaultValue={listing.height_cm ?? ""} className={inp} />
              </div>
            </div>
            <div>
              <label className={lbl}>Service history</label>
              <input name="service_history" defaultValue={listing.service_history || ""} className={inp} />
            </div>
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" name="manuals_available" defaultChecked={Boolean(listing.manuals_available)} className="h-4 w-4 accent-[#FF6B00]" />
              Manuals available
            </label>
          </div>

          <div className={sec}>
            <p className="text-xs font-black uppercase tracking-widest text-white/40">Delivery</p>
            <div>
              <label className={lbl}>Delivery option</label>
              <select name="delivery_option" defaultValue={listing.delivery_option || "Collection Only"} className={inp}>
                {DELIVERY_OPTION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Collection postcode</label>
              <input name="collection_postcode" defaultValue={listing.collection_postcode || ""} placeholder="e.g. M1 1AA" className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-white">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="pallet_ready" defaultChecked={Boolean(listing.pallet_ready)} className="h-4 w-4 accent-[#FF6B00]" />
                Pallet ready
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="tail_lift_required" defaultChecked={Boolean(listing.tail_lift_required)} className="h-4 w-4 accent-[#FF6B00]" />
                Tail lift required
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="forklift_available" defaultChecked={Boolean(listing.forklift_available)} className="h-4 w-4 accent-[#FF6B00]" />
                Forklift available
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="ground_floor_collection" defaultChecked={Boolean(listing.ground_floor_collection)} className="h-4 w-4 accent-[#FF6B00]" />
                Ground floor
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="commercial_premises" defaultChecked={Boolean(listing.commercial_premises)} className="h-4 w-4 accent-[#FF6B00]" />
                Commercial premises
              </label>
            </div>
          </div>

          <div className={sec}>
            <p className="text-xs font-black uppercase tracking-widest text-white/40">Description</p>
            <textarea name="description" rows={8} defaultValue={listing.description || ""} className={`${inp} resize-y`} />
          </div>

          <button
            type="submit"
            disabled={pending || Boolean(state?.success)}
            className="w-full rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white transition hover:bg-[#e55f00] disabled:opacity-55"
          >
            {pending ? "Saving…" : state?.success ? "Saved!" : "Save listing changes"}
          </button>
        </form>
      </div>
    </div>
  )
}

function ListingCard({
  listing,
  listingFeatureControlsReady,
  listingUrgentControlsReady,
}: {
  listing: AdminListing
  listingFeatureControlsReady: boolean
  listingUrgentControlsReady: boolean
}) {
  const [editOpen, setEditOpen] = useState(false)
  const image = listingImage(listing)
  const featured = Boolean(listing.featured || listing.is_featured)
  const urgent = Boolean(listing.urgent || listing.is_urgent || listing.featured_type === "urgent")
  const publicHidden = ["hidden", "paused", "removed", "draft", "expired"].includes(String(listing.status || "").toLowerCase())

  return (
    <article className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
      <div className="grid gap-4 md:grid-cols-[92px_1fr]">
        <div className="h-24 overflow-hidden rounded-2xl border border-white/10 bg-white/8">
          {image ? <img src={image} alt={listing.title || "Listing"} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs font-black text-white/45">No image</div>}
        </div>
        <div className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="truncate text-base font-black">{listing.title || "Untitled listing"}</p>
              <p className="mt-1 text-sm text-white/55">
                {formatMoney(listing.price)} • {listingLocation(listing)} • {formatDate(listing.created_at)}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {listing.category || "No category"} {listing.subcategory ? `• ${listing.subcategory}` : ""} {listing.seller_email ? `• ${listing.seller_email}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge label={listing.status || "no status"} />
                {featured && <Badge label="Featured" orange />}
                {urgent && <Badge label="Urgent" orange />}
                {publicHidden && <Badge label="Hidden from public" />}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[260px]">
              <Link href={`/listing?id=${encodeURIComponent(listing.id)}`} className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-center text-xs font-black">
                View listing
              </Link>
              <button type="button" onClick={() => setEditOpen(true)} className={ADMIN_ACTION_BUTTON}>
                <Pencil className="h-3.5 w-3.5" />
                Edit listing
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <StatusButton listingId={listing.id} status="live" label="Mark live" icon={<CheckCircle2 className="h-4 w-4" />} />
            <StatusButton listingId={listing.id} status="sold" label="Mark sold" icon={<ShoppingCart className="h-4 w-4" />} />
            <StatusButton listingId={listing.id} status="paused" label="Pause" icon={<PauseCircle className="h-4 w-4" />} />
            <StatusButton listingId={listing.id} status="removed" label="Remove" icon={<Trash2 className="h-4 w-4" />} danger />
            <StatusButton listingId={listing.id} status={publicHidden ? "live" : "hidden"} label={publicHidden ? "Show public" : "Hide from public"} icon={publicHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} />
            {listingFeatureControlsReady ? (
              <form action={toggleListingFeatured}>
                <input type="hidden" name="listing_id" value={listing.id} />
                <input type="hidden" name="featured" value={featured ? "false" : "true"} />
                <button className={ADMIN_ACTION_BUTTON}>
                  <Star className="h-4 w-4" />
                  {featured ? "Unfeature" : "Feature"}
                </button>
              </form>
            ) : (
              <button disabled className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-sm font-black text-amber-100/75">
                <Star className="h-4 w-4" />
                Run featured SQL
              </button>
            )}
            {listingUrgentControlsReady ? (
              <form action={toggleListingUrgent}>
                <input type="hidden" name="listing_id" value={listing.id} />
                <input type="hidden" name="urgent" value={urgent ? "false" : "true"} />
                <button className={ADMIN_ACTION_BUTTON}>
                  <Activity className="h-4 w-4" />
                  {urgent ? "Not urgent" : "Urgent"}
                </button>
              </form>
            ) : (
              <button disabled className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-sm font-black text-amber-100/75">
                <Activity className="h-4 w-4" />
                Run urgent SQL
              </button>
            )}
          </div>
        </div>
      </div>
      {editOpen && <AdminListingEditModal listing={listing} onClose={() => setEditOpen(false)} />}
    </article>
  )
}

function StatusButton({ listingId, status, label, icon, danger = false }: { listingId: string; status: string; label: string; icon: ReactNode; danger?: boolean }) {
  return (
    <form action={updateListingStatus}>
      <input type="hidden" name="listing_id" value={listingId} />
      <input type="hidden" name="status" value={status} />
      <button className={`${ADMIN_ACTION_BUTTON} ${danger ? "border-red-300/30 bg-red-500/10 text-red-100" : ""}`}>
        {icon}
        {label}
      </button>
    </form>
  )
}

function UsersPanel({ users, adminEmail, adminId, compact = false }: { users: AdminUser[]; adminEmail: string; adminId: string; compact?: boolean }) {
  return (
    <Panel title={compact ? "Users" : "Users & verification"} icon={<UserCheck className="h-5 w-5" />}>
      <div className="space-y-3">
        {users.length === 0 ? (
          <EmptyState text="No users found." />
        ) : (
          users.map((user) => (
            <UserCard key={user.id} user={user} adminEmail={adminEmail} adminId={adminId} compact={compact} />
          ))
        )}
      </div>
    </Panel>
  )
}

function UserCard({ user, adminEmail, adminId, compact = false }: { user: AdminUser; adminEmail: string; adminId: string; compact?: boolean }) {
  const verified = isUserVerified(user)
  const protectedSuperAdmin = isProtectedSuperAdmin(user, adminEmail, adminId)
  const phoneNumber = user.phone_number || user.phone || "Not added"
  const phoneVerificationStatus =
    user.phone_verified || user.is_phone_verified
      ? "verified"
      : user.phone_verification_status || (user.phone_number || user.phone ? "pending" : "pending")

  return (
    <article id={`user-${user.id}`} className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="truncate font-black">{userName(user)}</p>
          <p className="mt-1 truncate text-sm text-white/55">{user.email || user.id}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge label={user.role || "user"} />
            {verified ? <Badge label="Verified" orange /> : <Badge label="Not verified" />}
            {user.verified_dealer && <Badge label="Verified dealer" orange />}
            {user.email_verified || user.is_email_verified ? <Badge label="Email verified" orange /> : <Badge label="Email pending" />}
            {user.phone_verified || user.is_phone_verified ? <Badge label="Phone verified" orange /> : <Badge label={phoneVerificationStatus === "rejected" ? "Phone rejected" : "Phone pending"} />}
            {user.is_test && (
              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-black text-amber-300">TEST</span>
            )}
            {protectedSuperAdmin && <Badge label="Protected super admin" orange />}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-white/58 md:min-w-[260px]">
          <Info label="Business" value={user.business || "Not added"} />
          <Info label="Phone" value={phoneNumber} />
          <Info label="Created" value={formatDate(user.created_at)} />
          <Info label="Active listings" value={String(user.active_listings_count || 0)} />
          <Info label="User ID" value={user.id.slice(0, 8)} />
        </div>
      </div>

      {!compact && (
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <form action={updateUserRole} className="grid grid-cols-[1fr_auto] gap-2 md:col-span-2 xl:col-span-1">
            <input type="hidden" name="user_id" value={user.id} />
            <select
              name="role"
              defaultValue={user.role || "user"}
              disabled={protectedSuperAdmin}
              className="rounded-2xl border border-white/10 bg-[#001633] px-3 py-2 text-sm font-bold text-white disabled:opacity-45"
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <button disabled={protectedSuperAdmin} className="rounded-2xl bg-[#FF6B00] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">
              Role
            </button>
          </form>
          <MarkTestButton userId={user.id} isTest={Boolean(user.is_test)} />
          <ToggleUserButton userId={user.id} verified={verified} label={verified ? "Mark unverified" : "Mark verified"} />
          <ToggleVerificationButton userId={user.id} field="email_verified" verified={Boolean(user.email_verified || user.is_email_verified)} label={user.email_verified || user.is_email_verified ? "Email unverified" : "Email verified"} icon={<MailCheck className="h-4 w-4" />} />
          <SetPhoneStatusButton userId={user.id} status="verified" label="Mark phone verified" icon={<PhoneCall className="h-4 w-4" />} />
          <SetPhoneStatusButton userId={user.id} status="rejected" label="Mark phone rejected" icon={<PhoneCall className="h-4 w-4" />} />
          <ToggleVerificationButton userId={user.id} field="verified_dealer" verified={Boolean(user.verified_dealer)} label={user.verified_dealer ? "Remove dealer badge" : "Mark verified dealer"} icon={<BadgeCheck className="h-4 w-4" />} />
          <Link href={`/admin?tab=listings&user=${encodeURIComponent(user.id)}`} className={ADMIN_ACTION_LINK}>
            <ListChecks className="h-4 w-4" />
            View user listings
          </Link>
          <MessageUserButton userId={user.id} />
          <details className="md:col-span-2 xl:col-span-3">
            <summary className={`${ADMIN_ACTION_LINK} cursor-pointer list-none`}>
              <UserCog className="h-4 w-4" />
              View user profile/admin details
            </summary>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <Info label="Profile ID" value={user.id} />
              <Info label="Phone" value={phoneNumber} />
              <Info label="Phone status" value={phoneVerificationStatus} />
              <Info label="Email verified" value={user.email_verified || user.is_email_verified ? "Yes" : "No"} />
              <Info label="Phone verified" value={user.phone_verified || user.is_phone_verified ? "Yes" : "No"} />
              <Info label="Verified dealer" value={user.verified_dealer ? "Yes" : "No"} />
              <Info label="Overall verified" value={isUserVerified(user) ? "Yes" : "No"} />
            </div>
          </details>
        </div>
      )}
    </article>
  )
}

function MarkTestButton({ userId, isTest }: { userId: string; isTest: boolean }) {
  return (
    <form action={setUserTestFlag}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="is_test" value={isTest ? "false" : "true"} />
      <button className={ADMIN_ACTION_BUTTON}>
        <FlaskConical className="h-4 w-4" />
        {isTest ? "Unmark test" : "Mark as test"}
      </button>
    </form>
  )
}

function ToggleUserButton({ userId, verified, label }: { userId: string; verified: boolean; label: string }) {
  return (
    <form action={setUserVerified}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="verified" value={verified ? "false" : "true"} />
      <button className={ADMIN_ACTION_BUTTON}>
        <BadgeCheck className="h-4 w-4" />
        {label}
      </button>
    </form>
  )
}

function ToggleVerificationButton({ userId, field, verified, label, icon }: { userId: string; field: string; verified: boolean; label: string; icon: ReactNode }) {
  return (
    <form action={setUserVerificationFlag}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="verified" value={verified ? "false" : "true"} />
      <button className={ADMIN_ACTION_BUTTON}>
        {icon}
        {label}
      </button>
    </form>
  )
}

function MessageUserButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [messageText, setMessageText] = useState("")
  const [withEmail, setWithEmail] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  function reset() {
    setSending(false)
    setSent(false)
    setSendError(null)
    setEmailSent(false)
    setEmailError(null)
    setMessageText("")
    setSubject("")
  }

  async function handleSend() {
    if (!messageText.trim() || sending) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch("/api/admin/message-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: userId,
          subject,
          message: messageText,
          sendEmailFlag: withEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSendError((data as { error?: string }).error ?? "Failed to send.")
        return
      }
      const typed = data as { emailSent?: boolean; emailError?: string | null }
      setEmailSent(Boolean(typed.emailSent))
      setEmailError(typed.emailError ?? null)
      setSent(true)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Network error.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={open ? "md:col-span-2 xl:col-span-3" : ""}>
      {!open ? (
        <button onClick={() => setOpen(true)} className={ADMIN_ACTION_BUTTON}>
          <MessageSquare className="h-4 w-4" />
          Message user
        </button>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#001633] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#FF6B00]" />
              Message user
            </p>
            <button
              onClick={() => { setOpen(false); reset() }}
              className="text-white/40 hover:text-white/70 text-xs font-bold"
            >
              Cancel
            </button>
          </div>

          {sent ? (
            <div className="text-sm font-bold">
              <p className="text-green-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Message saved.
              </p>
              {emailSent && (
                <p className="mt-1 text-white/50 flex items-center gap-1.5">
                  <MailCheck className="h-3.5 w-3.5" />
                  Email also sent.
                </p>
              )}
              {emailError && (
                <p className="mt-1 text-amber-400/80 text-xs">Email failed: {emailError}</p>
              )}
              <button
                onClick={() => { setSent(false); reset() }}
                className="mt-3 text-xs text-white/40 hover:text-white/70 underline"
              >
                Send another
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Subject (optional)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#002E5D] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF6B00]/50"
              />
              <textarea
                placeholder="Message…"
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#002E5D] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF6B00]/50 resize-none"
              />
              <label className="flex items-center gap-2 cursor-pointer text-sm text-white/60">
                <input
                  type="checkbox"
                  checked={withEmail}
                  onChange={(e) => setWithEmail(e.target.checked)}
                  className="accent-[#FF6B00]"
                />
                Also send by email
              </label>
              {sendError && <p className="text-red-400 text-xs">{sendError}</p>}
              <button
                onClick={handleSend}
                disabled={!messageText.trim() || sending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send message"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SetPhoneStatusButton({
  userId,
  status,
  label,
  icon,
}: {
  userId: string
  status: "pending" | "verified" | "rejected"
  label: string
  icon: ReactNode
}) {
  return (
    <form action={setPhoneVerificationStatus}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="status" value={status} />
      <button className={ADMIN_ACTION_BUTTON}>
        {icon}
        {label}
      </button>
    </form>
  )
}

function OrdersPanel({ orders }: { orders: AdminOrder[] }) {
  return (
    <Panel title="Orders" icon={<ShoppingCart className="h-5 w-5" />}>
      <div className="space-y-3">
        {orders.length === 0 ? (
          <EmptyState text="No orders found." />
        ) : (
          orders.map((order) => (
            <article key={order.id} className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-black">{order.listing_title || order.item_title || "Order"}</p>
                  <p className="mt-1 text-sm text-white/55">
                    Total {formatMoney(order.total_price)} • Item {formatMoney(order.item_price)} • Delivery {formatMoney(order.delivery_price)}
                  </p>
                  <p className="mt-1 text-xs text-white/45">Created {formatDate(order.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge label={order.payment_status || "payment unknown"} orange />
                  <Badge label={order.order_status || "order unknown"} />
                  <Badge label={order.delivery_status || "delivery unknown"} />
                </div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <Info label="Buyer" value={order.buyer_email || order.buyer_id || "Unknown"} />
                <Info label="Seller" value={order.seller_email || order.seller_id || "Unknown"} />
                <Info label="Listing ID" value={order.listing_id || "Missing"} />
                <Info label="Stripe payment" value={order.stripe_payment_intent_id || order.stripe_session_id || "Not added"} />
              </div>
            </article>
          ))
        )}
      </div>
    </Panel>
  )
}

const BLOG_CATEGORIES = [
  "Business Advice",
  "Buyer Advice",
  "Seller Advice",
  "Industry Insights",
  "Equipment Guides",
  "Marketplace News",
]

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 96)
}

function BlogPostForm({
  post,
  onClose,
  onSaved,
}: {
  post: AdminBlogPost | null
  onClose: () => void
  onSaved: (slug: string, title: string, isNew: boolean) => void
}) {
  const isEdit = post !== null
  const [createState, createAction] = useActionState(createBlogPost, null)
  const [updateState, updateAction] = useActionState(updateBlogPost, null)
  const state = isEdit ? updateState : createState
  const action = isEdit ? updateAction : createAction

  const [title, setTitle] = useState(post?.title || "")
  const [slug, setSlug] = useState(post?.slug || "")
  const [slugTouched, setSlugTouched] = useState(isEdit)

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title))
  }, [title, slugTouched])

  useEffect(() => {
    if (state && "success" in state && state.success) {
      onSaved(state.slug as string, title, !isEdit)
    }
  }, [state])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl border border-white/12 bg-[#001B36] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">{isEdit ? "Edit post" : "New post"}</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-black text-white/70 hover:text-white">
            Close
          </button>
        </div>

        {state && "error" in state && state.error && (
          <p className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/12 px-4 py-3 text-sm font-semibold text-red-300">
            {state.error as string}
          </p>
        )}

        <form action={action} className="space-y-4">
          {isEdit && <input type="hidden" name="post_id" value={post!.id} />}

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-white/50">Title</label>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white placeholder-white/30 focus:border-[#FF6B00]/60 focus:outline-none"
              placeholder="Post title"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-white/50">Slug</label>
            <input
              name="slug"
              value={slug}
              onChange={(e) => { setSlugTouched(true); setSlug(e.target.value) }}
              required
              className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 font-mono text-sm text-white placeholder-white/30 focus:border-[#FF6B00]/60 focus:outline-none"
              placeholder="url-slug"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-white/50">Category</label>
              <select
                name="category"
                defaultValue={post?.category || "Equipment Guides"}
                className="w-full rounded-2xl border border-white/10 bg-[#001B36] px-4 py-3 text-sm font-semibold text-white focus:border-[#FF6B00]/60 focus:outline-none"
              >
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-white/50">Target keywords (comma-separated)</label>
              <input
                name="target_keywords"
                defaultValue={post?.target_keywords?.join(", ") || ""}
                className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white placeholder-white/30 focus:border-[#FF6B00]/60 focus:outline-none"
                placeholder="used commercial fridge, café equipment"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-white/50">Meta title</label>
            <input
              name="meta_title"
              defaultValue={post?.meta_title || ""}
              className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white placeholder-white/30 focus:border-[#FF6B00]/60 focus:outline-none"
              placeholder="SEO title (under 65 chars)"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-white/50">Meta description</label>
            <textarea
              name="meta_description"
              defaultValue={post?.meta_description || ""}
              rows={2}
              className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white placeholder-white/30 focus:border-[#FF6B00]/60 focus:outline-none"
              placeholder="140–160 character meta description"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-white/50">Body (Markdown)</label>
            {isEdit && !post?.article_markdown && (
              <p className="mb-2 text-xs text-amber-400/80">
                This post was auto-generated as HTML — no Markdown is stored. Leave this blank to keep the existing content, or type new Markdown here to replace it.
              </p>
            )}
            <textarea
              name="body"
              defaultValue={post?.article_markdown || ""}
              rows={18}
              className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 font-mono text-sm text-white placeholder-white/30 focus:border-[#FF6B00]/60 focus:outline-none"
              placeholder="Write in Markdown — ## headings, **bold**, *italic*, - lists, [link text](/path)"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              name="status"
              value="draft"
              className="rounded-2xl border border-white/12 bg-white/8 px-5 py-2.5 text-sm font-black text-white hover:bg-white/14"
            >
              Save as draft
            </button>
            <button
              type="submit"
              name="status"
              value="published"
              className="rounded-2xl bg-[#FF6B00] px-5 py-2.5 text-sm font-black text-white shadow-[0_12px_28px_rgba(255,107,0,0.25)] hover:brightness-110"
            >
              Publish
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BlogPostsPanel({ posts: initialPosts }: { posts: AdminBlogPost[] }) {
  const [isPending, startTransition] = useTransition()
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [extraPosts, setExtraPosts] = useState<AdminBlogPost[]>([])
  const [formPost, setFormPost] = useState<AdminBlogPost | "new" | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<{ ok: true; url: string; title: string } | { ok: false; error: string } | null>(null)

  const allPosts = [...extraPosts, ...initialPosts]
  const sortedPosts = allPosts
    .filter((p) => !deletedIds.has(p.id))
    .sort((l, r) => new Date(r.published_at || r.created_at || 0).getTime() - new Date(l.published_at || l.created_at || 0).getTime())

  function handleDelete(post: AdminBlogPost) {
    if (!confirm(`Delete "${post.title || "this post"}"? This cannot be undone.`)) return
    setDeletedIds((prev) => new Set([...prev, post.id]))
    const fd = new FormData()
    fd.append("post_id", post.id)
    startTransition(async () => {
      try {
        await deleteBlogPost(fd)
      } catch {
        setDeletedIds((prev) => { const next = new Set(prev); next.delete(post.id); return next })
      }
    })
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenResult(null)
    try {
      const res = await fetch("/api/admin/blog/auto-generate", { method: "POST" })
      const data = await res.json() as Record<string, unknown>
      if (!res.ok) {
        setGenResult({ ok: false, error: String(data.error || `HTTP ${res.status}`) })
      } else {
        setGenResult({ ok: true, url: String(data.url || ""), title: String(data.title || "New post") })
      }
    } catch (err) {
      setGenResult({ ok: false, error: err instanceof Error ? err.message : "Network error" })
    } finally {
      setGenerating(false)
    }
  }

  function handleSaved(slug: string, title: string, isNew: boolean) {
    if (isNew) {
      setExtraPosts((prev) => [{
        id: `optimistic-${Date.now()}`,
        title,
        slug,
        status: "published",
        category: "Equipment Guides",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      }, ...prev])
    }
    setFormPost(null)
  }

  return (
    <>
      {formPost !== null && (
        <BlogPostForm
          post={formPost === "new" ? null : formPost}
          onClose={() => setFormPost(null)}
          onSaved={handleSaved}
        />
      )}
      <Panel title="Blog management" icon={<FileText className="h-5 w-5" />}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-white/60">
            Write and manage CaterBids blog posts, or auto-generate today&apos;s post with AI.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/blog" className="rounded-2xl border border-white/10 bg-white/8 px-4 py-2 text-sm font-black text-white">
              View blog
            </Link>
            <button
              type="button"
              onClick={() => setFormPost("new")}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/8 px-4 py-2 text-sm font-black text-white hover:bg-white/14"
            >
              <Plus className="h-4 w-4" />
              New post
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#FF6B00] px-4 py-2 text-sm font-black text-white shadow-[0_12px_28px_rgba(255,107,0,0.22)] hover:brightness-110 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {generating ? "Writing post…" : "Generate today's post"}
            </button>
          </div>
        </div>

        {genResult && (
          <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${genResult.ok ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
            {genResult.ok ? (
              <>
                Generated:{" "}
                <a href={genResult.url} className="underline" target="_blank" rel="noreferrer">
                  {genResult.title}
                </a>
              </>
            ) : (
              <>Error: {genResult.error}</>
            )}
          </div>
        )}

        <div className="space-y-3">
          {sortedPosts.length === 0 ? (
            <EmptyState text="No blog posts yet. Use 'New post' to write one, or 'Generate today's post' to create one with AI." />
          ) : (
            sortedPosts.map((post) => (
              <article key={post.id} className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-black">{post.title || "Untitled blog post"}</p>
                    <p className="mt-1 text-sm text-white/55">
                      {post.category || "Uncategorised"} • {formatDate(post.published_at || post.created_at)}
                    </p>
                    <p className="mt-1 text-xs text-white/45">Slug: {post.slug || "missing"}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Badge label={post.status || "draft"} orange={String(post.status || "").toLowerCase() === "published"} />
                    {post.slug && (
                      <Link href={`/blog/${post.slug}`} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black text-white">
                        Open post
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setFormPost(post)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black text-white hover:bg-white/14"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      disabled={isPending}
                      className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </Panel>
    </>
  )
}

function VerificationPanel({ verifications, users }: { verifications: AdminVerification[]; users: AdminUser[] }) {
  const usersById = new Map(users.map((user) => [user.id, user]))

  return (
    <Panel title="Verification records" icon={<BadgeCheck className="h-5 w-5" />}>
      <div className="space-y-3">
        {verifications.length === 0 ? (
          <EmptyState text="No verification records found." />
        ) : (
          verifications.map((verification, index) => {
            const user = verification.user_id ? usersById.get(verification.user_id) : null
            return (
              <article key={verification.id || verification.user_id || `verification-${index}`} className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
                <p className="font-black">{user ? userName(user) : verification.user_id || "Verification"}</p>
                <p className="mt-1 text-sm text-white/55">{user?.email || verification.phone || "No contact saved"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge label={verification.email_verified ? "Email verified" : "Email pending"} orange={Boolean(verification.email_verified)} />
                  <Badge label={verification.phone_verified ? "Phone verified" : "Phone pending"} orange={Boolean(verification.phone_verified)} />
                  <Badge label={`ID: ${verification.id_verification_status || "not started"}`} />
                  <Badge label={`Business: ${verification.business_verification_status || "not started"}`} />
                </div>
              </article>
            )
          })
        )}
      </div>
    </Panel>
  )
}

function PaymentStatusPanel({ settings, sellerPlans }: { settings: AdminPaymentSettings; sellerPlans: AdminSellerPlan[] }) {
  const packs = sellerPlans.filter((plan) => plan.type === "single_pack")
  const subscriptions = sellerPlans.filter((plan) => plan.type === "subscription")

  return (
    <Panel title="Seller Payments" icon={<PoundSterling className="h-5 w-5" />}>
      <div className="rounded-3xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xl font-black">{paymentStatusLabel(settings)}</p>
            <p className="mt-1 text-sm font-bold text-white/60">
              {settings.free_listing_mode
                ? `Free listing mode active. First ${settings.free_listing_limit} listings are free.`
                : "Free listing mode is off."}
            </p>
          </div>
          <Badge label={settings.currency} orange />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">Listing packs</p>
          <p className="mt-2 text-2xl font-black">{settings.listing_packs_enabled ? "Enabled" : "Off"}</p>
          <p className="mt-2 text-sm font-bold text-white/55">
            {packs.map((plan) => `${plan.name} ${formatPlanPrice(plan)}`).join(" • ") || "No plans seeded yet"}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">Monthly plans</p>
          <p className="mt-2 text-2xl font-black">{settings.subscriptions_enabled ? "Enabled" : "Off"}</p>
          <p className="mt-2 text-sm font-bold text-white/55">
            {subscriptions.map((plan) => `${plan.name} ${formatPlanPrice(plan)}`).join(" • ") || "No subscriptions seeded yet"}
          </p>
        </div>
      </div>
      <Link href="/admin?tab=settings" className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white">
        Manage payment settings
      </Link>
    </Panel>
  )
}

function PaymentSwitch({
  name,
  label,
  checked,
  description,
}: {
  name: keyof AdminPaymentSettings
  label: string
  checked: boolean
  description: string
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
      <span>
        <span className="block font-black">{label}</span>
        <span className="mt-1 block text-sm font-semibold leading-relaxed text-white/55">{description}</span>
      </span>
      <span className="relative mt-1 inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-white/12 p-1">
        <input name={name} type="checkbox" defaultChecked={checked} className="peer sr-only" />
        <span className="h-6 w-6 rounded-full bg-white transition peer-checked:translate-x-6 peer-checked:bg-[#FF6B00]" />
      </span>
    </label>
  )
}

function FoundingMembersPanel({
  sold,
  cap,
  members,
}: {
  sold: number
  cap: number
  members: AdminFoundingMember[]
}) {
  const remaining = Math.max(0, cap - sold)
  return (
    <Panel title="Founding Trade Members" icon={<ShieldCheck className="h-5 w-5" />}>
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-5 py-3 text-center">
          <p className="text-3xl font-black text-[#FF6B00]">{sold}</p>
          <p className="mt-1 text-xs font-black text-white/60">of {cap} sold</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center">
          <p className="text-3xl font-black">{remaining}</p>
          <p className="mt-1 text-xs font-black text-white/60">spots remaining</p>
        </div>
        {remaining === 0 && (
          <p className="self-center rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300">
            Sold out — cap reached
          </p>
        )}
      </div>
      {members.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-black text-white/50">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Member</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map((member, index) => (
                <tr key={member.id}>
                  <td className="py-2 pr-4 font-black text-[#FFB15A]">{index + 1}</td>
                  <td className="py-2 pr-4 font-bold">{member.email || member.seller_id || "—"}</td>
                  <td className="py-2 text-white/60">{formatDate(member.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm font-bold text-white/50">No founding members yet.</p>
      )}
    </Panel>
  )
}

function SellerPlanEditForm({
  plan,
  isSuperAdmin,
}: {
  plan: AdminSellerPlan
  isSuperAdmin: boolean
}) {
  const [state, formAction, isPending] = useActionState(updateSellerPlan, null)

  if (!plan.id) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-bold text-white/50">
        {plan.name} — not in database yet (run migration to enable editing)
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <input type="hidden" name="plan_id" value={plan.id} />
      <p className="text-sm font-black">{plan.name}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black text-white/60">Price (£)</span>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={plan.price}
            disabled={!isSuperAdmin || isPending}
            className="rounded-xl border border-white/10 bg-[#001633] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black text-white/60">Listings</span>
          <input
            name="listing_count"
            type="number"
            step="1"
            min="1"
            defaultValue={plan.listing_count}
            disabled={!isSuperAdmin || isPending}
            className="rounded-xl border border-white/10 bg-[#001633] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black text-white/60">Duration (days)</span>
          <input
            name="duration_days"
            type="number"
            step="1"
            min="1"
            defaultValue={plan.duration_days ?? 30}
            disabled={!isSuperAdmin || isPending}
            className="rounded-xl border border-white/10 bg-[#001633] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-black text-white/60">Features (one per line)</span>
        <textarea
          name="features"
          rows={3}
          defaultValue={Array.isArray(plan.features) ? plan.features.join("\n") : ""}
          disabled={!isSuperAdmin || isPending}
          className="rounded-xl border border-white/10 bg-[#001633] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-black text-white/60">Overage price (£) — leave blank if no overage</span>
        <input
          name="overage_price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={plan.overage_price ?? ""}
          disabled={!isSuperAdmin || isPending}
          className="rounded-xl border border-white/10 bg-[#001633] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
        />
      </label>
      <label className="flex items-center gap-3">
        <input
          name="active"
          type="checkbox"
          defaultChecked={plan.active}
          disabled={!isSuperAdmin || isPending}
          className="h-4 w-4 rounded"
        />
        <span className="text-sm font-bold">Plan active (visible to sellers)</span>
      </label>
      {!isSuperAdmin && (
        <p className="text-xs font-bold text-amber-200/70">Only the super admin can edit plans.</p>
      )}
      {state?.error && (
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-xl border border-green-400/25 bg-green-500/10 px-3 py-2 text-sm font-bold text-green-300">
          Saved ✓
        </p>
      )}
      <button
        disabled={!isSuperAdmin || isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  )
}

function PaymentSettingsPanel({
  settings,
  sellerPlans,
  adminRole,
  adminEmail,
}: {
  settings: AdminPaymentSettings
  sellerPlans: AdminSellerPlan[]
  adminRole: string
  adminEmail: string
}) {
  const isSuperAdmin = adminRole === "super_admin" || adminEmail.toLowerCase() === PROTECTED_SUPER_ADMIN_EMAIL
  const packs = sellerPlans.filter((plan) => plan.type === "single_pack")
  const subscriptions = sellerPlans.filter((plan) => plan.type === "subscription")

  return (
    <Panel title="Payment Settings" icon={<Power className="h-5 w-5" />}>
      <div className="mb-4 rounded-3xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-black">{paymentStatusLabel(settings)}</p>
            <p className="mt-1 text-sm font-bold text-orange-100">
              {settings.payments_enabled
                ? "Sellers may need a free allowance, listing pack or monthly plan before publishing."
                : "Payments are currently disabled — free listing mode is active."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge label={settings.currency} orange />
            {settings.free_listing_mode && <Badge label={`First ${settings.free_listing_limit} free`} orange />}
          </div>
        </div>
      </div>

      <form action={updatePaymentSettings} className="space-y-4">
        <fieldset disabled={!isSuperAdmin} className="space-y-4 disabled:opacity-60">
          <div className="grid gap-3 lg:grid-cols-2">
            <PaymentSwitch
              name="payments_enabled"
              label="Enable payments"
              checked={settings.payments_enabled}
              description="When off, sellers can publish listings without Stripe checkout."
            />
            <PaymentSwitch
              name="free_listing_mode"
              label="Enable free listing mode"
              checked={settings.free_listing_mode}
              description="Use the free launch allowance before paid packs are required."
            />
            <PaymentSwitch
              name="listing_packs_enabled"
              label="Enable listing packs"
              checked={settings.listing_packs_enabled}
              description="Show one-off listing packs when payment is required."
            />
            <PaymentSwitch
              name="subscriptions_enabled"
              label="Enable monthly plans"
              checked={settings.subscriptions_enabled}
              description="Show recurring seller plans when payment is required."
            />
            <PaymentSwitch
              name="featured_boosts_enabled"
              label="Enable featured listing boost payments"
              checked={settings.featured_boosts_enabled}
              description="Allow paid featured boosts once the Stripe boost flow is ready."
            />
            <PaymentSwitch
              name="test_mode"
              label="Enable test mode"
              checked={settings.test_mode}
              description="Keep payment status visibly in testing before going fully live."
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
              <span className="block text-sm font-black">Free listing limit</span>
              <input
                name="free_listing_limit"
                type="number"
                min="0"
                defaultValue={settings.free_listing_limit}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#001633] px-3 py-3 text-sm font-bold text-white"
              />
            </label>
            <label className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
              <span className="block text-sm font-black">Currency</span>
              <select
                name="currency"
                defaultValue={settings.currency || "GBP"}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#001633] px-3 py-3 text-sm font-bold text-white"
              >
                <option value="GBP">GBP</option>
              </select>
            </label>
            <label className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
              <span className="block text-sm font-black">Featured boost — 7 days (£)</span>
              <input
                name="featured_price_7d"
                type="number"
                step="0.01"
                min="0"
                defaultValue={settings.featured_price_7d}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#001633] px-3 py-3 text-sm font-bold text-white"
              />
            </label>
            <label className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
              <span className="block text-sm font-black">Featured boost — 30 days (£)</span>
              <input
                name="featured_price_30d"
                type="number"
                step="0.01"
                min="0"
                defaultValue={settings.featured_price_30d}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#001633] px-3 py-3 text-sm font-bold text-white"
              />
            </label>
          </div>
        </fieldset>

        {!isSuperAdmin && (
          <p className="rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-50">
            Only the super admin can edit payment settings. Current settings are visible for review.
          </p>
        )}

        <button
          disabled={!isSuperAdmin}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Save payment settings
        </button>
      </form>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
          <p className="font-black">One-off listing packs</p>
          <div className="mt-3 space-y-3">
            {packs.map((plan) => (
              <SellerPlanEditForm key={plan.name} plan={plan} isSuperAdmin={isSuperAdmin} />
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
          <p className="font-black">Monthly plans</p>
          <div className="mt-3 space-y-3">
            {subscriptions.map((plan) => (
              <SellerPlanEditForm key={plan.name} plan={plan} isSuperAdmin={isSuperAdmin} />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}

function SettingsPanel({ settings, compact = false }: { settings: AdminSiteSetting[]; compact?: boolean }) {
  return (
    <Panel title="Site Settings" icon={<Settings className="h-5 w-5" />}>
      <p className="mb-4 rounded-2xl border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-4 py-3 text-sm font-bold text-orange-100">
        These settings control public website messages, launch offers and support details. Seller payments are managed in the payment settings panel above.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {settings.map((setting) => {
          const config = SETTING_CONFIG[setting.key] || {
            title: setting.key.replaceAll("_", " "),
            inputLabel: "Setting value",
            placeholder: "",
            notePlaceholder: "Internal note only",
            valueType: "text" as const,
            connected: false,
          }
          const value = settingText(setting.value)

          return (
            <form key={setting.key} action={updateSiteSetting} className="rounded-3xl border border-white/10 bg-[#002E5D]/45 p-4">
              <input type="hidden" name="key" value={setting.key} />
              <input type="hidden" name="value_type" value={config.valueType} />
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-black">{config.title}</p>
                  <p className="mt-1 text-xs font-bold text-white/45">{config.inputLabel}</p>
                </div>
                {!config.connected && <Badge label="Saved only — not connected to homepage yet" />}
              </div>

              {config.valueType === "boolean" ? (
                <>
                  <select
                    name="value"
                    defaultValue={value === "true" || value === "on" ? "true" : "false"}
                    className="w-full rounded-2xl border border-white/10 bg-[#001633] px-3 py-3 text-sm font-bold text-white"
                  >
                    <option value="false">Off</option>
                    <option value="true">On</option>
                  </select>
                  <p className="mt-2 text-xs font-bold text-white/50">Temporarily hide public selling/listing actions while testing.</p>
                </>
              ) : (
                <input
                  name="value"
                  type={config.valueType === "number" ? "number" : "text"}
                  step={config.valueType === "number" ? "0.01" : undefined}
                  defaultValue={value}
                  className="w-full rounded-2xl border border-white/10 bg-[#001633] px-3 py-3 text-sm font-bold text-white"
                  placeholder={config.placeholder}
                />
              )}

              {!compact && (
                <input
                  name="description"
                  defaultValue={setting.description || ""}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#001633] px-3 py-3 text-sm font-bold text-white"
                  placeholder={config.notePlaceholder}
                />
              )}
              <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white">
                <Save className="h-4 w-4" />
                Save
              </button>
            </form>
          )
        })}
      </div>
    </Panel>
  )
}

function AuditPanel({ auditLogs, compact = false }: { auditLogs: AdminAuditLog[]; compact?: boolean }) {
  return (
    <Panel title="Audit Log" icon={<ShieldCheck className="h-5 w-5" />}>
      {auditLogs.length === 0 ? (
        <EmptyState text="No audit actions yet." />
      ) : (
        <div className="space-y-3">
          {auditLogs.slice(0, compact ? 8 : 50).map((log) => (
            <div key={log.id} className="rounded-2xl border border-white/10 bg-[#002E5D]/45 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-black">{log.action || "Admin action"}</p>
                  <p className="mt-1 text-sm text-white/55">
                    {log.target_table || log.entity_type || "entity"} {log.target_id || log.entity_id ? `• ${log.target_id || log.entity_id}` : ""} • {formatDate(log.created_at)}
                  </p>
                </div>
                <Badge label={log.admin_email || log.admin_user_id || "Admin"} orange />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/15">
      <div className="mb-4 flex items-center gap-2 text-[#FF6B00]">
        {icon}
        <h3 className="text-lg font-black text-white">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function Badge({ label, orange = false }: { label: string; orange?: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${
      orange ? "bg-[#FF6B00]/15 text-orange-100" : "bg-white/10 text-white/70"
    }`}>
      {label}
    </span>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm font-bold text-white/55">
      {text}
    </div>
  )
}
