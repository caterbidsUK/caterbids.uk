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
  ChefHat,
  Truck,
  Store,
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
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF6B00]">
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

        <section className="premium-shell relative mt-2 overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0 bg-[url('/home-header-2026.png')] bg-cover bg-center" />
          <div className="relative h-[300px] sm:h-[420px]" />
        </section>

        <form
          action="/search"
          method="get"
          className="relative z-20 mx-auto -mt-6 w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl shadow-black/30"
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

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CategoryCard
            icon={<ChefHat className="h-6 w-6" />}
            title="Catering Equipment"
            description="Ovens, fridges, fryers & more"
            image="/home-equipment-card.png"
            href="/category/catering-equipment"
          />
          <CategoryCard
            icon={<Truck className="h-6 w-6" />}
            title="Catering Vans & Trailers"
            description="Vans, trailers, trucks & units"
            image="/home-van-card.png"
            href="/category/catering-vans-trailers"
          />
          <CategoryCard
            icon={<Store className="h-6 w-6" />}
            title="Catering Businesses"
            description="Cafes, takeaways, restaurants & more"
            image="/home-equipment-card.png"
            href="/category/catering-businesses"
          />
        </section>

        <section className="premium-card mt-6 rounded-3xl p-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="text-3xl font-black tracking-tighter">
              <span className="text-red-500">e</span>
              <span className="text-blue-500">b</span>
              <span className="text-yellow-400">a</span>
              <span className="text-green-500">y</span>
            </div>

            <div className="hidden h-10 w-px bg-white/20 sm:block" />

            <div className="text-center sm:text-left">
              <span className="premium-badge inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                Live Results
              </span>
              <div className="mt-1.5 text-lg font-bold">eBay Live Results</div>
              <div className="text-sm text-white/70">
                Live eBay listings are shown in your search results.
              </div>
            </div>
          </div>
        </section>

        <section className="premium-card mt-6 rounded-3xl p-5">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="orange-glow flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B00]">
                <Plus className="h-7 w-7" />
              </div>

              <div>
                <div className="text-xl font-bold">Ready to sell?</div>
                <div className="text-sm text-white/70">
                  List your equipment, van or business in minutes.
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 sm:items-end">
              <a
                href="/post-listing"
                className="premium-button rounded-2xl px-6 py-3 text-sm font-bold text-white"
              >
                Post Your Item
              </a>
              <span className="text-xs font-semibold text-[#FF6B00]">
                It&apos;s free to start
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TrustItem
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Trusted & Verified"
            description="Quality listings from trusted sellers"
          />
          <TrustItem
            icon={<PoundSterling className="h-6 w-6" />}
            title="Save Money"
            description="Compare prices and find the best deals"
          />
          <TrustItem
            icon={<Clock className="h-6 w-6" />}
            title="Save Time"
            description="One search saves hours of looking"
          />
          <TrustItem
            icon={<TrendingUp className="h-6 w-6" />}
            title="Sell Faster"
            description="Get seen by more buyers"
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
  icon,
  title,
  description,
  image,
  href,
}: {
  icon: ReactNode
  title: string
  description: string
  image: string
  href: string
}) {
  return (
    <a
      href={href}
      className="premium-card premium-card-hover group overflow-hidden rounded-3xl text-left focus-visible:outline-none"
    >
      <div className="relative h-36 overflow-hidden sm:h-32">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001633]/80 to-transparent" />
        <div className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#001633]/80 text-[#FF6B00] backdrop-blur-sm">
          {icon}
        </div>
      </div>

      <div className="p-4">
        <div className="text-base font-black text-[#FF6B00]">{title}</div>
        <div className="mt-1 text-sm text-white/70">{description}</div>
        <div className="mt-3 flex items-center gap-1 text-sm font-bold text-[#FF6B00] transition-colors group-hover:text-orange-400">
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
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="premium-card rounded-2xl p-4 text-center transition-all hover:border-white/20">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00]">
        {icon}
      </div>
      <div className="mt-3 text-xs font-bold">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-white/60">
        {description}
      </div>
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
