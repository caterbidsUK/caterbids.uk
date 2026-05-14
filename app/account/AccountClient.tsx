"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
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
} from "lucide-react"
import type { Database } from "@/types/supabase"
import { createClient } from "@/lib/supabase/client"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
const LOCAL_PROFILE_KEY = "caterbids_profile"
const LOCAL_LISTINGS_KEY = "caterbids_listings"
const LOCAL_PUBLIC_LISTINGS_KEY = "caterbids_public_listings"
const LOCAL_CURRENT_LISTING_KEY = "caterbids_current_listing"

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
  createdAt,
  userId,
  stats,
}: AccountClientProps) {
  const router = useRouter()
  const [displayProfile, setDisplayProfile] = useState(profile)
  const [displayStats, setDisplayStats] = useState(stats)
  const [loggingOut, setLoggingOut] = useState(false)
  const [legacyListingCount, setLegacyListingCount] = useState(0)

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
        setDisplayProfile((currentProfile) => ({
          ...currentProfile,
          ...localProfile,
        }))
      } catch (error) {
        console.error("Failed to load local profile:", error)
      }
    })
  }, [userId])

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

              <div className="premium-badge mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold">
                <ShieldCheck size={14} />
                {displayProfile.verified ? "Verified" : "Not Verified"}
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
                {displayProfile.verified ? "Verified" : "Pending"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-white/60">Member Since</span>
              <span className="font-bold">
                {createdAt ? new Date(createdAt).toLocaleDateString() : "Recent"}
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
