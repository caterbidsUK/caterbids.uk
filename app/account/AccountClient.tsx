"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Home,
  UserCircle,
  MapPin,
  Phone,
  Mail,
  Settings,
  LayoutGrid,
  Heart,
  Search,
  MessageCircle,
  Plus,
  ShieldCheck,
  LogOut,
  PackageCheck,
  Bell,
  Star,
} from "lucide-react"
import type { Database } from "@/types/supabase"
import { createClient } from "@/lib/supabase/client"
import { buildSellerTrustSummary } from "@/lib/trust/badges"
import { isFeaturedAndActive } from "@/lib/featured"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
const LOCAL_PROFILE_KEY = "caterbids_profile"
const LOCAL_LISTINGS_KEY = "caterbids_listings"
const LOCAL_PUBLIC_LISTINGS_KEY = "caterbids_public_listings"
const LOCAL_CURRENT_LISTING_KEY = "caterbids_current_listing"
const ACCOUNT_ADMIN_ROLES = new Set(["owner", "admin", "super_admin"])

const ukDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/London",
})

function formatUKDate(date?: string | null) {
  if (!date) return "Recent"

  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return "Recent"

  return ukDateFormatter.format(parsedDate)
}

function localProfileKey(userId: string) {
  return `${LOCAL_PROFILE_KEY}:${userId}`
}

function itemOwnerId(item: unknown) {
  if (!item || typeof item !== "object") return ""
  const value = (item as { user_id?: unknown; userId?: unknown }).user_id ?? (item as { userId?: unknown }).userId
  return String(value ?? "")
}

function isLegacyLocalListing(item: unknown) {
  const ownerId = itemOwnerId(item)
  return !ownerId || ownerId === "local"
}

function readLocalArray(key: string) {
  try {
    const savedValue = localStorage.getItem(key)
    if (!savedValue) return []
    const parsed = JSON.parse(savedValue) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn(`Could not read ${key}:`, error)
    if (key === "caterbids_listings") {
      localStorage.removeItem(key)
    }
    return []
  }
}

interface AccountClientProps {
  profile: Profile
  userEmail: string
  authEmailVerified: boolean
  createdAt: string | null
  userId: string
  stats: Array<{
    label: string
    value: number
  }>
}

export default function AccountClient({
  profile,
  userEmail,
  authEmailVerified,
  createdAt,
  userId,
  stats,
}: AccountClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [displayProfile, setDisplayProfile] = useState(profile)
  const [displayStats, setDisplayStats] = useState(stats)
  const [loggingOut, setLoggingOut] = useState(false)
  const [legacyListingCount, setLegacyListingCount] = useState(0)
  const [phoneInput, setPhoneInput] = useState(profile.phone_number || profile.phone || "")
  const [emailAuthVerified, setEmailAuthVerified] = useState(authEmailVerified)
  const [verificationMessage, setVerificationMessage] = useState("")
  const [verificationError, setVerificationError] = useState("")
  const [verificationBusy, setVerificationBusy] = useState<"" | "email" | "phone">("")
  const profileTrust = displayProfile as Profile & {
    is_email_verified?: boolean | null
    is_phone_verified?: boolean | null
    verified_user_badge?: boolean | null
  }
  const emailVerified = emailAuthVerified
  const phoneVerified = Boolean(displayProfile.phone_verified || profileTrust.is_phone_verified)
  const sellerVerified =
    displayProfile.seller_verification_level === "verified" ||
    displayProfile.seller_verification_level === "business_verified" ||
    Boolean(displayProfile.business_verified || displayProfile.government_id_verified)
  const showAdminLink = ACCOUNT_ADMIN_ROLES.has(String(displayProfile.role || ""))
  const verifiedBadgeText =
    emailVerified && phoneVerified
      ? "Verified User"
      : emailVerified
        ? "Email Verified"
        : "Basic"
  const accountVerificationLabel = emailVerified && phoneVerified ? "Verified User" : emailVerified ? "Email Verified" : "Basic"
  const trustSummary = buildSellerTrustSummary({
    emailVerified,
    phoneVerified,
    idVerified: Boolean(displayProfile.government_id_verified),
    businessVerified: Boolean(displayProfile.business_verified),
    stripeConnected: Boolean(displayProfile.stripe_connect_onboarding_complete),
    createdAt,
  })
  const publishedState = searchParams.get("published")
  const publishedListingId = searchParams.get("listing")
  const showPublishedNotice = Boolean(publishedState)

  useEffect(() => {
    queueMicrotask(() => {
      const savedLocalProfile =
        localStorage.getItem(localProfileKey(userId)) ||
        localStorage.getItem(LOCAL_PROFILE_KEY)
      const savedListings = readLocalArray(LOCAL_LISTINGS_KEY)
      const savedFavourites = readLocalArray("caterbids_favourites")
      const ownedListings = savedListings.filter((item) => itemOwnerId(item) === userId)
      const ownedFavourites = savedFavourites.filter((item) => itemOwnerId(item) === userId)
      const legacyListings = savedListings.filter(isLegacyLocalListing)

      setLegacyListingCount(legacyListings.length)

      if (ownedListings.length > 0) {
        setDisplayStats((currentStats) =>
          currentStats.map((stat) =>
            stat.label === "Active Listings"
              ? { ...stat, value: Math.max(stat.value, ownedListings.length) }
              : stat
          )
        )
      }

      if (ownedFavourites.length > 0) {
        setDisplayStats((currentStats) =>
          currentStats.map((stat) =>
            stat.label === "Saved Items"
              ? { ...stat, value: Math.max(stat.value, ownedFavourites.length) }
              : stat
          )
        )
      }

      if (!savedLocalProfile) return

      try {
        const localProfile = JSON.parse(savedLocalProfile) as Partial<Profile>
        const {
          verified,
          email_verified,
          is_email_verified,
          phone_verified,
          is_phone_verified,
          verified_user_badge,
          verification_level,
          badge,
          ...safeLocalProfile
        } = localProfile as Partial<Profile> & {
          is_email_verified?: boolean | null
          is_phone_verified?: boolean | null
        }
        setDisplayProfile((currentProfile) => ({
          ...currentProfile,
          ...safeLocalProfile,
        }))
      } catch (error) {
        console.error("Failed to load local profile:", error)
      }
    })
  }, [userId])

  useEffect(() => {
    if (!userId || userId === "local-beta-preview") return

    let cancelled = false

    async function syncAccountVerification() {
      try {
        const response = await fetch("/api/verification/sync-email-status", { method: "POST" })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || !result.ok || cancelled) return

        setEmailAuthVerified(Boolean(result.emailVerified))
        setDisplayProfile((current) => ({
          ...current,
          email_verified: Boolean(result.emailVerified),
          is_email_verified: Boolean(result.emailVerified),
          verified: Boolean(result.emailVerified),
          verified_user_badge: Boolean(result.emailVerified && result.phoneVerified),
          badge: result.badge || (result.emailVerified ? "Email Verified" : "Email pending"),
          verification_level: result.verificationLevel || (result.emailVerified ? "email_verified" : "basic"),
        }))
      } catch (error) {
        console.warn("Account verification sync skipped:", error)
      }
    }

    syncAccountVerification()

    return () => {
      cancelled = true
    }
  }, [userId])

  type SellerListing = { id: string; title: string; featured: boolean | null; is_featured: boolean | null; featured_until: string | null }
  const [sellerListings, setSellerListings] = useState<SellerListing[]>([])

  useEffect(() => {
    if (!userId || userId === "local-beta-preview") return
    const supabase = createClient()
    supabase
      .from("listings" as never)
      .select("id, title, featured, is_featured, featured_until")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setSellerListings(data as SellerListing[])
      })
  }, [userId])

  async function sendEmailVerification() {
    if (!userEmail) {
      setVerificationError("Email address not found.")
      return
    }

    setVerificationBusy("email")
    setVerificationError("")
    setVerificationMessage("")

    try {
      const supabase = createClient()
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: userEmail.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/account`,
        },
      })

      if (error) throw error
      setVerificationMessage("Check your email. Your CaterBidsUK verification link expires soon.")
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Could not send verification email.")
    } finally {
      setVerificationBusy("")
    }
  }

  async function savePhoneNumberForManualReview() {
    setVerificationBusy("phone")
    setVerificationError("")
    setVerificationMessage("")

    try {
      const response = await fetch("/api/account/save-phone-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneInput }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not save mobile number.")
      if (result.phone) {
        setPhoneInput(result.phone)
      }
      setDisplayProfile((current) => ({
        ...current,
        phone: result.phone || phoneInput,
        phone_number: result.phone || phoneInput,
        phone_verified: false,
        is_phone_verified: false,
        phone_verified_at: null,
        phone_verification_method: "manual",
        phone_verification_status: "pending",
      }))
      setVerificationMessage(result.message || "Phone verification is reviewed manually during launch.")
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Could not save mobile number.")
    } finally {
      setVerificationBusy("")
    }
  }

  async function handleLogout() {
    setLoggingOut(true)

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      await fetch("/api/logout", { method: "POST" })
      localStorage.removeItem("caterbids_settings")
      router.replace("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
      setLoggingOut(false)
    }
  }

  function recoverLegacyListings() {
    const listings = readLocalArray(LOCAL_LISTINGS_KEY)
    const recoveredListings = listings.map((item) =>
      isLegacyLocalListing(item)
        ? { ...(item as Record<string, unknown>), user_id: userId }
        : item
    )
    const recoveredCount = recoveredListings.filter((item) => itemOwnerId(item) === userId).length
    const currentListing = (() => {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_CURRENT_LISTING_KEY) || "null")
      } catch {
        return null
      }
    })()

    localStorage.setItem(LOCAL_LISTINGS_KEY, JSON.stringify(recoveredListings))
    localStorage.setItem(LOCAL_PUBLIC_LISTINGS_KEY, JSON.stringify(recoveredListings))

    if (isLegacyLocalListing(currentListing)) {
      localStorage.setItem(
        LOCAL_CURRENT_LISTING_KEY,
        JSON.stringify({ ...(currentListing as Record<string, unknown>), user_id: userId })
      )
    }

    setLegacyListingCount(0)
    setDisplayStats((currentStats) =>
      currentStats.map((stat) =>
        stat.label === "Active Listings"
          ? { ...stat, value: Math.max(stat.value, recoveredCount) }
          : stat
      )
    )
  }

  return (
    <main className="app-bg min-h-screen px-4 pb-10 text-white">
      {/* TOP NAV */}
      <header className="bottom-nav sticky top-0 z-50 -mx-4 mb-5 px-4 py-3">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="soft-button flex items-center gap-1 rounded-2xl px-3 py-2 text-sm"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <Link href="/" className="text-center">
            <h1 className="text-lg font-black">
              Cater<span className="text-[#FF6B00]">Bids</span>.UK
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-[#FF6B00]">
              BUY • SELL • SAVE
            </p>
          </Link>

          <Link
            href="/"
            className="soft-button flex items-center gap-1 rounded-2xl px-3 py-2 text-sm"
          >
            <Home size={18} />
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-5">
        {/* TITLE */}
        <section>
          <h2 className="text-2xl font-black">Account</h2>
          <p className="text-sm text-white/60">Listings, orders and saved items.</p>
        </section>

        {showPublishedNotice && (
          <section className="rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-emerald-100">
                  {publishedState === "existing" ? "Listing already published" : "Listing published"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-emerald-100/75">
                  Your item is live. Manage it from your CaterBidsUK account.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/listing"
                    className="rounded-2xl bg-[#FF6B00] px-4 py-2 text-center text-sm font-black text-white"
                  >
                    My listings
                  </Link>
                  {publishedListingId && (
                    <Link
                      href={`/listing?id=${encodeURIComponent(publishedListingId)}`}
                      className="rounded-2xl border border-white/15 bg-white/8 px-4 py-2 text-center text-sm font-black text-white"
                    >
                      View public listing
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PROFILE CARD */}
        <section className="premium-shell rounded-[2rem] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10">
              {displayProfile.avatar_url ? (
                <img
                  src={displayProfile.avatar_url}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle className="h-10 w-10 text-white/50" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-black">
                {displayProfile.name || "Not added yet"}
              </h3>
              <p className="truncate text-sm text-white/60">
                {displayProfile.business || "No business name"}
              </p>

              <div
                className="premium-badge mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold"
                title={
                  emailVerified && phoneVerified
                    ? "This account has verified email ownership and a UK mobile number."
                    : emailVerified
                      ? "This account has verified email ownership."
                      : "Verify email and phone to build trust."
                }
              >
                <ShieldCheck size={14} />
                {verifiedBadgeText}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-white/75">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-[#FF6B00]" />
              <span className="truncate">{userEmail}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#FF6B00]" />
              <span>{displayProfile.location || "Location not added"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Phone size={16} className="text-[#FF6B00]" />
              <span>{displayProfile.phone || "Phone not added"}</span>
            </div>
          </div>

          <Link
            href="/settings"
            className="premium-button mt-5 block rounded-2xl py-3 text-center font-black text-white"
          >
            Edit Profile
          </Link>
        </section>

        <section className="premium-card rounded-[2rem] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#FF6B00]/15 p-3 text-[#FF9A4A]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF6B00]">
                Account verification
              </p>
              <h3 className="mt-1 text-lg font-black">Build trust on CaterBidsUK</h3>
              <p className="mt-1 text-sm leading-6 text-white/65">
                Verify your email and phone number to build trust on CaterBidsUK.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black">Email</p>
                  <p className="mt-1 text-xs text-white/55">{userEmail || "Email not available"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${
                  emailVerified ? "bg-emerald-500/15 text-emerald-300" : "bg-orange-500/15 text-orange-200"
                }`}>
                  {emailVerified ? "Verified" : "Not verified"}
                </span>
              </div>
              {!emailVerified && (
                <button
                  type="button"
                  onClick={sendEmailVerification}
                  disabled={verificationBusy === "email"}
                  className="premium-button mt-3 w-full rounded-2xl px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {verificationBusy === "email" ? "Sending..." : "Resend verification email"}
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black">Phone</p>
                  <p className="mt-1 text-xs text-white/55">
                    {phoneVerified ? "Phone verified." : "Phone pending admin verification."}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${
                  phoneVerified ? "bg-emerald-500/15 text-emerald-300" : "bg-orange-500/15 text-orange-200"
                }`}>
                  {phoneVerified ? "Phone verified" : "Phone pending verification"}
                </span>
              </div>

              {!phoneVerified && (
                <div className="mt-3 space-y-3">
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-white/65">
                    Phone verification is reviewed manually during launch.
                  </p>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(event) => setPhoneInput(event.target.value)}
                    placeholder="+447700900123"
                    className="premium-input w-full rounded-2xl px-4 py-3 text-white placeholder-white/40"
                  />
                  <button
                    type="button"
                    onClick={savePhoneNumberForManualReview}
                    disabled={verificationBusy === "phone"}
                    className="soft-button w-full rounded-2xl px-4 py-3 text-sm font-black disabled:opacity-60"
                  >
                    {verificationBusy === "phone" ? "Saving..." : "Save mobile number"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {(verificationMessage || verificationError) && (
            <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${
              verificationError
                ? "border border-red-400/30 bg-red-500/10 text-red-100"
                : "border border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
            }`}>
              {verificationError || verificationMessage}
            </p>
          )}

          <div className="mt-4 rounded-2xl bg-white/5 p-4">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-white/65">
              <span>Badge progress</span>
              <span className="text-[#FF9A4A]">{accountVerificationLabel}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#FF6B00]"
                style={{ width: `${emailVerified && phoneVerified ? 100 : emailVerified ? 55 : 15}%` }}
              />
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="grid grid-cols-2 gap-3">
          {displayStats.map((stat) => (
            <div
              key={stat.label}
              className="premium-card rounded-3xl p-4 text-center"
            >
              <div className="text-2xl font-black text-[#FF6B00]">
                {stat.value}
              </div>
              <div className="mt-1 text-xs font-bold uppercase tracking-wide text-white/50">
                {stat.label}
              </div>
            </div>
          ))}
        </section>

        {/* BIG SELL BUTTON */}
        {legacyListingCount > 0 && (
          <section className="rounded-3xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 p-4">
            <h3 className="text-base font-black text-orange-100">Restore listings</h3>
            <p className="mt-1 text-sm text-orange-100/75">
              {legacyListingCount} older listing{legacyListingCount === 1 ? "" : "s"} found.
            </p>
            <button
              type="button"
              onClick={recoverLegacyListings}
              className="premium-button mt-3 w-full rounded-2xl px-4 py-3 text-sm font-black"
            >
              Restore to this account
            </button>
          </section>
        )}

        {/* BIG SELL BUTTON */}
        <Link
          href="/post-listing"
          className="premium-button flex items-center justify-center gap-3 rounded-3xl py-5 text-lg font-black text-white"
        >
          <Plus size={24} />
          Sell an item
        </Link>

        <section className="premium-card rounded-[2rem] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#FF6B00]/15 p-3 text-[#FF9A4A]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF6B00]">
                Trust profile
              </p>
              <h3 className="mt-1 text-lg font-black">Build buyer confidence</h3>
              <p className="mt-1 text-sm leading-6 text-white/65">
                {trustSummary.progressText}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#FF6B00]"
                  style={{ width: `${trustSummary.progressPercent}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {trustSummary.badges.length > 0 ? (
                  trustSummary.badges.map((badge) => (
                    <span
                      key={badge.key}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/80"
                      title={badge.description}
                    >
                      {badge.label}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/60">
                    Verification in progress
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {!sellerVerified && (
          <section className="rounded-3xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#FF9A4A]" />
              <div>
                <h3 className="text-base font-black text-orange-100">Verified Seller</h3>
                <p className="mt-1 text-sm leading-6 text-orange-100/80">
                  Verify your seller profile to unlock payouts, increase buyer trust and earn your Verified Seller badge.
                </p>
                <Link
                  href="/settings"
                  className="mt-3 inline-flex rounded-2xl bg-[#FF6B00] px-4 py-2 text-sm font-black text-white"
                >
                  Start verification
                </Link>
              </div>
            </div>
          </section>
        )}

        {sellerListings.length > 0 && (
          <section className="premium-card rounded-[2rem] p-5">
            <h3 className="mb-4 text-lg font-black">Your Listings</h3>
            <div className="space-y-2">
              {sellerListings.map((item) => {
                const active = isFeaturedAndActive(item as Record<string, unknown>)
                return (
                  <a
                    key={item.id}
                    href={`/listing?id=${encodeURIComponent(item.id)}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/8"
                  >
                    <span className="min-w-0 flex-1 truncate font-bold text-white">{item.title}</span>
                    {active ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full border-2 border-[#FF6B00] bg-[#0a2a4a] px-2 py-1 shadow-[0_0_8px_rgba(255,107,0,0.3)]">
                        <Bell size={9} className="fill-[#FF6B00] text-[#FF6B00]" />
                        <span className="text-[10px] font-black uppercase leading-none text-white">Featured</span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px] font-bold text-[#FF6B00]/70">Feature this →</span>
                    )}
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {/* QUICK ACTIONS */}
        <section className="premium-card rounded-[2rem] p-5">
          <h3 className="mb-4 text-lg font-black">Quick Actions</h3>

          <div className="grid grid-cols-2 gap-3">
            <ActionCard
              href="/settings"
              icon={<Settings size={20} />}
              title="Edit Profile"
            />
            <ActionCard
              href="/listing"
              icon={<LayoutGrid size={20} />}
              title="My Listings"
            />
            <ActionCard
              href="/favourites"
              icon={<Heart size={20} />}
              title="Favourites"
            />
            <ActionCard
              href="/saved-searches"
              icon={<Search size={20} />}
              title="Saved Searches"
            />
            <ActionCard
              href="/messages"
              icon={<MessageCircle size={20} />}
              title="Messages"
            />
            <ActionCard
              href="/account/orders"
              icon={<PackageCheck size={20} />}
              title="Orders"
            />
            <ActionCard
              href="/account/reviews"
              icon={<Star size={20} />}
              title="My Reviews"
            />
            {showAdminLink && (
              <ActionCard
                href="/admin"
                icon={<ShieldCheck size={20} />}
                title="Admin"
              />
            )}
          </div>
        </section>

        {/* ACCOUNT STATUS */}
        <section className="premium-card rounded-[2rem] p-5">
          <h3 className="mb-4 text-lg font-black">Account Status</h3>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-white/60">Plan</span>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-bold text-emerald-400">
                Free
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-white/60">Verification</span>
              <span className="rounded-full bg-orange-500/15 px-3 py-1 font-bold text-orange-400">
                {emailVerified ? displayProfile.verification_level || "basic" : "Pending"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-white/60">Member Since</span>
              <span className="font-bold">
                {formatUKDate(createdAt)}
              </span>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="soft-button flex w-full items-center justify-center gap-3 rounded-3xl px-5 py-4 text-sm font-black text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={20} />
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </div>
    </main>
  )
}

function ActionCard({
  href,
  icon,
  title,
}: {
  href: string
  icon: React.ReactNode
  title: string
}) {
  return (
    <Link
      href={href}
      className="premium-card-hover flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-5 text-center text-sm font-bold text-white/80 hover:text-white"
    >
      <div className="text-[#FF6B00]">{icon}</div>
      {title}
    </Link>
  )
}
