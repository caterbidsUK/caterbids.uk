/* eslint-disable @next/next/no-img-element */
import Image from "next/image"
import SiteLogo from "@/components/SiteLogo"
import Link from "next/link"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  BadgeCheck,
  Bell as BellIcon,
  Bot,
  Bookmark,
  Building2,
  ChevronRight,
  Heart,
  Headphones,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquare,
  PackageCheck,
  Percent,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Tag,
  Truck,
  UserCircle,
} from "lucide-react"
import type { User } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { isProtectedSuperAdminEmail } from "@/lib/admin-access"
import SiteFooter from "@/components/SiteFooter"
import PlanUsageStrip from "@/app/account/PlanUsageStrip"
import { countLiveListings } from "@/lib/entitlements/usage"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type Listing = Database["public"]["Tables"]["listings"]["Row"]
type Conversation = Database["public"]["Tables"]["conversations"]["Row"]
type Order = Database["public"]["Tables"]["orders"]["Row"]

type DashboardUser = Omit<
  Partial<User>,
  "id" | "email" | "email_confirmed_at" | "confirmed_at" | "created_at" | "app_metadata" | "user_metadata"
> & {
  id: string
  email?: string | null
  email_confirmed_at?: string | null
  confirmed_at?: string | null
  created_at?: string
  app_metadata: User["app_metadata"]
  user_metadata: User["user_metadata"]
}

type DashboardData = {
  profile: Profile
  user: DashboardUser
  listings: Listing[]
  activeListingsCount: number
  conversations: Conversation[]
  conversationsCount: number
  unreadMessagesCount: number
  favouritesCount: number
  savedSearchesCount: number
  sellerOrders: Order[]
}

const accountDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
})

const monthDateFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
})

const draftListingStatuses = new Set(["draft", "pending_payment", "payment_pending"])
const soldClosedListingStatuses = new Set(["sold", "closed", "archived", "removed", "expired"])
const completedOrderStatuses = new Set(["paid", "complete", "completed", "delivered", "fulfilled"])

function formatDate(value?: string | null) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return accountDateFormatter.format(parsed)
}

function formatMemberSince(value?: string | null) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return monthDateFormatter.format(parsed)
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  })
}

function displayPrice(value?: string | null) {
  if (!value) return "Price not added"
  const cleaned = value.trim()
  if (!cleaned) return "Price not added"
  return cleaned.startsWith("£") ? cleaned : `£${cleaned}`
}

function formatStatus(value?: string | null) {
  const status = value || "live"
  if (status === "payment_pending") return "Pending"
  return status
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

function isCompletedOrder(order: Order) {
  const paymentStatus = order.payment_status?.toLowerCase() || ""
  const orderStatus = order.order_status?.toLowerCase() || ""
  return completedOrderStatuses.has(paymentStatus) || completedOrderStatuses.has(orderStatus)
}

function profileDisplayName(profile: Profile, user: DashboardUser) {
  const name =
    profile.full_name ||
    profile.name ||
    profile.business_name ||
    profile.business ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "CaterBidsUK seller"

  return String(name).trim() || "CaterBidsUK seller"
}

function firstName(name: string) {
  return name.split(/\s+/).filter(Boolean)[0] || "there"
}

function initials(name: string, email?: string | null) {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length > 0) {
    return parts.map((part) => part.charAt(0)).join("").toUpperCase()
  }

  return (email?.charAt(0) || "C").toUpperCase()
}

function listingImage(listing: Listing) {
  const imageFromArray = Array.isArray(listing.images)
    ? listing.images.find((url) => typeof url === "string" && url.trim().length > 0)
    : null

  return imageFromArray || listing.image_url || ""
}

function profileIsEmailVerified(profile: Profile, user: DashboardUser) {
  return Boolean(profile.email_verified || profile.is_email_verified || user.email_confirmed_at || user.confirmed_at)
}

function profileIsPhoneVerified(profile: Profile) {
  return Boolean(profile.phone_verified || profile.is_phone_verified)
}

function profilePhoneNumber(profile: Profile) {
  return profile.phone_number || profile.phone || ""
}

function accountTypeForProfile(profile: Profile) {
  if (profile.account_type === "seller") return "seller" as const
  if (profile.role === "seller" || profile.role === "dealer") return "seller" as const
  return "buyer" as const
}

function profileSellerBadge(profile: Profile) {
  if (profile.business_verified) return "Verified Business"
  if (profile.government_id_verified) return "ID Verified"
  if (
    profile.seller_verification_level &&
    ["verified", "seller_verified", "id_verified", "business_verified"].includes(profile.seller_verification_level)
  ) {
    return "Verified Seller"
  }
  return ""
}

function sellerVerificationComplete(profile: Profile, emailVerified: boolean, phoneVerified: boolean) {
  const sellerLevelComplete =
    Boolean(profile.business_verified || profile.government_id_verified) ||
    ["verified", "seller_verified", "id_verified", "business_verified"].includes(profile.seller_verification_level || "")

  return emailVerified && phoneVerified && sellerLevelComplete
}

function identityStatus(profile: Profile) {
  if (profile.government_id_verified) return { label: "Verified", tone: "good" as const }
  if (profile.stripe_identity_status && !["canceled", "failed"].includes(profile.stripe_identity_status)) {
    return { label: "Pending", tone: "wait" as const }
  }
  return { label: "Not completed", tone: "todo" as const }
}

function businessStatus(profile: Profile) {
  if (profile.business_verified) return { label: "Verified", tone: "good" as const }
  if (profile.seller_verification_level === "business_pending" || profile.companies_house_number) {
    return { label: "Pending", tone: "wait" as const }
  }
  return { label: "Not completed", tone: "todo" as const }
}

function statusClasses(status?: string | null) {
  const normalised = (status || "live").toLowerCase()

  if (normalised === "sold") return "bg-slate-100 text-slate-700"
  if (normalised.includes("pending")) return "bg-amber-100 text-amber-800"
  if (normalised === "paused" || normalised === "draft") return "bg-slate-100 text-slate-600"
  return "bg-emerald-100 text-emerald-700"
}

function defaultProfile(user: DashboardUser, emailVerified: boolean): Profile {
  return {
    id: user.id,
    email: user.email || null,
    name: user.email?.split("@")[0] || "User",
    full_name:
      String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User"),
    business: null,
    business_name: null,
    account_type: "buyer",
    location: null,
    phone: null,
    phone_number: null,
    seller_contact_name: null,
    collection_full_address: null,
    collection_city: null,
    collection_postcode: null,
    avatar_url: null,
    verified: emailVerified,
    email_verified: emailVerified,
    is_email_verified: emailVerified,
    verification_level: emailVerified ? "email_verified" : "basic",
    badge: emailVerified ? "Email Verified" : "Email pending",
    verified_user_badge: false,
    auth_provider: String(user.app_metadata?.provider || "") || null,
    auth_providers: [],
    last_login_at: null,
    phone_verified: false,
    is_phone_verified: false,
    phone_verified_at: null,
    phone_verification_method: "manual",
    phone_verification_status: "pending",
    phone_verification_code: null,
    phone_verification_expires_at: null,
    phone_verification_attempts: 0,
    role: "user",
    verified_dealer: false,
    stripe_connect_onboarding_complete: false,
    stripe_identity_session_id: null,
    stripe_identity_status: null,
    government_id_verified: false,
    business_verified: false,
    is_founding_member: false,
    companies_house_number: null,
    vat_number: null,
    trust_notes: null,
    seller_verification_level: "unverified",
    created_at: user.created_at || null,
    updated_at: null,
    deletion_scheduled_at: null,
  }
}

function localPreviewData(): DashboardData {
  const user: DashboardUser = {
    id: "local-beta-preview",
    email: "local-beta@caterbids.uk",
    email_confirmed_at: null,
    confirmed_at: null,
    created_at: new Date(0).toISOString(),
    app_metadata: {},
    user_metadata: { full_name: "Local Beta Preview" },
  }

  return {
    profile: defaultProfile(user, false),
    user,
    listings: [],
    activeListingsCount: 0,
    conversations: [],
    conversationsCount: 0,
    unreadMessagesCount: 0,
    favouritesCount: 0,
    savedSearchesCount: 0,
    sellerOrders: [],
  }
}

async function loadDashboardData(user: DashboardUser): Promise<DashboardData> {
  const supabase = await createClient()
  const admin = createAdminClient()
  const authEmailVerified = profileIsEmailVerified(defaultProfile(user, false), user)

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  const profile = profileData || defaultProfile(user, authEmailVerified)
  const ownershipFilter = `user_id.eq.${user.id},seller_id.eq.${user.id}`

  const [
    listingsResult,
    activeListingsCount,
    conversationsResult,
    unreadMessagesResult,
    favouritesResult,
    savedSearchesResult,
    sellerOrdersResult,
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("*")
      .or(ownershipFilter)
      .order("created_at", { ascending: false })
      .limit(50),
    countLiveListings(admin, user.id),
    supabase
      .from("conversations")
      .select("*", { count: "exact" })
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false })
      .limit(20),
    supabase
      .from("messages")
      .select("conversation_id")
      .eq("recipient_id", user.id)
      .eq("is_read", false),
    supabase
      .from("favourites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("saved_searches")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("orders")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const unreadByConversation = new Map<string, number>()
  if (!unreadMessagesResult.error) {
    for (const message of unreadMessagesResult.data || []) {
      unreadByConversation.set(message.conversation_id, (unreadByConversation.get(message.conversation_id) || 0) + 1)
    }
  }

  const conversations = (conversationsResult.data || []).map((conversation) => ({
    ...conversation,
    unread_count: unreadByConversation.get(conversation.id) || 0,
  }))

  return {
    profile,
    user,
    listings: listingsResult.data || [],
    activeListingsCount,
    conversations,
    conversationsCount: conversationsResult.count ?? conversations.length,
    unreadMessagesCount: Array.from(unreadByConversation.values()).reduce((total, count) => total + count, 0),
    favouritesCount: favouritesResult.count || 0,
    savedSearchesCount: savedSearchesResult.count || 0,
    sellerOrders: sellerOrdersResult.data || [],
  }
}

async function updateAccountType(formData: FormData) {
  "use server"

  const accountType = String(formData.get("account_type") || "").trim()
  if (accountType !== "buyer" && accountType !== "seller") {
    throw new Error("Choose buyer or seller.")
  }

  const supabase = await createClient()
  const user = await getCurrentUser(supabase)
  if (!user) redirect("/login?next=/account")

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("role,email")
    .eq("id", user.id)
    .maybeSingle()

  const currentRole = String(profile?.role || "").toLowerCase()
  const email = String(user.email || profile?.email || "").trim().toLowerCase()
  const protectedAdmin = isProtectedSuperAdminEmail(email)
  const nextRole =
    protectedAdmin || ["admin", "super_admin", "owner"].includes(currentRole)
      ? currentRole || "super_admin"
      : accountType === "seller"
        ? "seller"
        : "user"

  const { error } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email,
        account_type: accountType,
        role: nextRole,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )

  if (error) throw new Error(error.message)

  revalidatePath("/account")
}


function isAdminAccount(profile: Profile, email: string) {
  const role = String(profile.role || "").toLowerCase()
  return ["owner", "admin", "super_admin"].includes(role) || isProtectedSuperAdminEmail(email)
}

function TopNavigation({ displayName, showAdminLink }: { displayName: string; showAdminLink: boolean }) {
  const drawerGroups = [
    ...(showAdminLink
      ? [
          {
            title: "Admin",
            items: [["Admin Dashboard", "/admin"]],
          },
        ]
      : []),
    {
      title: "Account",
      items: [
        ["Overview", "/account"],
        ["My Listings", "#my-listings"],
        ["Messages", "/messages"],
        ["Saved Items", "/favourites"],
        ["Saved Searches", "/saved-searches"],
        ["Orders", "/account/orders"],
      ],
    },
    {
      title: "Seller tools",
      items: [
        ["Add New Listing", "/post-listing"],
        ["Seller Profile", "/settings#profile"],
        ["Business Details", "/settings#profile"],
        ["Verification Centre", "/settings#verification"],
      ],
    },
    {
      title: "Settings",
      items: [
        ["Account Settings", "/settings"],
        ["Notification Preferences", "/settings#notifications"],
        ["Support / Contact", "/contact"],
      ],
    },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#001A35]/95 text-white shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-4 lg:px-6">
        <Link href="/" className="focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/70">
          <SiteLogo size="sm" priority />
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm font-bold lg:flex">
          {showAdminLink && (
            <Link href="/admin" className="text-[#FF6B00] hover:text-[#ff9a4a]">
              Admin Dashboard
            </Link>
          )}
          <Link href="/search" className="hover:text-[#FF6B00]">
            Browse
          </Link>
          <Link href="/post-listing" className="hover:text-[#FF6B00]">
            Sell
          </Link>
          <Link href="/messages" className="hover:text-[#FF6B00]">
            Messages
          </Link>
          <Link href="/favourites" className="hover:text-[#FF6B00]">
            Saved
          </Link>
        </nav>

        <Link
          href="/post-listing"
          className="hidden rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#ff7b1f] xl:inline-flex"
        >
          Start Free Listing
        </Link>

        <details className="relative ml-auto lg:hidden">
          <summary className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white marker:hidden">
            <span className="sr-only">Open account menu</span>
            <Menu className="h-5 w-5" />
          </summary>
          <div className="absolute right-0 top-14 max-h-[75vh] w-80 overflow-y-auto rounded-3xl border border-white/10 bg-[#001A35] p-4 shadow-2xl shadow-black/40">
            <p className="mb-3 text-sm font-black">{displayName}</p>
            {drawerGroups.map((group) => (
              <section key={group.title} className="mt-4">
                <h3 className="px-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#FF6B00]">
                  {group.title}
                </h3>
                <div className="mt-2 grid gap-1 text-sm font-bold">
                  {group.items.map(([label, href]) => (
                    <Link key={label} href={href} className="rounded-2xl px-3 py-3 text-white/78 hover:bg-white/10 hover:text-white">
                      {label}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </details>

        <Link
          href="/account"
          aria-label="Account overview"
          className="hidden h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-sm font-black text-white md:flex"
        >
          {initials(displayName)}
        </Link>
      </div>

    </header>
  )
}

function Sidebar({
  displayName,
  email,
  avatarUrl,
  badge,
  memberSince,
  showAdminLink,
}: {
  displayName: string
  email: string
  avatarUrl?: string | null
  badge: string
  memberSince: string
  showAdminLink: boolean
}) {
  const accountItems = [
    { label: "Overview", href: "/account", icon: LayoutDashboard, active: true },
    { label: "My Listings", href: "#my-listings", icon: PackageCheck },
    { label: "Messages", href: "/messages", icon: MessageSquare },
    { label: "Saved Items", href: "/favourites", icon: Heart },
    { label: "Saved Searches", href: "/saved-searches", icon: Bookmark },
    { label: "Orders", href: "/account/orders", icon: ShoppingBag },
  ]
  const sellerItems = [
    { label: "Add New Listing", href: "/post-listing", icon: PlusCircle },
    { label: "Seller Profile", href: "/settings#profile", icon: UserCircle },
    { label: "Business Details", href: "/settings#profile", icon: Building2 },
    { label: "Verification Centre", href: "/settings#verification", icon: ShieldCheck },
  ]
  const settingItems = [
    { label: "Account Settings", href: "/settings", icon: Settings },
    { label: "Notification Preferences", href: "/settings#notifications", icon: BellIcon },
    { label: "Contact Support", href: "/contact", icon: Headphones },
  ]

  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-gradient-to-b from-[#002E5D] via-[#001F43] to-[#00142B] px-4 py-5 text-white lg:block">
      <div className="sticky top-24 space-y-5">
        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#FF6B00]/50 bg-[#071D3A] text-xl font-black">
                {initials(displayName, email)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-black">{displayName}</h2>
              <p className="truncate text-xs text-white/65">{email}</p>
            </div>
          </div>
          {badge && (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">
              <ShieldCheck className="h-3.5 w-3.5 text-[#FF6B00]" />
              {badge}
            </span>
          )}
          {memberSince && <p className="mt-3 text-xs text-white/55">Member since {memberSince}</p>}
        </section>

        {showAdminLink && (
          <section className="rounded-3xl border border-[#FF6B00]/35 bg-[#FF6B00]/12 p-4 shadow-2xl shadow-[#FF6B00]/10">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#FF9A4A]">Owner access</p>
            <h2 className="mt-2 text-lg font-black text-white">CaterBids Admin</h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-white/65">
              Manage users, listings, blog posts, verification and marketplace controls.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/20"
            >
              Admin Dashboard
            </Link>
          </section>
        )}

        <SidebarGroup title="Account" items={accountItems} />
        <SidebarGroup title="Seller tools" items={sellerItems} />
        <SidebarGroup title="Settings" items={settingItems} />

        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-center">
          <Headphones className="mx-auto h-10 w-10 text-[#FF6B00]" />
          <h3 className="mt-3 text-lg font-black">Need Help?</h3>
          <p className="mt-2 text-sm text-white/65">Our support team is here to help.</p>
          <Link
            href="/contact"
            className="mt-4 inline-flex w-full justify-center rounded-2xl border border-white/20 px-4 py-3 text-sm font-black hover:bg-white/10"
          >
            Contact Support
          </Link>
        </section>
      </div>
    </aside>
  )
}

function SidebarGroup({
  title,
  items,
}: {
  title: string
  items: Array<{
    label: string
    href: string
    icon: typeof LayoutDashboard
    active?: boolean
  }>
}) {
  return (
    <section>
      <h3 className="mb-2 px-2 text-xs font-black uppercase tracking-[0.16em] text-white/50">{title}</h3>
      <div className="grid gap-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                item.active ? "bg-white/12 text-white" : "text-white/78 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className={`h-5 w-5 ${item.active ? "text-[#FF6B00]" : "text-white/60"}`} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  detail: string
  icon: typeof Tag
  tone: "blue" | "purple" | "orange" | "green"
}) {
  const tones = {
    blue: "bg-blue-400/10 text-blue-200 ring-blue-300/20",
    purple: "bg-violet-400/10 text-violet-200 ring-violet-300/20",
    orange: "bg-[#FF6B00]/15 text-[#FF9A4A] ring-[#FF6B00]/25",
    green: "bg-emerald-400/10 text-emerald-200 ring-emerald-300/20",
  }

  return (
    <article className="rounded-3xl border border-white/10 bg-[#082D50]/90 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.22)] md:p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-white/55 md:text-sm md:normal-case md:tracking-normal">
        {title}
      </p>
      <p className="mt-2 text-2xl font-black text-white md:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-bold text-[#A7B5C9] md:text-sm">{detail}</p>
    </article>
  )
}

function AccountTypePanel({ accountType }: { accountType: "buyer" | "seller" }) {
  const options = [
    {
      value: "buyer",
      title: "Buyer account",
      text: "Save listings, message sellers and track enquiries.",
      icon: Heart,
    },
    {
      value: "seller",
      title: "Seller account",
      text: "Create listings, manage enquiries and build seller trust.",
      icon: PackageCheck,
    },
  ] as const

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#082D50]/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)] md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FF6B00]">Account type</p>
          <h2 className="mt-1 text-xl font-black text-white">
            {accountType === "seller" ? "Seller dashboard enabled" : "Buyer dashboard enabled"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#A7B5C9]">
            Choose how you mainly use CaterBidsUK. You can switch any time.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon
          const active = accountType === option.value
          return (
            <form key={option.value} action={updateAccountType}>
              <input type="hidden" name="account_type" value={option.value} />
              <button
                type="submit"
                className={`flex min-h-24 w-full items-center gap-4 rounded-3xl border p-4 text-left transition ${
                  active
                    ? "border-[#FF6B00]/55 bg-[#FF6B00]/12"
                    : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
                }`}
                aria-pressed={active}
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-[#FF6B00] text-white" : "bg-white/10 text-white/70"}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-black text-white">{option.title}</span>
                  <span className="mt-1 block text-sm font-semibold text-[#A7B5C9]">{option.text}</span>
                </span>
              </button>
            </form>
          )
        })}
      </div>
    </section>
  )
}

function statusToneClasses(tone: "good" | "wait" | "todo") {
  if (tone === "good") return "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
  if (tone === "wait") return "border-amber-300/20 bg-amber-400/10 text-amber-100"
  return "border-white/10 bg-white/6 text-white/65"
}

function BuyerVerificationPanel({
  profile,
  emailVerified,
  phoneVerified,
}: {
  profile: Profile
  emailVerified: boolean
  phoneVerified: boolean
}) {
  const rows = [
    {
      title: "Email verification",
      detail: emailVerified ? "Email confirmation is complete." : "Check your inbox for your login code or confirmation link.",
      status: emailVerified ? "Verified" : "Required",
      tone: emailVerified ? ("good" as const) : ("todo" as const),
      icon: Mail,
    },
    {
      title: "Phone verification",
      detail: phoneVerified ? profilePhoneNumber(profile) || "Mobile number verified." : "SMS verification is required for higher-trust account status.",
      status: phoneVerified ? "Verified" : "Not verified",
      tone: phoneVerified ? ("good" as const) : ("todo" as const),
      icon: Smartphone,
    },
  ]

  return (
    <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#082D50] to-[#031B35] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF9A4A] ring-1 ring-[#FF6B00]/25">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF6B00]">Account verification</p>
            <h2 className="mt-1 text-2xl font-black text-white">Buyer Trust Status</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-[#A7B5C9]">
              Keep your account secure before messaging sellers and saving listings.
            </p>
          </div>
        </div>
        <Link
          href="/settings#verification"
          className="inline-flex items-center justify-center rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/20 transition hover:bg-[#ff7b1f]"
        >
          Manage Verification
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const Icon = row.icon
          return (
            <article key={row.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <Icon className="mt-1 h-5 w-5 shrink-0 text-[#FF6B00]" />
                  <div>
                    <h3 className="font-black text-white">{row.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-[#A7B5C9]">{row.detail}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${statusToneClasses(row.tone)}`}>
                  {row.status}
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function SellerVerificationPanel({
  profile,
  emailVerified,
  phoneVerified,
}: {
  profile: Profile
  emailVerified: boolean
  phoneVerified: boolean
}) {
  const identity = identityStatus(profile)
  const business = businessStatus(profile)
  const complete = sellerVerificationComplete(profile, emailVerified, phoneVerified)
  const rows = [
    {
      title: "Email verification",
      detail: emailVerified ? "Supabase email confirmation is complete." : "Confirm your account email.",
      status: emailVerified ? "Verified" : "Required",
      tone: emailVerified ? ("good" as const) : ("todo" as const),
      icon: Mail,
    },
    {
      title: "Phone verification",
      detail: phoneVerified ? profilePhoneNumber(profile) || "Mobile number verified." : "Verify a UK mobile number by SMS.",
      status: phoneVerified ? "Verified" : "Required",
      tone: phoneVerified ? ("good" as const) : ("todo" as const),
      icon: Smartphone,
    },
    {
      title: "Seller identity",
      detail: profile.government_id_verified
        ? "Stripe Identity check complete."
        : profile.stripe_identity_status
          ? `Stripe Identity status: ${profile.stripe_identity_status}.`
          : "Required before higher-trust seller status.",
      status: identity.label,
      tone: identity.tone,
      icon: BadgeCheck,
    },
    {
      title: "Business verification",
      detail: profile.business_verified
        ? "Business verification is complete."
        : profile.companies_house_number
          ? `Companies House number saved: ${profile.companies_house_number}.`
          : "Optional for registered UK catering businesses.",
      status: business.label,
      tone: business.tone,
      icon: Building2,
    },
  ]

  return (
    <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#082D50] to-[#031B35] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF9A4A] ring-1 ring-[#FF6B00]/25">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF6B00]">Verification Centre</p>
            <h2 className="mt-1 text-2xl font-black text-white">Seller Verification</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-[#A7B5C9]">
              Verify your contact details and seller profile to help buyers purchase with confidence on CaterBidsUK.
            </p>
          </div>
        </div>
        <Link
          href="/settings#verification"
          className="inline-flex items-center justify-center rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/20 transition hover:bg-[#ff7b1f]"
        >
          {complete ? "Manage Verification" : "Complete Verification"}
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const Icon = row.icon
          return (
            <article key={row.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <Icon className="mt-1 h-5 w-5 shrink-0 text-[#FF6B00]" />
                  <div>
                    <h3 className="font-black text-white">{row.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-[#A7B5C9]">{row.detail}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${statusToneClasses(row.tone)}`}>
                  {row.status}
                </span>
              </div>
            </article>
          )
        })}
      </div>

      <div className={`mt-5 rounded-3xl border p-4 ${complete ? "border-emerald-300/20 bg-emerald-400/10" : "border-[#FF6B00]/25 bg-[#FF6B00]/10"}`}>
        <h3 className="font-black text-white">{complete ? "Verified Seller" : "Build buyer trust"}</h3>
        <p className="mt-1 text-sm font-semibold text-[#D5E0EF]">
          {complete
            ? "Your seller verification is complete and visible to buyers."
            : "Complete the required verification steps to qualify for a verified seller badge."}
        </p>
      </div>
    </section>
  )
}

function RecentListings({ listings }: { listings: Listing[] }) {
  const recentListings = listings.slice(0, 5)

  return (
    <section id="my-listings" className="rounded-[2rem] border border-white/10 bg-[#082D50]/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)] md:p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white">Recent Listings</h2>
        <Link href="#my-listings" className="text-sm font-black text-[#FF6B00] hover:text-[#ff9a4a]">
          View all listings
        </Link>
      </div>

      {recentListings.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.04] p-8 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-white/30" />
          <h3 className="mt-4 text-xl font-black text-white">No listings yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-[#A7B5C9]">
            Create your first catering equipment listing to start reaching buyers.
          </p>
          <Link
            href="/post-listing"
            className="mt-5 inline-flex rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/20"
          >
            Add New Listing
          </Link>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-white/10">
          {recentListings.map((listing) => {
            const image = listingImage(listing)
            return (
              <Link
                key={listing.id}
                href={`/listing?id=${listing.id}`}
                className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 py-4 transition hover:bg-white/[0.04] sm:grid-cols-[84px_minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="h-20 overflow-hidden rounded-2xl bg-white/8">
                  {image ? (
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/25">
                      <PackageCheck className="h-7 w-7" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="overflow-hidden text-sm font-black leading-snug text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] md:text-base">
                    {listing.title}
                  </h3>
                  <p className="mt-1 text-sm font-black text-[#FF9A4A]">{displayPrice(listing.price)}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[#A7B5C9]">
                    <span>{listing.category || "Catering Equipment"}</span>
                    {listing.condition && <span>{listing.condition}</span>}
                    <span>{listing.location || listing.city || "Location not added"}</span>
                    {listing.created_at && <span>{formatDate(listing.created_at)}</span>}
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses(listing.status)}`}>
                    {formatStatus(listing.status)}
                  </span>
                  <ChevronRight className="h-5 w-5 text-[#FF6B00]" />
                </div>
              </Link>
            )
          })}
          <Link
            href="#my-listings"
            className="mt-4 flex justify-center rounded-2xl border border-white/15 px-4 py-3 text-sm font-black text-white hover:bg-white/8"
          >
            View all my listings
          </Link>
        </div>
      )}
    </section>
  )
}

function RecentMessages({ conversations }: { conversations: Conversation[] }) {
  const recentConversations = conversations.slice(0, 3)

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#082D50]/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)] md:p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white">Recent Messages</h2>
        <Link href="/messages" className="text-sm font-black text-[#FF6B00] hover:text-[#ff9a4a]">
          View all messages
        </Link>
      </div>

      {recentConversations.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.04] p-8 text-center">
          <Mail className="mx-auto h-10 w-10 text-white/30" />
          <h3 className="mt-4 text-lg font-black text-white">No messages yet</h3>
          <p className="mt-2 text-sm font-semibold text-[#A7B5C9]">
            Messages from buyers and sellers will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-white/10">
          {recentConversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/messages?conversation=${conversation.id}`}
              className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-3 hover:bg-white/[0.04]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#001A35] text-sm font-black text-white ring-1 ring-white/10">
                {initials(conversation.participant_name || "CaterBids")}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-white">
                  {conversation.participant_name || "CaterBids user"}
                </h3>
                <p className="truncate text-sm text-[#A7B5C9]">
                  {conversation.last_message || conversation.listing_title || "No messages yet"}
                </p>
              </div>
              <div className="text-right">
                {conversation.unread_count > 0 && (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#FF6B00] px-2 text-xs font-black text-white">
                    {conversation.unread_count}
                  </span>
                )}
                <p className="mt-1 text-xs font-semibold text-white/40">
                  {formatDate(conversation.last_message_at || conversation.updated_at || conversation.created_at)}
                </p>
              </div>
            </Link>
          ))}
          <Link
            href="/messages"
            className="mt-4 flex justify-center rounded-2xl border border-white/15 px-4 py-3 text-sm font-black text-white hover:bg-white/8"
          >
            View all messages
          </Link>
        </div>
      )}
    </section>
  )
}

function QuickActions({
  savedSearchesCount,
  favouritesCount,
  accountType,
}: {
  savedSearchesCount: number
  favouritesCount: number
  accountType: "buyer" | "seller"
}) {
  const sellerActions = [
    {
      title: "Add New Listing",
      text: "List your equipment, van or business",
      href: "/post-listing",
      icon: MessageSquare,
    },
    {
      title: "Manage Listings",
      text: "Edit, review or relist your items",
      href: "#my-listings",
      icon: PackageCheck,
    },
    {
      title: "Verification Centre",
      text: "Check email, phone, ID and business status",
      href: "/settings#verification",
      icon: ShieldCheck,
    },
    {
      title: "Saved Searches",
      text: `${savedSearchesCount} saved search${savedSearchesCount === 1 ? "" : "es"}`,
      href: "/saved-searches",
      icon: Search,
    },
    {
      title: "Account Settings",
      text: "Edit profile and notification preferences",
      href: "/settings",
      icon: Settings,
    },
  ]
  const buyerActions = [
    {
      title: "Saved Items",
      text: `${favouritesCount} saved listing${favouritesCount === 1 ? "" : "s"}`,
      href: "/favourites",
      icon: Heart,
    },
    {
      title: "Messages",
      text: "View your buyer and seller enquiries",
      href: "/messages",
      icon: MessageSquare,
    },
    {
      title: "Verification Centre",
      text: "Check email and phone status",
      href: "/settings#verification",
      icon: ShieldCheck,
    },
    {
      title: "Saved Searches",
      text: `${savedSearchesCount} saved search${savedSearchesCount === 1 ? "" : "es"}`,
      href: "/saved-searches",
      icon: Search,
    },
    {
      title: "Account Settings",
      text: "Edit profile and notification preferences",
      href: "/settings",
      icon: Settings,
    },
  ]
  const actions = accountType === "seller" ? sellerActions : buyerActions

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#082D50]/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)] md:p-5">
      <h2 className="text-xl font-black text-white">Quick Actions</h2>
      <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.title}
              href={action.href}
              className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 bg-white/[0.03] p-4 hover:bg-white/[0.07]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF9A4A]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">{action.title}</h3>
                <p className="mt-1 text-xs font-semibold text-[#A7B5C9]">{action.text}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#FF6B00]" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function FeatureStrip() {
  const features = [
    {
      title: "CaterBot Listing Help",
      text: "Get AI help to create better listings faster.",
      icon: Bot,
    },
    {
      title: "Delivery Support",
      text: "Built to help buyers and sellers with delivery details.",
      icon: Truck,
    },
    {
      title: "Verified Seller Tools",
      text: "Build trust with verification and seller profiles.",
      icon: ShieldCheck,
    },
    {
      title: "No Final Value Fees",
      text: "Pay to list after the offer, not a percentage.",
      icon: Percent,
    },
  ]

  return (
    <section className="grid gap-4 rounded-[2rem] border border-white/10 bg-[#082D50]/90 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.25)] md:grid-cols-2 xl:grid-cols-4">
      {features.map((feature) => {
        const Icon = feature.icon
        return (
          <article key={feature.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Icon className="mt-1 h-9 w-9 shrink-0 text-[#FF6B00]" />
            <div>
              <h3 className="text-sm font-black text-white">{feature.title}</h3>
              <p className="mt-1 text-sm font-semibold text-[#A7B5C9]">{feature.text}</p>
            </div>
          </article>
        )
      })}
    </section>
  )
}


export default async function AccountPage() {
  const supabase = await createClient()
  const user = await getCurrentUser(supabase)
  const cookieStore = await cookies()
  const hasDevAuth =
    process.env.NODE_ENV === "development" && cookieStore.get("caterbids_dev_auth")?.value === "1"

  if (!user && !hasDevAuth) {
    redirect("/login?next=/account")
  }

  const dashboardData = user ? await loadDashboardData(user) : localPreviewData()
  const {
    profile,
    listings,
    activeListingsCount,
    conversations,
    conversationsCount,
    unreadMessagesCount,
    favouritesCount,
    savedSearchesCount,
    sellerOrders,
  } = dashboardData
  const dashboardUser = dashboardData.user
  const displayName = profileDisplayName(profile, dashboardUser)
  const displayEmail = profile.email || dashboardUser.email || "No email added"
  const memberSince = formatMemberSince(profile.created_at || dashboardUser.created_at)
  const badge = profileSellerBadge(profile)
  const emailVerified = profileIsEmailVerified(profile, dashboardUser)
  const phoneVerified = profileIsPhoneVerified(profile)
  const accountType = accountTypeForProfile(profile)
  const showAdminLink = isAdminAccount(profile, displayEmail)
  const completedSellerOrders = sellerOrders.filter(isCompletedOrder)
  const totalSales = completedSellerOrders.reduce((total, order) => total + (order.total_price || 0), 0)
  const draftListingsCount = listings.filter((listing) => draftListingStatuses.has(String(listing.status || "").toLowerCase())).length
  const soldClosedListingsCount = listings.filter((listing) => soldClosedListingStatuses.has(String(listing.status || "").toLowerCase())).length
  const verificationStepsComplete = [emailVerified, phoneVerified].filter(Boolean).length

  return (
    <div className="min-h-screen bg-[#001A35] text-white">
      <TopNavigation displayName={displayName} showAdminLink={showAdminLink} />

      <div className="flex min-h-[calc(100vh-82px)]">
        <Sidebar
          displayName={displayName}
          email={displayEmail}
          avatarUrl={profile.avatar_url}
          badge={badge}
          memberSince={memberSince}
          showAdminLink={showAdminLink}
        />

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 lg:px-8 lg:py-8">
            <section
              id="overview"
              className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#082D50] via-[#062747] to-[#031B35] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] md:p-6"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FF6B00]">Account dashboard</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
                  Welcome back, {firstName(displayName)}!
                </h1>
                <p className="mt-2 text-base font-semibold text-[#A7B5C9]">
                  Here&apos;s what&apos;s happening with your account today.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {emailVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-xs font-black text-blue-100">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Email verified
                    </span>
                  )}
                  {phoneVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Phone verified
                    </span>
                  )}
                  {!phoneVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-black text-white/75">
                      <Smartphone className="h-3.5 w-3.5" />
                      Phone not verified
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#FF6B00]/25 bg-[#FF6B00]/10 px-3 py-1 text-xs font-black capitalize text-[#FFB077]">
                    {accountType} account
                  </span>
                </div>
              </div>
              <div className="grid gap-3 sm:min-w-64">
                {showAdminLink && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#FF6B00]/45 bg-[#FF6B00]/15 px-5 py-4 text-sm font-black text-orange-100 shadow-lg shadow-[#FF6B00]/10 transition hover:bg-[#FF6B00]/25"
                  >
                    <ShieldCheck className="h-5 w-5" />
                    Open Admin Dashboard
                  </Link>
                )}
                {accountType === "seller" ? (
                  <Link
                    href="/post-listing"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#ff7b1f]"
                  >
                    <PlusCircle className="h-5 w-5" />
                    Add New Listing
                  </Link>
                ) : (
                  <Link
                    href="/favourites"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#ff7b1f]"
                  >
                    <Heart className="h-5 w-5" />
                    View Saved Listings
                  </Link>
                )}
              </div>
              </div>
            </section>

            <PlanUsageStrip />

            <AccountTypePanel accountType={accountType} />

            <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
              {accountType === "seller" ? (
                <>
                  <StatCard
                    title="Active Listings"
                    value={String(activeListingsCount)}
                    detail={activeListingsCount === 1 ? "Live marketplace listing" : "Live marketplace listings"}
                    icon={Tag}
                    tone="blue"
                  />
                  <StatCard
                    title="Draft Listings"
                    value={String(draftListingsCount)}
                    detail="Listings not yet live"
                    icon={PackageCheck}
                    tone="purple"
                  />
                  <StatCard
                    title="Sold / Closed"
                    value={String(soldClosedListingsCount)}
                    detail={`${formatCurrency(totalSales)} completed sales`}
                    icon={ShoppingBag}
                    tone="green"
                  />
                  <StatCard
                    title="Messages"
                    value={String(conversationsCount)}
                    detail={`${unreadMessagesCount} unread`}
                    icon={MessageSquare}
                    tone="orange"
                  />
                </>
              ) : (
                <>
                  <StatCard
                    title="Saved Listings"
                    value={String(favouritesCount)}
                    detail={favouritesCount === 1 ? "Saved marketplace listing" : "Saved marketplace listings"}
                    icon={Heart}
                    tone="blue"
                  />
                  <StatCard
                    title="Recent Enquiries"
                    value={String(conversationsCount)}
                    detail={`${unreadMessagesCount} unread message${unreadMessagesCount === 1 ? "" : "s"}`}
                    icon={MessageSquare}
                    tone="orange"
                  />
                  <StatCard
                    title="Account Verification"
                    value={`${verificationStepsComplete}/2`}
                    detail={phoneVerified ? "Email and phone checked" : "Phone not verified"}
                    icon={ShieldCheck}
                    tone="green"
                  />
                  <StatCard
                    title="Saved Searches"
                    value={String(savedSearchesCount)}
                    detail="Search alerts and saved criteria"
                    icon={Search}
                    tone="purple"
                  />
                </>
              )}
            </section>

            {accountType === "seller" ? (
              <SellerVerificationPanel profile={profile} emailVerified={emailVerified} phoneVerified={phoneVerified} />
            ) : (
              <BuyerVerificationPanel profile={profile} emailVerified={emailVerified} phoneVerified={phoneVerified} />
            )}

            {accountType === "seller" && <RecentListings listings={listings} />}

            <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
              <RecentMessages conversations={conversations} />
              <QuickActions
                savedSearchesCount={savedSearchesCount}
                favouritesCount={favouritesCount}
                accountType={accountType}
              />
            </section>

            <FeatureStrip />
          </div>

          <SiteFooter />
        </main>
      </div>
    </div>
  )
}
