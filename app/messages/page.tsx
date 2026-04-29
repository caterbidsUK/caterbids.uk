"use client"

import {
  Search,
  SlidersHorizontal,
  PenLine,
  LayoutGrid,
  Tag,
  MessageSquare,
  Package,
  User,
  ChevronRight,
  Mail,
} from "lucide-react"

const conversations = [
  {
    name: "John Smith",
    item: "Lincat Twin Tank Fryer",
    message: "Hi, is the fryer still available?",
    time: "10:42",
    platform: "WhatsApp",
    badge: 2,
    avatar: "https://i.pravatar.cc/100?img=12",
  },
  {
    name: "Sarah Jones",
    item: "Polar Commercial Fridge",
    message: "Can you send more photos?",
    time: "09:30",
    platform: "Instagram",
    badge: 1,
    avatar: "https://i.pravatar.cc/100?img=32",
  },
  {
    name: "Cafe Central",
    item: "Re: Fridge Enquiry",
    message: "Hi, can you send the invoice?",
    time: "Yesterday",
    platform: "Email",
    badge: 3,
    avatar: "",
  },
  {
    name: "Mike Brown",
    item: "Buffalo Commercial Griddle",
    message: "Is delivery available?",
    time: "Yesterday",
    platform: "WhatsApp",
    badge: 0,
    avatar: "https://i.pravatar.cc/100?img=14",
  },
  {
    name: "Smart Hospitality",
    item: "eBay Order #29381",
    message: "Do you ship to Scotland?",
    time: "2d ago",
    platform: "eBay",
    badge: 1,
    avatar: "",
  },
  {
    name: "Emma Wilson",
    item: "Williams Blast Chiller",
    message: "Thanks, I'll take it.",
    time: "2d ago",
    platform: "Email",
    badge: 0,
    avatar: "https://i.pravatar.cc/100?img=47",
  },
]

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "WhatsApp") {
    return <span className="bg-[#25D366] text-white text-xs rounded-full px-1.5 py-1">☎</span>
  }

  if (platform === "Instagram") {
    return <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs rounded-full px-1.5 py-1">◎</span>
  }

  if (platform === "Email") {
    return (
      <span className="bg-blue-500 text-white rounded-full p-1">
        <Mail size={12} />
      </span>
    )
  }

  return <span className="bg-white text-[#001B36] text-xs rounded-full px-1 py-1 font-bold text-xs">eBay</span>
}

export default function MessagesPage() {
  return (
    <main className="min-h-screen bg-[#001633] text-white pb-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 min-h-screen bg-gradient-to-b from-[#001633] via-[#002E5D] to-[#001326] pt-5 pb-24">

        {/* iPhone top - mobile only */}
        <div className="block sm:hidden flex justify-between items-center text-white mb-8">
          <span className="text-xl font-bold">9:41</span>
          <div className="w-28 h-8 bg-black rounded-full" />
          <div className="text-sm">▮▮▮  WiFi  🔋</div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="text-[#FF6B00] text-4xl">🔔</div>
              <div>
                <h1 className="text-3xl font-extrabold leading-none">
                  CaterBids<span className="text-[#FF6B00]">UK</span>
                </h1>
                <p className="text-[#FF6B00] font-bold tracking-wide mt-1">
                  BUY • SELL • SAVE
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-5 pt-2">
            <Search size={34} />
            <div className="relative">
              <SlidersHorizontal size={34} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF6B00] rounded-full" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-4xl font-black">Messages</h2>
          <p className="text-slate-300 mt-2 text-lg">
            All your conversations in one place
          </p>
        </div>

        {/* New message */}
        <div className="flex justify-end mb-6">
          <button className="border border-white/20 rounded-2xl px-5 py-4 bg-white/5 flex flex-col items-center gap-2 hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/5 transition-all">
            <PenLine className="text-[#FF6B00]" size={32} />
            <span className="font-semibold">New Message</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-3 no-scrollbar">
          {[
            ["All", "12"],
            ["Unread", "12"],
            ["WhatsApp", ""],
            ["Instagram", ""],
            ["Email", ""],
            ["eBay", ""],
          ].map(([label, count]) => (
            <button
              key={label}
              className={`shrink-0 rounded-2xl px-5 py-4 border border-white/10 hover:border-white/20 ${label === "All" ? "bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25 hover:shadow-[#FF6B00]/40" : "bg-white/5 text-white hover:bg-white/10"}`}
            >
              <span className="font-bold">{label}</span>
              {count && (
                <span className="ml-2 bg-[#001633]/70 px-2 py-1 rounded-full">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="space-y-1">
          {conversations.map((chat, index) => (
            <div
              key={chat.name}
              className={`relative flex gap-4 px-4 py-5 border-b border-white/10 ${index === 0 ? "bg-white/8 rounded-2xl border-l-4 border-[#FF6B00] hover:bg-white/12" : "hover:bg-white/5"} transition-all`}
            >
              <div className="relative shrink-0">
                {chat.avatar ? (
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#002E5D] border border-white/30 flex items-center justify-center text-center text-sm font-black">
                    {chat.name.split(" ")[0].toUpperCase()}
                  </div>
                )}

                <div className="absolute -bottom-1 -right-1">
                  <PlatformIcon platform={chat.platform} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <h3 className="text-xl font-extrabold truncate">{chat.name}</h3>
                  <span className="text-slate-300 text-sm shrink-0">{chat.time}</span>
                </div>

                <p className="text-slate-300 text-lg truncate">{chat.item}</p>
                <p className="text-white text-lg truncate">{chat.message}</p>
              </div>

              {chat.badge > 0 && (
                <div className="absolute right-3 bottom-5 bg-[#FF6B00] text-white font-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-[#FF6B00]/30">
                  {chat.badge}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* AI Assistant card */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center gap-4 hover:border-white/20 hover:bg-white/8 transition-all">
          <div className="w-16 h-16 rounded-2xl border border-[#FF6B00]/50 flex items-center justify-center text-[#FF6B00] bg-[#FF6B00]/10">
            <MessageSquare size={34} />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-extrabold">AI Assistant</h3>
              <span className="text-xs bg-purple-600/80 px-2 py-1 rounded-full">
                BETA
              </span>
            </div>
            <p className="text-slate-300">Get AI-powered help to reply faster</p>
          </div>

          <button className="text-[#FF6B00] font-black flex items-center gap-1 hover:text-[#FF6B00]/90 transition-colors">
            Try Now <ChevronRight size={22} />
          </button>
        </div>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#03152B]/95 backdrop-blur-md">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 bg-[#001326]/95 backdrop-blur-xl border-t border-white/10 py-4 grid grid-cols-5 text-center w-full">
            <NavItem icon={<LayoutGrid />} label="Dashboard" />
            <NavItem icon={<Tag />} label="Listings" />
            <NavItem
              icon={
                <div className="relative">
                  <MessageSquare />
                  <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-xs rounded-full px-1.5">
                    12
                  </span>
                </div>
              }
              label="Messages"
              active
            />
            <NavItem icon={<Package />} label="Orders" />
            <NavItem icon={<User />} label="Account" />
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
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
    <button
      className={`flex flex-col items-center gap-1 ${active ? "text-[#FF6B00]" : "text-slate-300 hover:text-white/80"} transition-colors`}
    >
      <div>{icon}</div>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  )
}
