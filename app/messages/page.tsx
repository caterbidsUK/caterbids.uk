"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  PenLine,
  LayoutGrid,
  Tag,
  MessageSquare,
  Package,
  User,
  ChevronRight,
  Send,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"

type Platform =
  | "all"
  | "unread"
  | "whatsapp"
  | "ebay"
  | "caterbids"

type Conversation = {
  id: string
  buyer_id?: string | null
  seller_id?: string | null
  listing_id?: string | null
  platform: string
  participant_name: string
  participant_avatar?: string | null
  listing_title?: string | null
  last_message?: string | null
  last_message_at?: string | null
  unread_count: number
  created_at?: string | null
  updated_at?: string | null
}

type Message = {
  id: string
  conversation_id: string
  sender_id?: string | null
  recipient_id?: string | null
  sender_name?: string | null
  body?: string | null
  message_text?: string | null
  platform: string
  is_read: boolean
  created_at: string
}

const filters: { key: Platform; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "ebay", label: "eBay" },
  { key: "caterbids", label: "CaterBids" },
]

const allowedPlatforms = ["whatsapp", "ebay", "caterbids"]
const LOCAL_CONVERSATIONS_KEY = "caterbids_conversations"
const LOCAL_MESSAGES_KEY = "caterbids_messages"

const platformLabel = (platform?: string) => {
  switch (platform?.toLowerCase()) {
    case "whatsapp":
      return "WhatsApp"
    case "ebay":
      return "eBay"
    default:
      return "CaterBids"
  }
}

const platformColour = (platform?: string) => {
  switch (platform?.toLowerCase()) {
    case "whatsapp":
      return "bg-green-500 text-white"
    case "ebay":
      return "bg-white text-slate-900"
    default:
      return "bg-[#FF6B00] text-white"
  }
}

function logSupabaseMessagesError(error: unknown) {
  console.warn("Supabase messages warning:", error)
}

function timeLabel(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  }

  return date.toLocaleDateString([], { day: "2-digit", month: "short" })
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function PlatformIcon({ platform }: { platform: string }) {
  return (
    <span className={`${platformColour(platform)} rounded-full px-1.5 py-1 text-[10px] font-black`}>
      {platformLabel(platform).slice(0, platform.toLowerCase() === "caterbids" ? 2 : 4)}
    </span>
  )
}

function messageBody(message: Message) {
  return message.message_text || message.body || ""
}

function readLocalConversations() {
  if (typeof window === "undefined") return [] as Conversation[]
  return JSON.parse(localStorage.getItem(LOCAL_CONVERSATIONS_KEY) || "[]") as Conversation[]
}

function writeLocalConversations(conversations: Conversation[]) {
  localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(conversations))
}

function readLocalMessages() {
  if (typeof window === "undefined") return [] as Message[]
  return JSON.parse(localStorage.getItem(LOCAL_MESSAGES_KEY) || "[]") as Message[]
}

function writeLocalMessages(messages: Message[]) {
  localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages))
}

export default function MessagesPage() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [activeFilter, setActiveFilter] = useState<Platform>("all")
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [useLocalMessages, setUseLocalMessages] = useState(false)

  const visibleConversations = useMemo(() => {
    return conversations.filter((item) => {
      const platform = item.platform?.toLowerCase() || "caterbids"
      return allowedPlatforms.includes(platform)
    })
  }, [conversations])

  const unreadTotal = visibleConversations.reduce((total, item) => total + (item.unread_count || 0), 0)

  const filteredConversations = useMemo(() => {
    if (activeFilter === "all") return visibleConversations

    if (activeFilter === "unread") {
      return visibleConversations.filter((item) => item.unread_count > 0)
    }

    return visibleConversations.filter(
      (item) => item.platform?.toLowerCase() === activeFilter
    )
  }, [visibleConversations, activeFilter])

  const otherParticipantId = (conversation: Conversation) => {
    if (!currentUserId) return null
    if (conversation.buyer_id === currentUserId) return conversation.seller_id || null
    if (conversation.seller_id === currentUserId) return conversation.buyer_id || null
    return conversation.seller_id || conversation.buyer_id || null
  }

  const fetchConversations = async () => {
    const supabase = createClient()
    const user = await getCurrentUser(supabase)

    if (!user) {
      setError("")
      setConversations(readLocalConversations())
      setLoading(false)
      return
    }

    setCurrentUserId(user.id)

    const { data, error: fetchError } = await supabase
      .from("conversations")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false })

    if (fetchError) {
      logSupabaseMessagesError(fetchError)
      const localConversations = readLocalConversations().filter((item) => {
        return !item.buyer_id || item.buyer_id === user.id || item.seller_id === user.id
      })
      setUseLocalMessages(true)
      setError("")
      setConversations(localConversations)
      setLoading(false)
      const conversationId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("conversation")
          : null
      if (conversationId && !selectedConversation) {
        const conversation = localConversations.find((item) => item.id === conversationId)
        if (conversation) {
          await openConversation(conversation, user.id, true)
        }
      }
      return
    }

    setUseLocalMessages(false)
    setError("")
    const nextConversations = (data || []) as Conversation[]
    setConversations(nextConversations)
    setLoading(false)

    const conversationId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("conversation")
        : null
    if (conversationId && !selectedConversation) {
      const conversation = nextConversations.find((item) => item.id === conversationId)
      if (conversation) {
        await openConversation(conversation, user.id)
      }
    }
  }

  const markLocalMessagesRead = (conversationId: string, userId = currentUserId) => {
    const nextMessages = readLocalMessages().map((message) =>
      message.conversation_id === conversationId && (!userId || message.recipient_id === userId)
        ? { ...message, is_read: true }
        : message
    )
    const nextConversations = readLocalConversations().map((conversation) =>
      conversation.id === conversationId ? { ...conversation, unread_count: 0 } : conversation
    )
    writeLocalMessages(nextMessages)
    writeLocalConversations(nextConversations)
    setConversations(nextConversations)
  }

  const fetchMessages = async (conversationId: string, userId = currentUserId, forceLocal = useLocalMessages) => {
    if (forceLocal || conversationId.startsWith("local-")) {
      const localMessages = readLocalMessages()
        .filter((message) => message.conversation_id === conversationId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      setMessages(localMessages)
      markLocalMessagesRead(conversationId, userId)
      return
    }

    const supabase = createClient()

    const { data, error: fetchError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (fetchError) {
      logSupabaseMessagesError(fetchError)
      const localMessages = readLocalMessages().filter((message) => message.conversation_id === conversationId)
      setUseLocalMessages(true)
      setError("")
      setMessages(localMessages)
      markLocalMessagesRead(conversationId, userId)
      return
    }

    setMessages((data || []) as Message[])

    if (userId) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("recipient_id", userId)
    }

    await supabase
      .from("conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId)

    setConversations((prev) =>
      prev.map((item) =>
        item.id === conversationId ? { ...item, unread_count: 0 } : item
      )
    )
  }

  const openConversation = async (conversation: Conversation, userId = currentUserId, forceLocal = useLocalMessages) => {
    setSelectedConversation({ ...conversation, unread_count: 0 })
    await fetchMessages(conversation.id, userId, forceLocal || conversation.id.startsWith("local-"))
  }

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return

    setSending(true)
    setError("")

    const supabase = createClient()
    const text = newMessage.trim()
    const recipientId = otherParticipantId(selectedConversation)

    const saveLocalMessage = () => {
      const now = new Date().toISOString()
      const localMessage: Message = {
        id: `local-message-${Date.now()}`,
        conversation_id: selectedConversation.id,
        sender_id: currentUserId || "local-user",
        recipient_id: recipientId,
        sender_name: "You",
        body: text,
        message_text: text,
        platform: selectedConversation.platform || "caterbids",
        is_read: false,
        created_at: now,
      }
      const nextMessages = [...readLocalMessages(), localMessage]
      const nextConversations = readLocalConversations().map((conversation) =>
        conversation.id === selectedConversation.id
          ? {
              ...conversation,
              last_message: text,
              last_message_at: now,
              updated_at: now,
            }
          : conversation
      )
      writeLocalMessages(nextMessages)
      writeLocalConversations(nextConversations)
      setMessages(nextMessages.filter((message) => message.conversation_id === selectedConversation.id))
      setConversations(nextConversations)
      setNewMessage("")
      setSending(false)
    }

    if (useLocalMessages || selectedConversation.id.startsWith("local-")) {
      saveLocalMessage()
      return
    }

    const { error: messageError } = await supabase.from("messages").insert({
      conversation_id: selectedConversation.id,
      sender_id: currentUserId,
      recipient_id: recipientId,
      message_text: text,
      body: text,
      sender_name: "You",
      platform: selectedConversation.platform || "caterbids",
      is_read: false,
    })

    if (messageError) {
      logSupabaseMessagesError(messageError)
      setUseLocalMessages(true)
      setError("")
      saveLocalMessage()
      return
    }

    const now = new Date().toISOString()
    const { error: conversationError } = await supabase
      .from("conversations")
      .update({
        last_message: text,
        last_message_at: now,
        updated_at: now,
      })
      .eq("id", selectedConversation.id)

    if (conversationError) {
      logSupabaseMessagesError(conversationError)
    }

    setNewMessage("")
    await fetchMessages(selectedConversation.id)
    await fetchConversations()
    setSending(false)
  }

  const createTestConversation = async () => {
    setLoading(true)
    setError("")
    const supabase = createClient()

    const createLocalTestConversation = () => {
      const now = new Date().toISOString()
      const conversation: Conversation = {
        id: `local-conversation-${Date.now()}`,
        buyer_id: currentUserId || "local-user",
        seller_id: null,
        listing_id: null,
        platform: "caterbids",
        participant_name: "Demo Buyer",
        participant_avatar: null,
        listing_title: "Lincat Twin Tank Fryer",
        last_message: "Hi, is this still available?",
        last_message_at: now,
        unread_count: 1,
        created_at: now,
        updated_at: now,
      }
      const message: Message = {
        id: `local-message-${Date.now()}`,
        conversation_id: conversation.id,
        sender_id: null,
        recipient_id: currentUserId || "local-user",
        sender_name: "Demo Buyer",
        body: "Hi, is this still available?",
        message_text: "Hi, is this still available?",
        platform: "caterbids",
        is_read: false,
        created_at: now,
      }
      const nextConversations = [conversation, ...readLocalConversations()]
      const nextMessages = [...readLocalMessages(), message]
      writeLocalConversations(nextConversations)
      writeLocalMessages(nextMessages)
      setUseLocalMessages(true)
      setConversations(nextConversations)
      setLoading(false)
    }

    if (useLocalMessages) {
      createLocalTestConversation()
      return
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        buyer_id: currentUserId || null,
        platform: "caterbids",
        participant_name: "Demo Buyer",
        listing_title: "Lincat Twin Tank Fryer",
        last_message: "Hi, is this still available?",
        unread_count: 1,
      })
      .select("id")
      .single()

    if (conversationError || !conversation) {
      logSupabaseMessagesError(conversationError)
      setError("")
      createLocalTestConversation()
      return
    }

    const { error: messageError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      recipient_id: currentUserId || null,
      sender_name: "Demo Buyer",
      body: "Hi, is this still available?",
      message_text: "Hi, is this still available?",
      platform: "caterbids",
      is_read: false,
    })

    if (messageError) {
      logSupabaseMessagesError(messageError)
      setError("")
      createLocalTestConversation()
      return
    }

    await fetchConversations()
    setLoading(false)
  }

  useEffect(() => {
    fetchConversations()

    const supabase = createClient()

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => fetchConversations()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          if (selectedConversation?.id) {
            fetchMessages(selectedConversation.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation?.id])

  const listView = (
    <>
      <div className="mb-8 flex items-center justify-between text-white sm:hidden">
        <span className="text-xl font-bold">9:41</span>
        <div className="h-8 w-28 rounded-full bg-black" />
        <div className="text-sm">WiFi</div>
      </div>

      <button
        type="button"
        onClick={() => router.back()}
        className="soft-button mb-5 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="orange-glow flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-2xl text-[#FF6B00]">🔔</div>
          <div>
            <h1 className="text-3xl font-extrabold leading-none">
              CaterBids<span className="text-[#FF6B00]">UK</span>
            </h1>
            <p className="mt-1 font-bold tracking-wide text-[#FF6B00]">
              BUY • SELL • SAVE
            </p>
          </div>
        </div>

        <div className="flex gap-5 pt-2">
          <Search size={30} />
          <div className="relative">
            <SlidersHorizontal size={30} />
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#FF6B00]" />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-4xl font-black">Messages</h2>
        <p className="mt-2 text-lg text-slate-300">
          All your conversations in one place
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => alert("New message composer coming soon")}
          className="premium-card premium-card-hover flex flex-col items-center gap-2 rounded-3xl px-5 py-4"
        >
          <PenLine className="text-[#FF6B00]" size={32} />
          <span className="font-semibold">New Message</span>
        </button>
      </div>

      <div className="no-scrollbar mb-3 flex gap-3 overflow-x-auto pb-4">
        {filters.map((filter) => {
          const count =
            filter.key === "all"
              ? visibleConversations.length
              : filter.key === "unread"
                ? unreadTotal
                : visibleConversations.filter((item) => item.platform?.toLowerCase() === filter.key).length

          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`shrink-0 rounded-2xl px-5 py-4 font-bold ${
                activeFilter === filter.key ? "premium-button text-white" : "soft-button text-white"
              }`}
            >
              <span className="font-bold">{filter.label}</span>
              {(filter.key === "all" || filter.key === "unread") && (
                <span className="ml-2 rounded-full bg-[#001633]/70 px-2 py-1">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="premium-card mb-4 rounded-3xl border-orange-400/30 p-4 text-sm text-orange-100">
          <AlertCircle className="mr-2 inline h-4 w-4 text-orange-300" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="premium-card rounded-3xl p-8 text-center text-white/60">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-[#FF6B00]" />
          Loading conversations...
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="premium-card rounded-3xl p-8 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-white/30" />
          <h3 className="mt-4 text-2xl font-black">No messages yet</h3>
          <p className="mt-2 text-sm text-white/60">
            Buyer and seller conversations will appear here.
          </p>
          <button
            type="button"
            onClick={createTestConversation}
            className="premium-button mt-5 rounded-2xl px-5 py-3 text-sm font-bold"
          >
            Create test conversation
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredConversations.map((chat, index) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => openConversation(chat)}
              className={`premium-card-hover relative flex w-full gap-4 rounded-3xl border border-white/10 px-4 py-5 text-left ${
                index === 0 ? "border-l-4 border-l-[#FF6B00] bg-white/[0.08]" : "bg-white/[0.025]"
              } transition-all`}
            >
              <div className="relative shrink-0">
                {chat.participant_avatar ? (
                  <img
                    src={chat.participant_avatar}
                    alt={chat.participant_name}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-[#002E5D] text-center text-sm font-black">
                    {initials(chat.participant_name)}
                  </div>
                )}

                <div className="absolute -bottom-1 -right-1">
                  <PlatformIcon platform={chat.platform} />
                </div>
              </div>

              <div className="min-w-0 flex-1 pr-8">
                <div className="flex justify-between gap-3">
                  <h3 className="truncate text-xl font-extrabold">{chat.participant_name}</h3>
                  <span className="shrink-0 text-sm text-slate-300">{timeLabel(chat.last_message_at)}</span>
                </div>

                <p className="truncate text-lg text-slate-300">{chat.listing_title || platformLabel(chat.platform)}</p>
                <p className="truncate text-lg text-white">{chat.last_message || "No messages yet"}</p>
              </div>

              {chat.unread_count > 0 && (
                <div className="absolute bottom-5 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B00] font-black text-white shadow-lg shadow-[#FF6B00]/30">
                  {chat.unread_count}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="premium-card premium-card-hover mt-6 flex items-center gap-4 rounded-3xl p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FF6B00]/50 bg-[#FF6B00]/10 text-[#FF6B00]">
          <MessageSquare size={34} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold">CaterBot Assistant</h3>
            <span className="rounded-full bg-purple-600/80 px-2 py-1 text-xs">
              BETA
            </span>
          </div>
          <p className="text-slate-300">Your smart CaterBids assistant helps you reply faster</p>
        </div>

        <button className="flex items-center gap-1 font-black text-[#FF6B00] transition-colors hover:text-[#FF6B00]/90">
          Try Now <ChevronRight size={22} />
        </button>
      </div>
    </>
  )

  const chatView = selectedConversation ? (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="premium-shell sticky top-3 z-20 mb-4 rounded-[2rem] p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedConversation(null)
              setMessages([])
            }}
            className="soft-button flex h-10 w-10 items-center justify-center rounded-2xl"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-black">{selectedConversation.participant_name}</h2>
            <p className="truncate text-sm text-white/60">{selectedConversation.listing_title || platformLabel(selectedConversation.platform)}</p>
          </div>

          <span className={`${platformColour(selectedConversation.platform)} rounded-full px-3 py-1 text-xs font-black`}>
            {platformLabel(selectedConversation.platform)}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3 pb-4">
        {messages.length === 0 ? (
          <div className="premium-card rounded-3xl p-8 text-center text-white/60">
            No messages in this thread yet.
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === currentUserId || message.sender_name === "You"
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-3xl px-4 py-3 ${
                    mine
                      ? "bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/20"
                      : "border border-white/10 bg-white/[0.07] text-white"
                  }`}
                >
                  <p className="whitespace-pre-line text-sm leading-6">{messageBody(message)}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/75" : "text-white/45"}`}>
                    {message.sender_name || platformLabel(message.platform)} • {timeLabel(message.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="bottom-nav sticky bottom-20 -mx-4 px-4 py-3 sm:bottom-0">
        <div className="flex gap-2">
          <input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Type a message..."
            className="premium-input min-w-0 flex-1 rounded-2xl px-4 py-3"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="premium-button flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <main className="app-bg min-h-screen pb-28 text-white">
      <div className="mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-5 sm:px-6">
        {selectedConversation ? chatView : listView}

        <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50">
          <div className="mx-auto grid w-full max-w-3xl grid-cols-5 px-4 py-4 text-center sm:px-6">
            <NavItem icon={<LayoutGrid />} label="Dashboard" onClick={() => router.push("/account")} />
            <NavItem icon={<Tag />} label="Listings" onClick={() => router.push("/listing")} />
            <NavItem
              icon={
                <div className="relative">
                  <MessageSquare />
                  {unreadTotal > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-[#FF6B00] px-1.5 text-xs text-white">
                      {unreadTotal}
                    </span>
                  )}
                </div>
              }
              label="Messages"
              active
            />
            <NavItem icon={<Package />} label="Orders" />
            <NavItem icon={<User />} label="Account" onClick={() => router.push("/account")} />
          </div>
        </nav>
      </div>
    </main>
  )
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-1 ${
        active ? "bg-[#FF6B00]/12 text-[#FF6B00]" : "text-slate-300 hover:bg-white/5 hover:text-white/80"
      } transition-colors`}
    >
      <div>{icon}</div>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  )
}
