/* eslint-disable @next/next/no-img-element */
"use client"

import Link from "next/link"
import SiteLogo from "@/components/SiteLogo"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Home,
  Heart,
  Loader2,
  Menu,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Send,
  UserCircle,
  X,
} from "lucide-react"

import { getCurrentUser } from "@/lib/supabase/auth"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/supabase"

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"]
type ListingRow = Database["public"]["Tables"]["listings"]["Row"]
type MessageRow = Database["public"]["Tables"]["messages"]["Row"]
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

type FilterKey = "all" | "unread" | "whatsapp"
type SortKey = "newest" | "oldest" | "unread"

type InboxConversation = ConversationRow & {
  listing: ListingRow | null
  otherProfile: ProfileRow | null
  otherUserId: string | null
  unreadTotal: number
}

type MessagesClientProps = {
  initialConversationId?: string
  mobileThreadMode?: boolean
}

const WHATSAPP_CONNECTED = process.env.NEXT_PUBLIC_WHATSAPP_MESSAGING_ENABLED === "true"
const MESSAGE_MAX_LENGTH = 2000

function isUuid(value?: string | null) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function formatTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  }

  if (messageDate.getTime() === yesterday.getTime()) return "Yesterday"

  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
}

function formatFullTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPrice(value?: string | null) {
  if (!value) return "Price not added"
  const cleaned = value.trim()
  if (!cleaned) return "Price not added"
  return cleaned.startsWith("£") ? cleaned : `£${cleaned}`
}

function messageText(message: MessageRow) {
  return (message.message_text || message.body || "").trim()
}

function conversationDate(conversation: ConversationRow) {
  return conversation.last_message_at || conversation.updated_at || conversation.created_at
}

function listingImages(listing?: ListingRow | null) {
  if (!listing) return [] as string[]
  if (Array.isArray(listing.images) && listing.images.length > 0) {
    return listing.images.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  }
  return listing.image_url ? [listing.image_url] : []
}

function conversationImage(conversation: InboxConversation) {
  return listingImages(conversation.listing)[0] || conversation.participant_avatar || ""
}

function conversationTitle(conversation: InboxConversation) {
  return conversation.listing?.title || conversation.listing_title || "Listing enquiry"
}

function profileName(profile?: ProfileRow | null) {
  if (!profile) return ""
  return profile.business || profile.full_name || profile.name || profile.email?.split("@")[0] || ""
}

function participantName(conversation: InboxConversation, currentUserId: string | null) {
  const profile = profileName(conversation.otherProfile)
  if (profile) return profile

  if (conversation.participant_name && conversation.participant_name.toLowerCase() !== "seller") {
    return conversation.participant_name
  }

  if (currentUserId && conversation.buyer_id === currentUserId) return "Seller"
  return "Buyer enquiry"
}

function participantSummary(conversation: InboxConversation, currentUserId: string | null) {
  const name = participantName(conversation, currentUserId)
  const location = conversation.otherProfile?.location || conversation.listing?.city || conversation.listing?.location || ""
  return location ? `${name} from ${location}` : name
}

function isSellerVerified(profile?: ProfileRow | null) {
  if (!profile) return false
  const verificationLevel = `${profile.seller_verification_level || profile.verification_level || ""}`.toLowerCase()
  return Boolean(
    profile.verified_user_badge ||
      verificationLevel === "verified" ||
      verificationLevel === "full" ||
      ((profile.verified || profile.business_verified || profile.government_id_verified) &&
        (profile.business_verified || profile.government_id_verified))
  )
}

function platformIsWhatsApp(conversation: ConversationRow) {
  return (conversation.platform || "").toLowerCase() === "whatsapp"
}

function platformIsInternal(conversation: ConversationRow) {
  return !platformIsWhatsApp(conversation) && (conversation.platform || "caterbids").toLowerCase() !== "ebay"
}

function sortConversations(items: InboxConversation[], sort: SortKey) {
  return [...items].sort((a, b) => {
    if (sort === "unread") {
      const unreadDifference = b.unreadTotal - a.unreadTotal
      if (unreadDifference !== 0) return unreadDifference
    }

    const aTime = new Date(conversationDate(a) || 0).getTime()
    const bTime = new Date(conversationDate(b) || 0).getTime()
    return sort === "oldest" ? aTime - bTime : bTime - aTime
  })
}

function otherUserId(conversation: ConversationRow, currentUserId: string | null) {
  if (!currentUserId) return null
  if (conversation.buyer_id === currentUserId) return conversation.seller_id
  if (conversation.seller_id === currentUserId) return conversation.buyer_id
  return conversation.buyer_id || conversation.seller_id
}


function SearchHeaderForm({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("")
  const router = useRouter()

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`)
  }

  return (
    <form
      onSubmit={submitSearch}
      className={`flex min-w-0 items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.07] px-4 text-white shadow-inner shadow-black/10 focus-within:border-[#FF6B00]/70 ${
        compact ? "h-11" : "h-12"
      }`}
    >
      <Search className="h-5 w-5 shrink-0 text-white/70" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search catering equipment, spare parts..."
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/45"
      />
    </form>
  )
}

function DesktopHeader() {
  return (
    <header className="hidden border-b border-white/10 bg-[#061F3B]/95 px-6 py-4 lg:block">
      <div className="mx-auto flex max-w-[1500px] items-center gap-8">
        <Link href="/"><SiteLogo size="sm" priority /></Link>
        <div className="min-w-[360px] max-w-[520px] flex-1">
          <SearchHeaderForm />
        </div>
        <nav className="ml-auto flex items-center gap-6 text-sm font-black text-white">
          <Link href="/post-listing" className="transition hover:text-[#FF6B00]">
            Sell
          </Link>
          <Link href="/favourites" className="inline-flex items-center gap-2 transition hover:text-[#FF6B00]">
            <Heart className="h-5 w-5" />
            Saved
          </Link>
          <Link href="/messages" className="relative inline-flex items-center gap-2 pb-2 text-white">
            <MessageSquare className="h-5 w-5 text-[#FF6B00]" />
            Messages
            <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-[#FF6B00]" />
          </Link>
          <Link href="/account" className="inline-flex items-center gap-2 transition hover:text-[#FF6B00]">
            <UserCircle className="h-5 w-5" />
            Account
          </Link>
          <Link
            href="/post-listing"
            className="rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#ff7f24]"
          >
            Sell for free
          </Link>
        </nav>
      </div>
    </header>
  )
}

function MobileTopBar({
  unreadCount,
  onCompose,
}: {
  unreadCount: number
  onCompose: () => void
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#061F3B]/95 px-4 py-4 backdrop-blur lg:hidden">
      <div className="grid grid-cols-[44px_1fr_44px] items-center">
        <Link
          href="/account"
          aria-label="Open account menu"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.07] text-white"
        >
          <Menu className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <p className="text-lg font-black text-white">Messages</p>
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.26em] text-[#FF6B00]">
            Buy • Sell • Save
          </p>
        </div>
        <button
          type="button"
          onClick={onCompose}
          aria-label="New message"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.07] text-white"
        >
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#FF6B00] px-1 text-[10px] font-black text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  )
}

function CountBadge({ count, orange = false }: { count?: number; orange?: boolean }) {
  if (!count) return null
  return (
    <span
      className={`grid h-6 min-w-6 place-items-center rounded-full px-2 text-xs font-black ${
        orange ? "bg-[#FF6B00] text-white" : "bg-[#123F6B] text-blue-100"
      }`}
    >
      {count}
    </span>
  )
}

function FilterButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black transition ${
        active ? "bg-white/[0.08] text-white" : "text-white/80 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {active ? <span className="absolute left-0 top-2 h-[calc(100%-1rem)] w-1 rounded-full bg-[#FF6B00]" /> : null}
      <span className={active ? "text-[#FF6B00]" : "text-white/75"}>{icon}</span>
      <span className="flex-1">{label}</span>
      <CountBadge count={count} orange={active} />
    </button>
  )
}

function MessagesSidebar({
  filter,
  counts,
  onFilter,
  onCompose,
  onWhatsApp,
}: {
  filter: FilterKey
  counts: { all: number; unread: number; whatsapp: number }
  onFilter: (value: FilterKey) => void
  onCompose: () => void
  onWhatsApp: () => void
}) {
  return (
    <aside className="hidden w-[250px] shrink-0 lg:block">
      <button
        type="button"
        onClick={onCompose}
        className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-4 text-sm font-black text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#ff7f24]"
      >
        <Plus className="h-5 w-5" />
        New message
      </button>

      <div className="space-y-2 border-b border-white/10 pb-6">
        <FilterButton
          active={filter === "all"}
          icon={<MessageSquare className="h-5 w-5" />}
          label="All messages"
          count={counts.all}
          onClick={() => onFilter("all")}
        />
        <FilterButton
          active={filter === "unread"}
          icon={<MessageCircle className="h-5 w-5" />}
          label="Unread"
          count={counts.unread}
          onClick={() => onFilter("unread")}
        />
        <FilterButton
          active={filter === "whatsapp"}
          icon={<MessageCircle className="h-5 w-5" />}
          label="WhatsApp"
          count={WHATSAPP_CONNECTED ? counts.whatsapp : undefined}
          onClick={() => onFilter("whatsapp")}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-5">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
          <MessageCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-black leading-tight text-white">Connect with buyers instantly</h2>
        <p className="mt-3 text-sm leading-6 text-blue-100/80">
          Use WhatsApp to continue conversations quickly and easily.
        </p>
        <button
          type="button"
          onClick={onWhatsApp}
          className="mt-5 w-full rounded-xl border border-white/14 px-4 py-3 text-sm font-black text-white transition hover:border-[#FF6B00]/60 hover:text-[#FF6B00]"
        >
          {WHATSAPP_CONNECTED ? "Connect WhatsApp" : "Coming Soon"}
        </button>
      </div>

      <div className="mt-8 text-blue-100/80">
        <h2 className="text-base font-black text-white">Need help?</h2>
        <p className="mt-3 text-sm leading-6">Visit our help centre for messaging support.</p>
        <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#FF6B00]">
          Help centre <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  )
}

function MessageTabs({
  filter,
  counts,
  onFilter,
  mobile = false,
}: {
  filter: FilterKey
  counts: { all: number; unread: number; whatsapp: number }
  onFilter: (value: FilterKey) => void
  mobile?: boolean
}) {
  const items: { key: FilterKey; label: string; count?: number }[] = [
    { key: "all", label: mobile ? "All" : "All" },
    { key: "unread", label: "Unread", count: counts.unread },
    { key: "whatsapp", label: "WhatsApp", count: WHATSAPP_CONNECTED ? counts.whatsapp : undefined },
  ]

  if (mobile) {
    return (
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 pt-4">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onFilter(item.key)}
            aria-pressed={filter === item.key}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${
              filter === item.key ? "bg-[#FF6B00] text-white" : "bg-white/[0.08] text-blue-100"
            }`}
          >
            {item.label}
            {item.count ? <span className="ml-1">{item.count}</span> : null}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-8 border-b border-white/10 px-5 pt-4">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onFilter(item.key)}
          aria-pressed={filter === item.key}
          className={`relative pb-4 text-sm font-black transition ${
            filter === item.key ? "text-[#FF6B00]" : "text-white/80 hover:text-white"
          }`}
        >
          {item.label}
          {item.count ? <span className="ml-2 rounded-full bg-[#123F6B] px-2 py-1 text-xs text-blue-100">{item.count}</span> : null}
          {filter === item.key ? <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-[#FF6B00]" /> : null}
        </button>
      ))}
    </div>
  )
}

function ListingThumb({
  conversation,
  size = "desktop",
}: {
  conversation: InboxConversation
  size?: "desktop" | "mobile"
}) {
  const image = conversationImage(conversation)
  const title = conversationTitle(conversation)
  const classes = size === "mobile" ? "h-16 w-16 rounded-xl" : "h-20 w-20 rounded-xl"

  if (image) {
    return (
      <img
        src={image}
        alt={title}
        className={`${classes} shrink-0 border border-white/10 object-cover`}
        loading="lazy"
      />
    )
  }

  return (
    <div className={`${classes} grid shrink-0 place-items-center border border-white/10 bg-white/[0.06] text-white/55`}>
      <Bell className="h-7 w-7 text-[#FF6B00]" />
    </div>
  )
}

function ConversationCard({
  conversation,
  currentUserId,
  selected,
  onOpen,
  mobile = false,
}: {
  conversation: InboxConversation
  currentUserId: string | null
  selected: boolean
  onOpen: () => void
  mobile?: boolean
}) {
  const title = conversationTitle(conversation)
  const summary = participantSummary(conversation, currentUserId)
  const preview = conversation.last_message || "No messages yet"

  if (mobile) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left shadow-lg shadow-black/10 transition hover:border-[#FF6B00]/50"
      >
        <ListingThumb conversation={conversation} size="mobile" />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-black leading-tight text-white">{title}</span>
          <span className="mt-1 block truncate text-xs font-semibold text-blue-100/75">{summary}</span>
          <span className="mt-1 block truncate text-xs text-blue-100/65">{preview}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-[11px] text-blue-100/65">{formatTime(conversationDate(conversation))}</span>
          <CountBadge count={conversation.unreadTotal} orange />
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition ${
        selected
          ? "border-[#FF6B00]/55 bg-[#0B3760]"
          : "border-white/10 bg-white/[0.04] hover:border-[#FF6B00]/35 hover:bg-white/[0.07]"
      }`}
    >
      <ListingThumb conversation={conversation} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-base font-black text-white">{title}</span>
        <span className="mt-1 block truncate text-sm font-semibold text-blue-100/80">{summary}</span>
        <span className="mt-1 block truncate text-sm text-blue-100/65">{preview}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-5">
        <span className="text-xs text-blue-100/65">{formatTime(conversationDate(conversation))}</span>
        <CountBadge count={conversation.unreadTotal} orange />
      </span>
    </button>
  )
}

function EmptyListState({
  filter,
  onBackToMessages,
}: {
  filter: FilterKey
  onBackToMessages: () => void
}) {
  if (filter === "whatsapp" && !WHATSAPP_CONNECTED) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#25D366]/15 text-[#25D366]">
          <MessageCircle className="h-9 w-9" />
        </div>
        <h2 className="text-xl font-black text-white">WhatsApp messages</h2>
        <p className="mt-3 text-sm leading-6 text-blue-100/75">WhatsApp messaging connection is coming soon.</p>
        <p className="mt-2 text-sm leading-6 text-blue-100/60">
          Continue using secure CaterBids messages for enquiries.
        </p>
        <button
          type="button"
          onClick={onBackToMessages}
          className="mt-6 rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-black text-white"
        >
          Back to CaterBids Messages
        </button>
      </div>
    )
  }

  if (filter === "unread") {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-[#FF6B00]" />
        <h2 className="text-xl font-black text-white">No unread messages</h2>
        <p className="mt-3 text-sm text-blue-100/75">You’re all caught up.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center">
      <MessageSquare className="mx-auto mb-4 h-12 w-12 text-[#FF6B00]" />
      <h2 className="text-xl font-black text-white">No messages yet</h2>
      <p className="mt-3 text-sm leading-6 text-blue-100/75">Messages from buyers and sellers will appear here.</p>
      <Link
        href="/search"
        className="mt-6 inline-flex rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-black text-white"
      >
        Browse listings
      </Link>
    </div>
  )
}

function ConversationList({
  conversations,
  selectedConversationId,
  currentUserId,
  filter,
  counts,
  sort,
  loading,
  error,
  onFilter,
  onSort,
  onOpen,
  onRetry,
}: {
  conversations: InboxConversation[]
  selectedConversationId?: string
  currentUserId: string | null
  filter: FilterKey
  counts: { all: number; unread: number; whatsapp: number }
  sort: SortKey
  loading: boolean
  error: string
  onFilter: (value: FilterKey) => void
  onSort: (value: SortKey) => void
  onOpen: (conversation: InboxConversation) => void
  onRetry: () => void
}) {
  return (
    <section className="hidden w-[390px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] lg:block">
      <div className="flex items-center justify-between">
        <MessageTabs filter={filter} counts={counts} onFilter={onFilter} />
      </div>
      <div className="flex items-center justify-end gap-3 px-5 py-4 text-sm text-blue-100/75">
        <span>Sort by</span>
        <select
          value={sort}
          onChange={(event) => onSort(event.target.value as SortKey)}
          className="rounded-xl border border-white/12 bg-[#082644] px-3 py-2 font-bold text-white outline-none focus:border-[#FF6B00]"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="unread">Unread first</option>
        </select>
      </div>

      <div className="max-h-[760px] space-y-3 overflow-y-auto px-4 pb-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex animate-pulse gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="h-20 w-20 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-3 py-2">
                <div className="h-3 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
                <div className="h-3 w-2/3 rounded bg-white/10" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-5 text-center">
            <p className="font-black text-white">Unable to load messages.</p>
            <p className="mt-2 text-sm text-red-100/75">{error}</p>
            <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-[#FF6B00] px-4 py-2 text-sm font-black text-white">
              Try again
            </button>
          </div>
        ) : conversations.length > 0 ? (
          conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              currentUserId={currentUserId}
              selected={conversation.id === selectedConversationId}
              onOpen={() => onOpen(conversation)}
            />
          ))
        ) : (
          <EmptyListState filter={filter} onBackToMessages={() => onFilter("all")} />
        )}
      </div>
    </section>
  )
}

function EmptyConversationSelection() {
  return (
    <section className="hidden min-h-[760px] flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] lg:flex">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-8 grid h-24 w-24 place-items-center rounded-[2rem] bg-blue-500/20 text-blue-200 shadow-lg shadow-blue-500/10">
          <MessageSquare className="h-14 w-14" />
        </div>
        <h2 className="text-3xl font-black text-white">Select a conversation</h2>
        <p className="mt-4 text-lg leading-7 text-blue-100/70">
          Choose a message from the list
          <br />
          to view and reply.
        </p>
      </div>
    </section>
  )
}

function ListingMiniCard({ conversation }: { conversation: InboxConversation }) {
  const title = conversationTitle(conversation)
  const price = formatPrice(conversation.listing?.price)
  const image = conversationImage(conversation)

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      {image ? (
        <img src={image} alt={title} className="h-16 w-16 rounded-xl object-cover" />
      ) : (
        <div className="grid h-16 w-16 place-items-center rounded-xl bg-white/10 text-[#FF6B00]">
          <Bell className="h-7 w-7" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-sm font-black text-[#FF6B00]">{price}</p>
      </div>
      {conversation.listing_id ? (
        <Link
          href={`/listing?id=${conversation.listing_id}`}
          className="rounded-xl border border-white/12 px-3 py-2 text-xs font-black text-white hover:border-[#FF6B00]/60 hover:text-[#FF6B00]"
        >
          View Listing
        </Link>
      ) : null}
    </div>
  )
}

function ThreadPanel({
  conversation,
  messages,
  currentUserId,
  loading,
  sending,
  composer,
  error,
  mobile = false,
  onComposer,
  onSend,
  onBack,
}: {
  conversation: InboxConversation
  messages: MessageRow[]
  currentUserId: string | null
  loading: boolean
  sending: boolean
  composer: string
  error: string
  mobile?: boolean
  onComposer: (value: string) => void
  onSend: () => void
  onBack?: () => void
}) {
  const otherName = participantName(conversation, currentUserId)
  const verified = isSellerVerified(conversation.otherProfile)

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden border border-white/10 bg-white/[0.035] ${
        mobile ? "min-h-[calc(100vh-88px)] rounded-none" : "hidden min-h-[760px] flex-1 rounded-2xl lg:flex"
      }`}
    >
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          {mobile && onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to messages"
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/12 bg-white/[0.06] text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-black text-white">{otherName}</h2>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-300/25 bg-green-500/12 px-2 py-1 text-xs font-black text-green-100">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified seller
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-blue-100/70">{conversationTitle(conversation)}</p>
          </div>
        </div>
        <ListingMiniCard conversation={conversation} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center text-blue-100/70">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading conversation...
          </div>
        ) : messages.length > 0 ? (
          messages.map((message) => {
            const mine = message.sender_id === currentUserId
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                    mine ? "bg-[#FF6B00] text-white" : "border border-white/10 bg-white/[0.08] text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">{messageText(message)}</p>
                  <p className={`mt-2 text-[11px] ${mine ? "text-white/75" : "text-blue-100/60"}`}>
                    {formatFullTime(message.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <MessageSquare className="mb-4 h-12 w-12 text-[#FF6B00]" />
            <h3 className="text-xl font-black text-white">No messages yet</h3>
            <p className="mt-2 text-sm text-blue-100/70">Send the first message about this listing.</p>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-4 sm:p-5">
        {error ? (
          <p className="mb-3 rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-100">
            {error}
          </p>
        ) : null}
        <div className="flex items-end gap-3">
          <button
            type="button"
            aria-label="Add attachment"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/[0.06] text-white/80"
            title="Attachments are coming soon"
          >
            <Plus className="h-5 w-5" />
          </button>
          <label className="sr-only" htmlFor="message-composer">
            Write a message
          </label>
          <textarea
            id="message-composer"
            value={composer}
            onChange={(event) => onComposer(event.target.value.slice(0, MESSAGE_MAX_LENGTH))}
            placeholder="Write a message..."
            rows={1}
            className="min-h-12 flex-1 resize-none rounded-2xl border border-white/12 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/45 focus:border-[#FF6B00]"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !composer.trim()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-2 text-right text-[11px] text-blue-100/55">
          {composer.length}/{MESSAGE_MAX_LENGTH}
        </p>
      </div>
    </section>
  )
}

function NewMessageModal({
  open,
  conversations,
  currentUserId,
  onClose,
  onOpenConversation,
}: {
  open: boolean
  conversations: InboxConversation[]
  currentUserId: string | null
  onClose: () => void
  onOpenConversation: (conversation: InboxConversation) => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/12 bg-[#061F3B] p-6 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Start a conversation</h2>
            <p className="mt-3 text-sm leading-6 text-blue-100/75">
              Contact a seller from one of their listings, or continue an existing enquiry.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/12 text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Link
          href="/search"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-5 py-4 text-sm font-black text-white"
        >
          Browse Listings <ChevronRight className="h-4 w-4" />
        </Link>

        {conversations.length > 0 ? (
          <div className="mt-6">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[#FF6B00]">Existing conversations</p>
            <div className="space-y-2">
              {conversations.slice(0, 5).map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => {
                    onOpenConversation(conversation)
                    onClose()
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-left hover:border-[#FF6B00]/45"
                >
                  <ListingThumb conversation={conversation} size="mobile" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm font-black text-white">{conversationTitle(conversation)}</span>
                    <span className="mt-1 block truncate text-xs text-blue-100/65">
                      {participantSummary(conversation, currentUserId)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function WhatsAppModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/12 bg-[#061F3B] p-6 text-center shadow-2xl shadow-black/40">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#25D366]/15 text-[#25D366]">
          <MessageCircle className="h-9 w-9" />
        </div>
        <h2 className="text-2xl font-black text-white">WhatsApp messaging</h2>
        <p className="mt-3 text-sm leading-6 text-blue-100/75">
          WhatsApp connection requires setup before it can be used inside CaterBids.
        </p>
        <p className="mt-3 text-sm leading-6 text-blue-100/60">
          Secure CaterBids messaging is available now for buyer and seller enquiries.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-black text-white"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function MobileBottomNav({ unreadCount }: { unreadCount: number }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#061F3B]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end text-[10px] font-black text-blue-100/75">
        <MobileNavItem href="/" icon={<Home className="h-5 w-5" />} label="Home" />
        <MobileNavItem href="/search" icon={<Search className="h-5 w-5" />} label="Search" />
        <Link href="/post-listing" className="flex flex-col items-center gap-1 text-white" aria-label="Sell">
          <span className="-mt-7 grid h-14 w-14 place-items-center rounded-full bg-[#FF6B00] shadow-lg shadow-[#FF6B00]/35">
            <Plus className="h-7 w-7" />
          </span>
          <span>Sell</span>
        </Link>
        <MobileNavItem href="/favourites" icon={<Heart className="h-5 w-5" />} label="Saved" />
        <MobileNavItem
          href="/messages"
          icon={<MessageSquare className="h-5 w-5" />}
          label="Messages"
          active
          badge={unreadCount}
        />
      </div>
    </nav>
  )
}

function MobileNavItem({
  href,
  icon,
  label,
  active = false,
  badge,
}: {
  href: string
  icon: ReactNode
  label: string
  active?: boolean
  badge?: number
}) {
  return (
    <Link href={href} className={`relative flex flex-col items-center gap-1 ${active ? "text-[#FF6B00]" : "text-blue-100/75"}`}>
      <span className="relative">
        {icon}
        {badge ? (
          <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF6B00] px-1 text-[9px] text-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span>{label}</span>
    </Link>
  )
}

function MobileInbox({
  conversations,
  currentUserId,
  filter,
  counts,
  loading,
  error,
  onFilter,
  onOpen,
  onRetry,
}: {
  conversations: InboxConversation[]
  currentUserId: string | null
  filter: FilterKey
  counts: { all: number; unread: number; whatsapp: number }
  loading: boolean
  error: string
  onFilter: (value: FilterKey) => void
  onOpen: (conversation: InboxConversation) => void
  onRetry: () => void
}) {
  return (
    <main className="pb-28 lg:hidden">
      {filter === "whatsapp" ? (
        <div className="flex items-center gap-3 px-4 pt-5">
          <button
            type="button"
            onClick={() => onFilter("all")}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-white/12 bg-white/[0.07] text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-black text-white">WhatsApp</h1>
        </div>
      ) : (
        <div className="px-4 pt-5">
          <h1 className="text-3xl font-black text-white">Messages</h1>
          <p className="mt-2 text-sm text-blue-100/70">Manage your conversations and enquiries.</p>
        </div>
      )}

      <MessageTabs filter={filter} counts={counts} onFilter={onFilter} mobile />

      <div className="space-y-3 px-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex animate-pulse gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
              <div className="h-16 w-16 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-3 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
                <div className="h-3 w-2/3 rounded bg-white/10" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-5 text-center">
            <p className="font-black text-white">Unable to load messages.</p>
            <p className="mt-2 text-sm text-red-100/75">{error}</p>
            <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-[#FF6B00] px-4 py-2 text-sm font-black text-white">
              Try again
            </button>
          </div>
        ) : conversations.length > 0 ? (
          conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              currentUserId={currentUserId}
              selected={false}
              mobile
              onOpen={() => onOpen(conversation)}
            />
          ))
        ) : (
          <EmptyListState filter={filter} onBackToMessages={() => onFilter("all")} />
        )}
      </div>
    </main>
  )
}

export default function MessagesClient({ initialConversationId, mobileThreadMode = false }: MessagesClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [conversations, setConversations] = useState<InboxConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<InboxConversation | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [filter, setFilter] = useState<FilterKey>("all")
  const [sort, setSort] = useState<SortKey>("newest")
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [conversationError, setConversationError] = useState("")
  const [messageError, setMessageError] = useState("")
  const [composer, setComposer] = useState("")
  const [sending, setSending] = useState(false)
  const [newMessageModalOpen, setNewMessageModalOpen] = useState(false)
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false)

  const loadMessages = useCallback(
    async (conversation: InboxConversation) => {
      if (!currentUserId || !isUuid(currentUserId)) return

      setLoadingMessages(true)
      setMessageError("")

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })

      if (error) {
        setMessageError(error.message || "Could not load this conversation.")
        setMessages([])
      } else {
        setMessages((data || []) as MessageRow[])
      }

      const { error: readError } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversation.id)
        .eq("recipient_id", currentUserId)
        .eq("is_read", false)

      if (readError) {
        console.warn("Could not mark messages as read:", readError.message)
      }

      setLoadingMessages(false)
    },
    [currentUserId, supabase]
  )

  const loadConversations = useCallback(async () => {
    setConversationError("")
    setLoadingConversations(true)

    const user = await getCurrentUser(supabase)
    setAuthChecked(true)

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(initialConversationId ? `/messages/${initialConversationId}` : "/messages")}`)
      return
    }

    setCurrentUserId(user.id)

    if (!isUuid(user.id)) {
      setConversations([])
      setLoadingConversations(false)
      return
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false })

    if (error) {
      setConversationError(error.message || "Could not load messages.")
      setConversations([])
      setLoadingConversations(false)
      return
    }

    const rows = (data || []) as ConversationRow[]
    const listingIds = Array.from(new Set(rows.map((row) => row.listing_id).filter((id): id is string => Boolean(id))))
    const userIds = Array.from(new Set(rows.map((row) => otherUserId(row, user.id)).filter((id): id is string => Boolean(id))))

    const listingsById = new Map<string, ListingRow>()
    if (listingIds.length > 0) {
      const { data: listingRows, error: listingsError } = await supabase.from("listings").select("*").in("id", listingIds)
      if (listingsError) {
        console.warn("Could not load message listing summaries:", listingsError.message)
      } else {
        for (const listing of (listingRows || []) as ListingRow[]) listingsById.set(listing.id, listing)
      }
    }

    const profilesById = new Map<string, ProfileRow>()
    if (userIds.length > 0) {
      const { data: profileRows, error: profilesError } = await supabase.from("profiles").select("*").in("id", userIds)
      if (profilesError) {
        console.warn("Could not load message participant profiles:", profilesError.message)
      } else {
        for (const profile of (profileRows || []) as ProfileRow[]) profilesById.set(profile.id, profile)
      }
    }

    const unreadByConversation = new Map<string, number>()
    const { data: unreadRows, error: unreadError } = await supabase
      .from("messages")
      .select("conversation_id")
      .eq("recipient_id", user.id)
      .eq("is_read", false)

    if (unreadError) {
      console.warn("Could not load unread counts:", unreadError.message)
    } else {
      for (const row of (unreadRows || []) as Pick<MessageRow, "conversation_id">[]) {
        unreadByConversation.set(row.conversation_id, (unreadByConversation.get(row.conversation_id) || 0) + 1)
      }
    }

    const enriched = rows.map((row) => {
      const participantId = otherUserId(row, user.id)
      return {
        ...row,
        listing: row.listing_id ? listingsById.get(row.listing_id) || null : null,
        otherProfile: participantId ? profilesById.get(participantId) || null : null,
        otherUserId: participantId,
        unreadTotal: unreadByConversation.get(row.id) || 0,
      }
    })

    setConversations(enriched)
    setLoadingConversations(false)

    const requestedId =
      initialConversationId ||
      (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("conversation") || "" : "")

    if (requestedId) {
      const match = enriched.find((conversation) => conversation.id === requestedId)
      if (match) {
        setSelectedConversation(match)
        await loadMessages(match)
      } else if (mobileThreadMode) {
        setMessageError("This conversation could not be found for your account.")
      }
    }
  }, [initialConversationId, loadMessages, mobileThreadMode, router, supabase])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConversations()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadConversations])

  useEffect(() => {
    if (!currentUserId || !isUuid(currentUserId)) return

    const channel = supabase
      .channel(`messages-inbox-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        void loadConversations()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void loadConversations()
        if (selectedConversation) void loadMessages(selectedConversation)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentUserId, loadConversations, loadMessages, selectedConversation, supabase])

  const counts = useMemo(() => {
    const internal = conversations.filter(platformIsInternal)
    const whatsapp = WHATSAPP_CONNECTED ? conversations.filter(platformIsWhatsApp) : []
    return {
      all: internal.length,
      unread: internal.filter((conversation) => conversation.unreadTotal > 0).length,
      whatsapp: whatsapp.length,
    }
  }, [conversations])

  const filteredConversations = useMemo(() => {
    let items = conversations.filter(platformIsInternal)
    if (filter === "unread") items = items.filter((conversation) => conversation.unreadTotal > 0)
    if (filter === "whatsapp") items = WHATSAPP_CONNECTED ? conversations.filter(platformIsWhatsApp) : []
    return sortConversations(items, sort)
  }, [conversations, filter, sort])

  function openConversation(conversation: InboxConversation) {
    if (mobileThreadMode || window.innerWidth < 1024) {
      router.push(`/messages/${conversation.id}`)
      return
    }

    setSelectedConversation(conversation)
    setComposer("")
    router.replace(`/messages?conversation=${conversation.id}`, { scroll: false })
    void loadMessages(conversation)
  }

  async function sendMessageWithBrowserClient(conversation: InboxConversation, text: string) {
    if (!currentUserId || !isUuid(currentUserId)) {
      return "Please sign in with your CaterBids account to send messages."
    }

    const recipientId = conversation.otherUserId
    if (!recipientId) {
      return "This conversation is missing a recipient."
    }

    const now = new Date().toISOString()
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: currentUserId,
      recipient_id: recipientId,
      sender_name: "You",
      body: text,
      message_text: text,
      platform: conversation.platform || "caterbids",
      is_read: false,
      created_at: now,
    })

    if (error) return error.message || "Could not send message."

    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        last_message: text,
        last_message_at: now,
        updated_at: now,
        unread_count: 1,
      })
      .eq("id", conversation.id)

    if (updateError) {
      console.warn("Message sent but conversation summary update failed:", updateError.message)
    }

    return ""
  }

  async function sendMessage() {
    if (!selectedConversation || !currentUserId || !isUuid(currentUserId)) return

    const text = composer.trim()
    if (!text) {
      setMessageError("Write a message before sending.")
      return
    }

    if (text.length > MESSAGE_MAX_LENGTH) {
      setMessageError(`Messages must be ${MESSAGE_MAX_LENGTH} characters or fewer.`)
      return
    }

    setSending(true)
    setMessageError("")

    let sent = false
    let serverError = ""

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: text,
        }),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      sent = response.ok
      serverError = result.error || ""
    } catch (error) {
      serverError = error instanceof Error ? error.message : "Could not send message."
    }

    if (!sent) {
      const browserError = await sendMessageWithBrowserClient(selectedConversation, text)
      if (browserError) {
        setMessageError(serverError ? `${serverError} ${browserError}` : browserError)
        setSending(false)
        return
      }
    }

    setComposer("")
    setSending(false)
    await loadMessages(selectedConversation)
    await loadConversations()
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#04182E] text-white">
        <DesktopHeader />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="mr-3 h-6 w-6 animate-spin text-[#FF6B00]" />
          <span className="text-lg font-black">Loading messages...</span>
        </div>
      </div>
    )
  }

  if (mobileThreadMode && selectedConversation) {
    return (
      <div className="min-h-screen bg-[#04182E] text-white">
        <ThreadPanel
          conversation={selectedConversation}
          messages={messages}
          currentUserId={currentUserId}
          loading={loadingMessages}
          sending={sending}
          composer={composer}
          error={messageError}
          mobile
          onComposer={setComposer}
          onSend={sendMessage}
          onBack={() => router.push("/messages")}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,107,0,0.12),_transparent_34%),linear-gradient(135deg,#04182E_0%,#061F3B_48%,#001A35_100%)] text-white">
      <DesktopHeader />
      <MobileTopBar unreadCount={counts.unread} onCompose={() => setNewMessageModalOpen(true)} />

      <MobileInbox
        conversations={filteredConversations}
        currentUserId={currentUserId}
        filter={filter}
        counts={counts}
        loading={loadingConversations}
        error={conversationError}
        onFilter={setFilter}
        onOpen={openConversation}
        onRetry={loadConversations}
      />

      <main className="mx-auto hidden max-w-[1500px] px-6 py-9 lg:block">
        <div className="mb-8">
          <h1 className="text-5xl font-black tracking-tight text-white">Messages</h1>
          <p className="mt-3 text-lg text-blue-100/75">Manage your conversations and enquiries.</p>
        </div>

        <div className="flex gap-5">
          <MessagesSidebar
            filter={filter}
            counts={counts}
            onFilter={setFilter}
            onCompose={() => setNewMessageModalOpen(true)}
            onWhatsApp={() => setWhatsAppModalOpen(true)}
          />
          <ConversationList
            conversations={filteredConversations}
            selectedConversationId={selectedConversation?.id}
            currentUserId={currentUserId}
            filter={filter}
            counts={counts}
            sort={sort}
            loading={loadingConversations}
            error={conversationError}
            onFilter={setFilter}
            onSort={setSort}
            onOpen={openConversation}
            onRetry={loadConversations}
          />
          {selectedConversation ? (
            <ThreadPanel
              conversation={selectedConversation}
              messages={messages}
              currentUserId={currentUserId}
              loading={loadingMessages}
              sending={sending}
              composer={composer}
              error={messageError}
              onComposer={setComposer}
              onSend={sendMessage}
            />
          ) : (
            <EmptyConversationSelection />
          )}
        </div>
      </main>

      <MobileBottomNav unreadCount={counts.unread} />
      <NewMessageModal
        open={newMessageModalOpen}
        conversations={conversations.filter(platformIsInternal)}
        currentUserId={currentUserId}
        onClose={() => setNewMessageModalOpen(false)}
        onOpenConversation={openConversation}
      />
      <WhatsAppModal open={whatsAppModalOpen} onClose={() => setWhatsAppModalOpen(false)} />
    </div>
  )
}
