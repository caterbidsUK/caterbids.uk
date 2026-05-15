"use client"

import { useState, type ReactNode } from "react"
import {
  Menu,
  Bell,
  Search,
  Home,
  Plus,
  MessageSquare,
  UserCircle,
  ShieldCheck,
  PoundSterling,
  Clock,
  TrendingUp,
  ChevronRight,
  MapPin,
  Tag,
} from "lucide-react"
import { CATEGORY_OPTIONS } from "@/lib/categories"

export default function HomePage() {
  const [search, setSearch] = useState("")
  const [location, setLocation] = useState("")
  const [category, setCategory] = useState("All Categories")

  return (
    <main className="app-bg min-h-screen text-white pb-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header className="flex items-center justify-between py-5">
          <a
            href="/search?q=all&category=All%20Categories&location=All%20UK"
            aria-label="Open menu"
            className="soft-button rounded-2xl p-2.5"
          >
            <Menu className="h-6 w-6" />
          </a>

          <div className="flex flex-col items-center">
            <div className="flex h-14 w-56 items-center justify-center rounded-2xl border border-white/70 bg-white px-4 shadow-xl shadow-black/20 sm:h-16 sm:w-64">
              <img
                src="/caterbids-card-logo.png"
                alt="CaterBids.uk"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
              Buy • Sell • Save
            </span>
          </div>

          <a
            href="/messages"
            aria-label="Notifications"
            className="soft-button relative rounded-2xl p-2.5"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B00] text-[10px] font-bold">
              3
            </span>
          </a>
        </header>

        <form
          action="/search"
          method="get"
          className="relative z-20 mx-auto mt-1 w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl shadow-black/25"
        >
          <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-200">
            <Search size={22} className="text-gray-400 shrink-0" />

            <input
              name="q"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catering equipment, vans or businesses..."
              className="w-full bg-white text-[#001633] placeholder:text-gray-400 outline-none text-lg font-medium"
              style={{
                color: "#001633",
                backgroundColor: "#ffffff",
                WebkitTextFillColor: "#001633",
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_1fr_auto]">
            <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 md:border-b-0 md:border-r">
              <MapPin size={18} className="text-gray-400 shrink-0" />

              <input
                name="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Postcode or city"
                className="w-full bg-white text-[#001633] placeholder:text-gray-400 outline-none"
                style={{
                  color: "#001633",
                  backgroundColor: "#ffffff",
                  WebkitTextFillColor: "#001633",
                }}
              />
              <input type="hidden" name="city" value={location} />
            </div>

            <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 md:border-b-0 md:border-r">
              <Tag size={18} className="text-gray-400 shrink-0" />

              <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white text-[#001633] outline-none"
                style={{
                  color: "#001633",
                  backgroundColor: "#ffffff",
                  WebkitTextFillColor: "#001633",
                }}
              >
                {CATEGORY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="premium-button m-3 rounded-2xl px-8 py-4 font-black text-white"
            >
              Search
            </button>
          </div>
        </form>

        <section className="mt-5 rounded-[2rem] border border-white/10 bg-[#002E5D] p-5 shadow-2xl shadow-black/20 sm:p-7">
          <h1 className="max-w-xl text-3xl font-black leading-tight text-white sm:text-5xl">
            Buy and sell catering equipment across the UK.
          </h1>
          <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-white/72">
            Equipment, vans, trailers and catering businesses in one place.
          </p>
          <a
            href="/post-listing"
            className="premium-button mt-5 inline-flex rounded-2xl px-5 py-3 text-sm font-black text-white"
          >
            Sell an item
          </a>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CategoryCard
            title="Catering Equipment"
            description="Ovens, fridges and fryers"
            image="/home-equipment-card.png"
            href="/category/catering-equipment"
          />
          <CategoryCard
            title="Catering Vans & Trailers"
            description="Mobile catering units"
            image="/home-van-card.png"
            href="/category/catering-vans-trailers"
          />
          <CategoryCard
            title="Catering Businesses"
            description="Cafes, takeaways and restaurants"
            image="/home-header-2026.png"
            href="/category/catering-businesses"
            imagePosition="center"
          />
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 text-[#002E5D] shadow-xl shadow-black/15">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-black tracking-tighter">
              <span className="text-red-500">e</span>
              <span className="text-blue-500">b</span>
              <span className="text-yellow-400">a</span>
              <span className="text-green-500">y</span>
            </div>

            <div>
              <h2 className="text-lg font-black">Compare with live eBay prices</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Check wider market prices before you buy.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 text-[#002E5D] shadow-xl shadow-black/15">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Sell catering equipment fast</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">Create a listing in minutes.</p>
            </div>

            <a
              href="/post-listing"
              className="premium-button inline-flex justify-center rounded-2xl px-6 py-3 text-sm font-black text-white"
            >
              List your item
            </a>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TrustItem
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Verified sellers"
          />
          <TrustItem
            icon={<PoundSterling className="h-6 w-6" />}
            title="Secure checkout"
          />
          <TrustItem
            icon={<Clock className="h-6 w-6" />}
            title="Delivery support"
          />
          <TrustItem
            icon={<TrendingUp className="h-6 w-6" />}
            title="Engineer support"
          />
        </section>
      </div>

      <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto flex max-w-3xl items-end justify-around px-3 pb-4 pt-3">
          <NavButton
            icon={<Home className="h-5 w-5" />}
            label="Home"
            active
            href="/"
          />
          <NavButton
            icon={<Search className="h-5 w-5" />}
            label="Search"
            href="/search?q=all&category=All%20Categories&location=All%20UK"
          />
          <a
            href="/post-listing"
            aria-label="Post listing"
            className="premium-button -mt-8 flex h-14 w-14 items-center justify-center rounded-full text-white"
          >
            <Plus className="h-7 w-7" />
          </a>
          <NavButton
            icon={<MessageSquare className="h-5 w-5" />}
            label="Messages"
            badge={2}
            href="/messages"
          />
          <NavButton
            icon={<UserCircle className="h-5 w-5" />}
            label="Account"
            href="/account"
          />
        </div>
      </nav>
    </main>
  )
}

function CategoryCard({
  title,
  description,
  image,
  href,
  imagePosition = "center",
}: {
  title: string
  description: string
  image: string
  href: string
  imagePosition?: string
}) {
  return (
    <a
      href={href}
      className="group overflow-hidden rounded-3xl bg-white text-left text-[#002E5D] shadow-xl shadow-black/15 transition-transform focus-visible:outline-none active:scale-[0.99]"
    >
      <div className="relative h-56 overflow-hidden rounded-t-3xl sm:h-44 md:h-48">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ objectPosition: imagePosition }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001633]/35 to-transparent" />
      </div>

      <div className="px-4 py-3">
        <div className="text-base font-black">{title}</div>
        <div className="mt-1 text-sm font-medium text-slate-600">{description}</div>
        <div className="mt-2 flex items-center gap-1 text-sm font-black text-[#FF6B00] transition-colors group-hover:text-[#E35F00]">
          Browse{" "}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </a>
  )
}

function TrustItem({
  icon,
  title,
}: {
  icon: ReactNode
  title: string
}) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center text-[#002E5D] shadow-lg shadow-black/10">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#002E5D]/10 text-[#002E5D]">
        {icon}
      </div>
      <div className="mt-3 text-xs font-black">{title}</div>
    </div>
  )
}

function NavButton({
  icon,
  label,
  active = false,
  badge,
  href,
}: {
  icon: ReactNode
  label: string
  active?: boolean
  badge?: number
  href: string
}) {
  return (
    <a
      href={href}
      className={`relative flex min-w-14 flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-colors focus-visible:outline-none ${
        active ? "bg-[#FF6B00]/12 text-[#FF6B00]" : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-0.5 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B00] text-[9px] font-bold">
          {badge}
        </span>
      )}
    </a>
  )
}
