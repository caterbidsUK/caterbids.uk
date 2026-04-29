"use client"

import { useRouter } from "next/navigation"
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

const categories = [
  "All Categories",
  "Cooking Equipment",
  "Refrigeration",
  "Food Preparation",
  "Warewashing",
  "Coffee & Bar",
  "Display & Serving",
  "Furniture & Front of House",
  "Extraction & Ventilation",
  "Food Vans & Trailers",
  "Complete Catering Businesses",
  "Parts & Spares",
]

export default function HomePage() {
  const router = useRouter()

  const [search, setSearch] = useState("")
  const [location, setLocation] = useState("All UK")
  const [category, setCategory] = useState("All Categories")

  function handleSearch() {
    const query = search.trim() || "all"

    router.push(
      `/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(
        category
      )}&location=${encodeURIComponent(location)}`
    )
  }

  function goToPostListing() {
    router.push("/post-listing")
  }

  return (
    <main className="min-h-screen bg-[#001633] text-white pb-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header className="flex items-center justify-between py-5">
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-xl p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-col items-center">
            <img src="/logo.png" alt="CaterBids" className="h-[165px]" />
            <span className="mt-0.5 text-[10px] font-bold tracking-[0.2em] text-[#FF6B00] uppercase">
              Buy • Sell • Save
            </span>
          </div>

          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-xl p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B00] text-[10px] font-bold">
              3
            </span>
          </button>
        </header>

        <section className="relative mt-2 overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#001633] via-[#001633]/70 to-[#001633]/40" />

          <div className="relative px-6 py-10 text-center sm:py-14">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              The UK&apos;s #1 Hub for
              <br />
              <span className="text-[#FF6B00]">Catering Equipment</span>,
              <br />
              Vans & Businesses
            </h1>

            <p className="mx-auto mt-4 max-w-md text-base text-white/80 sm:text-lg">
              One search. Every platform. The best deals in catering.
            </p>
          </div>
        </section>

        <div className="relative z-20 mx-auto -mt-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-200">
            <Search size={22} className="text-gray-400 shrink-0" />

            <input
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

              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white text-[#001633] outline-none"
                style={{
                  color: "#001633",
                  backgroundColor: "#ffffff",
                  WebkitTextFillColor: "#001633",
                }}
              >
                <option>All UK</option>
                <option>Birmingham</option>
                <option>London</option>
                <option>Manchester</option>
                <option>Leeds</option>
                <option>Bristol</option>
                <option>Liverpool</option>
                <option>Glasgow</option>
                <option>Cardiff</option>
              </select>
            </div>

            <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 md:border-b-0 md:border-r">
              <Tag size={18} className="text-gray-400 shrink-0" />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white text-[#001633] outline-none"
                style={{
                  color: "#001633",
                  backgroundColor: "#ffffff",
                  WebkitTextFillColor: "#001633",
                }}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="m-3 rounded-xl bg-[#FF6B00] px-8 py-4 font-black text-white shadow-lg hover:bg-[#ff7d22]"
            >
              Search
            </button>
          </div>
        </div>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CategoryCard
            icon={<ChefHat className="h-6 w-6" />}
            title="Equipment"
            description="Ovens, fridges, fryers & more"
            image="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=80"
            onClick={() =>
              router.push(
                "/search?q=commercial%20catering%20equipment&category=Cooking%20Equipment&location=All%20UK"
              )
            }
          />
          <CategoryCard
            icon={<Truck className="h-6 w-6" />}
            title="Catering Vans"
            description="Vans, trailers, trucks & units"
            image="https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=900&q=80"
            onClick={() =>
              router.push(
                "/search?q=van&category=Food%20Vans%20%26%20Trailers&location=All%20UK"
              )
            }
          />
          <CategoryCard
            icon={<Store className="h-6 w-6" />}
            title="Catering Businesses"
            description="Cafes, takeaways, restaurants & more"
            image="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80"
            onClick={() =>
              router.push(
                "/search?q=business&category=Complete%20Catering%20Businesses&location=All%20UK"
              )
            }
          />
        </section>

        <section className="mt-6 rounded-2xl border border-[#FF6B00]/30 bg-gradient-to-r from-[#FF6B00]/10 to-transparent p-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="text-3xl font-black tracking-tighter">
              <span className="text-red-500">e</span>
              <span className="text-blue-500">b</span>
              <span className="text-yellow-400">a</span>
              <span className="text-green-500">y</span>
            </div>

            <div className="hidden h-10 w-px bg-white/20 sm:block" />

            <div className="text-center sm:text-left">
              <span className="inline-block rounded-md bg-[#FF6B00] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                Live Results
              </span>
              <div className="mt-1.5 text-lg font-bold">eBay Live Results</div>
              <div className="text-sm text-white/70">
                Live eBay listings are shown in your search results.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FF6B00] shadow-lg shadow-orange-500/20">
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
              <button
                type="button"
                onClick={goToPostListing}
                className="rounded-xl bg-[#FF6B00] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02] hover:shadow-orange-500/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#001633]"
              >
                Post Your Item
              </button>
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

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#03152B]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-end justify-around px-3 pb-4 pt-3">
          <NavButton
            icon={<Home className="h-5 w-5" />}
            label="Home"
            active
            onClick={() => router.push("/")}
          />
          <NavButton
            icon={<Search className="h-5 w-5" />}
            label="Search"
            onClick={() =>
              router.push(
                "/search?q=all&category=All%20Categories&location=All%20UK"
              )
            }
          />
          <button
            type="button"
            aria-label="Post listing"
            onClick={goToPostListing}
            className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B00] text-white shadow-xl shadow-orange-500/30 transition-all hover:scale-105 hover:shadow-orange-500/50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#001633]"
          >
            <Plus className="h-7 w-7" />
          </button>
          <NavButton
            icon={<MessageSquare className="h-5 w-5" />}
            label="Messages"
            badge={2}
            onClick={() => router.push("/messages")}
          />
          <NavButton
            icon={<UserCircle className="h-5 w-5" />}
            label="Account"
            onClick={() => router.push("/account")}
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
  onClick,
}: {
  icon: ReactNode
  title: string
  description: string
  image: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-all hover:border-white/20 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#001633]"
    >
      <div className="relative h-36 overflow-hidden sm:h-32">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001633]/80 to-transparent" />
        <div className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#001633]/80 text-[#FF6B00] backdrop-blur-sm">
          {icon}
        </div>
      </div>

      <div className="p-4">
        <div className="text-base font-bold">{title}</div>
        <div className="mt-1 text-sm text-white/70">{description}</div>
        <div className="mt-3 flex items-center gap-1 text-sm font-bold text-[#FF6B00] transition-colors group-hover:text-orange-400">
          Browse{" "}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
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
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.06]">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B00]/10 text-[#FF6B00]">
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
  onClick,
}: {
  icon: ReactNode
  label: string
  active?: boolean
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 rounded-lg px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
        active ? "text-[#FF6B00]" : "text-white/60 hover:text-white"
      }`}
    >
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-0.5 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B00] text-[9px] font-bold">
          {badge}
        </span>
      )}
    </button>
  )
}


