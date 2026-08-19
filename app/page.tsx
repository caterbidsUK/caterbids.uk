import type { Metadata } from "next"
import SiteFooter from "@/components/SiteFooter"
import SiteLogo from "@/components/SiteLogo"
import MobileMenu from "@/components/MobileMenu"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { ReactElement, ReactNode } from "react"
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  MapPin,
  PackageCheck,
  Percent,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Truck,
  Upload,
  Utensils,
} from "lucide-react"

import { createClient, createPublicClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"
import FeaturedCarousel from "@/components/FeaturedCarousel"
import { getFreeListingsRemaining } from "@/lib/counters"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "CaterBidsUK | The UK Marketplace for Catering Equipment",
  description:
    "Buy, sell and save on catering equipment, vans and hospitality assets with CaterBidsUK.",
  openGraph: {
    title: "CaterBidsUK — The UK Marketplace for Catering Equipment",
    description: "BUY • SELL • SAVE on catering equipment, vans and hospitality assets.",
    images: ["/images/caterbids-hero-showroom.png"],
  },
}

type Listing = Database["public"]["Tables"]["listings"]["Row"]
type CategoryKey = "equipment" | "vans" | "businesses"
type HomePageSearchParams = Record<string, string | string[] | undefined>

type CategoryCardData = {
  key: CategoryKey
  title: string
  description: string
  image: string
  href: string
  fallbackLabel: string
  icon: ReactNode
}

type BenefitCard = {
  title: string
  description: string
  icon: ReactNode
}

type StepCard = {
  title: string
  description: string
  icon: ReactNode
}

const searchAllHref = "/search"
const sellHref = "/post-listing/start"

const heroFeatureCards = [
  {
    src: "/images/home/features/caterbot-listing-help-card.png",
    alt: "CaterBot Listing Help — Get AI help to create better listings faster.",
  },
  {
    src: "/images/home/features/delivery-support-card.png",
    alt: "Delivery Support — Built to help buyers and sellers with delivery details.",
  },
  {
    src: "/images/home/features/verified-seller-tools-card.png",
    alt: "Verified Seller Tools — Build trust with verification and seller profiles.",
  },
  {
    src: "/images/home/features/no-final-value-fees-card.png",
    alt: "No Final Value Fees — Pay to list, not a percentage of each sale.",
  },
]

function isCurrentFeatured(listing: Listing) {
  const featured = Boolean(listing.featured || listing.is_featured)
  if (!featured) return false
  if (!listing.featured_until) return false

  const timestamp = new Date(listing.featured_until).getTime()
  return Number.isFinite(timestamp) ? timestamp > Date.now() : true
}

function categoryMatchText(listing: Listing) {
  return `${listing.category || ""} ${listing.subcategory || ""} ${listing.title || ""}`.toLowerCase()
}

function categoryCount(listings: Listing[], key: CategoryKey) {
  const count = listings.filter((listing) => {
    const text = categoryMatchText(listing)

    if (key === "equipment") {
      return (
        text.includes("equipment") ||
        text.includes("oven") ||
        text.includes("fridge") ||
        text.includes("freezer") ||
        text.includes("fryer") ||
        text.includes("range") ||
        text.includes("grill")
      )
    }

    if (key === "vans") {
      return text.includes("van") || text.includes("trailer") || text.includes("food truck")
    }

    return (
      text.includes("business") ||
      text.includes("cafe") ||
      text.includes("café") ||
      text.includes("restaurant") ||
      text.includes("takeaway")
    )
  }).length

  return count > 0 ? count : null
}

async function loadHomepageData() {
  const empty = {
    userId: null as string | null,
    listings: [] as Listing[],
    featuredListings: [] as Listing[],
    categoryCounts: {
      equipment: null,
      vans: null,
      businesses: null,
    } as Record<CategoryKey, number | null>,
  }

  try {
    const sessionClient = await createClient()
    const publicClient = createPublicClient()

    // Auth uses the session client so an expired JWT resolves to null user
    // rather than throwing. Listings use the public client so an expired
    // session cookie never blocks a public read.
    const [authResult, { data, error }] = await Promise.all([
      sessionClient.auth.getUser().catch((err) => {
        console.error("[homepage] auth.getUser() failed — rendering as logged-out:", err?.message ?? err)
        return { data: { user: null } }
      }),
      publicClient
        .from("listings")
        .select("*")
        .or("status.eq.live,status.is.null")
        .order("created_at", { ascending: false })
        .limit(1000),
    ])

    const userId = authResult.data?.user?.id ?? null

    if (error) {
      console.error("[homepage] Listings query failed:", error.message, error.code)
      return { ...empty, userId }
    }

    const stripDataUrls = (listing: Listing): Listing => ({
      ...listing,
      images: Array.isArray(listing.images)
        ? (listing.images as string[]).filter((img) => typeof img === "string" && !img.startsWith("data:"))
        : listing.images,
    })

    const listings = ((data || []) as Listing[]).filter((listing) => listing.status !== "sold").map(stripDataUrls)
    const featured = listings.filter(isCurrentFeatured).slice(0, 10)

    return {
      userId,
      listings,
      featuredListings: featured.length > 0 ? featured : listings.slice(0, 3),
      categoryCounts: {
        equipment: categoryCount(listings, "equipment"),
        vans: categoryCount(listings, "vans"),
        businesses: categoryCount(listings, "businesses"),
      },
    }
  } catch (error) {
    console.warn("Homepage data unavailable:", error)
    return empty
  }
}

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function authCallbackQuery(params: HomePageSearchParams) {
  const callbackParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") callbackParams.append(key, item)
      }
      continue
    }

    if (typeof value === "string") callbackParams.set(key, value)
  }

  return callbackParams.toString()
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>
}) {
  const params = (await searchParams) || {}
  if (firstSearchParam(params.code)) {
    redirect(`/auth/callback?${authCallbackQuery(params)}`)
  }

  const { userId, featuredListings, categoryCounts } = await loadHomepageData()
  const { remaining: freeRemaining, cap: freeCap } = await getFreeListingsRemaining()
  const accountHref = userId ? "/account" : "/login?next=%2Faccount"
  const accountLabel = userId ? "Account" : "Sign In"

  return (
    <main className="min-h-screen overflow-hidden bg-[#001225] text-white">
      <LaunchStrip freeRemaining={freeRemaining} freeCap={freeCap} />
      <HeroSection accountHref={accountHref} accountLabel={accountLabel} freeRemaining={freeRemaining} freeCap={freeCap} />

      <section className="relative z-20 -mt-8 px-4 pb-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <SearchPanel />
          <FeaturedListings listings={featuredListings} />
          <CategorySection counts={categoryCounts} />
          <WhyCaterBids />
          <HowItWorks />
          <ClosingCta freeRemaining={freeRemaining} freeCap={freeCap} />
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

function LaunchStrip({ freeRemaining, freeCap }: { freeRemaining: number; freeCap: number }) {
  return (
    <div className="w-full bg-[#FF6B00] px-4 py-2 text-center">
      <p className="text-sm font-black text-white">
        {freeRemaining > 0 ? (
          <>
            {freeRemaining} of {freeCap} free listings left
            <span className="hidden sm:inline"> — no fees, no catch.</span>
          </>
        ) : (
          `All ${freeCap} free listing slots have been claimed.`
        )}
      </p>
    </div>
  )
}

function HeroSection({ accountHref, accountLabel, freeRemaining, freeCap }: { accountHref: string; accountLabel: string; freeRemaining: number; freeCap: number }) {
  return (
    <section className="relative isolate min-h-[900px] overflow-hidden pb-28 pt-6 sm:min-h-[850px] lg:min-h-[820px]">
      <Image
        src="/images/caterbids-hero-showroom.png"
        alt="Commercial catering equipment showroom"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,12,30,0.96)_0%,rgba(0,30,68,0.86)_42%,rgba(0,19,43,0.58)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,18,40,0.06)_0%,rgba(0,18,40,0.38)_56%,rgba(0,18,40,1)_100%)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
        <SiteHeader accountHref={accountHref} accountLabel={accountLabel} />

        <div className="pt-11 sm:pt-16 lg:max-w-4xl lg:pt-24">
          <div className="mb-5">
            <p className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.3em] text-[#FF6B00]">
              Limited time launch offer
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-[2.8rem] font-black leading-none tracking-tight text-[#FF6B00]">
                {freeRemaining > 0 ? freeRemaining : 0}
              </span>
              <span className="text-base font-semibold text-white/90">
                {freeRemaining > 0 ? `of ${freeCap} free listings left` : `of ${freeCap} slots taken`}
              </span>
            </div>
          </div>
          <h1 className="max-w-4xl text-[4.15rem] font-black leading-[0.96] tracking-[-0.075em] text-white sm:text-[5.8rem] lg:text-[6.7rem]">
            The UK Marketplace for <span className="text-[#FF6B00]">Catering Equipment</span>
          </h1>
          <p className="mt-6 max-w-2xl text-2xl font-semibold leading-snug text-white/82 sm:text-3xl">
            Buy direct from other UK catering businesses. No commission, no middleman.
          </p>

          <div className="mt-9 grid gap-4 sm:flex sm:flex-wrap">
            <Link
              href={sellHref}
              className="group flex min-h-16 items-center justify-center gap-4 rounded-[1.7rem] bg-[#FF6B00] px-8 text-xl font-black text-white shadow-[0_24px_70px_rgba(255,107,0,0.34)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/35 sm:min-w-72"
            >
              Start Free Listing
              <ArrowRight className="h-7 w-7 transition group-hover:translate-x-1" strokeWidth={2.2} />
            </Link>
            <Link
              href={searchAllHref}
              className="group flex min-h-16 items-center justify-center gap-4 rounded-[1.7rem] border border-white/38 bg-white/7 px-8 text-xl font-black text-white shadow-[0_20px_65px_rgba(0,0,0,0.26)] backdrop-blur-md transition hover:border-[#FF6B00]/80 hover:bg-white/12 focus:outline-none focus:ring-4 focus:ring-white/20 sm:min-w-72"
            >
              <Search className="h-8 w-8" strokeWidth={2.1} />
              Search Equipment
            </Link>
          </div>

        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {heroFeatureCards.map((card) => (
            <div key={card.src} className="aspect-square overflow-hidden rounded-[1.15rem]">
              <Image
                src={card.src}
                alt={card.alt}
                width={640}
                height={640}
                sizes="(min-width: 1024px) 260px, (min-width: 640px) 24vw, 46vw"
                className="h-full w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SiteHeader({ accountHref, accountLabel }: { accountHref: string; accountLabel: string }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" aria-label="CaterBidsUK home">
        <SiteLogo size="lg" priority />
      </Link>

      <nav className="hidden items-center gap-7 text-sm font-black text-white/86 lg:flex" aria-label="Primary">
        <Link className="transition hover:text-[#FF6B00]" href="/">
          Home
        </Link>
        <Link className="transition hover:text-[#FF6B00]" href={searchAllHref}>
          Marketplace
        </Link>
        <Link className="transition hover:text-[#FF6B00]" href="/blog">
          Blog
        </Link>
        <Link className="transition hover:text-[#FF6B00]" href={sellHref}>
          Sell
        </Link>
        <Link className="transition hover:text-[#FF6B00]" href="/pricing">
          Pricing
        </Link>
        <Link className="transition hover:text-[#FF6B00]" href={accountHref}>
          {accountLabel}
        </Link>
        <Link
          href={sellHref}
          className="rounded-2xl bg-[#FF6B00] px-5 py-3 text-white shadow-[0_18px_44px_rgba(255,107,0,0.28)] transition hover:brightness-110"
        >
          Start Free Listing
        </Link>
      </nav>

      <MobileMenu
        accountHref={accountHref}
        accountLabel={accountLabel}
        sellHref={sellHref}
        searchAllHref={searchAllHref}
      />
    </header>
  )
}


function SearchPanel() {
  return (
    <section
      id="marketplace-search"
      className="rounded-[2rem] bg-white p-4 text-[#001b35] shadow-[0_28px_90px_rgba(0,0,0,0.34)] sm:p-6"
      aria-labelledby="search-heading"
    >
      <h2 id="search-heading" className="sr-only">
        Search CaterBidsUK listings
      </h2>
      <form action="/search" method="get" className="grid gap-3">
        <label className="group flex min-h-16 items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 text-lg font-bold shadow-sm transition focus-within:border-[#FF6B00] focus-within:ring-4 focus-within:ring-[#FF6B00]/12">
          <Search className="h-7 w-7 shrink-0 text-[#FF3B00]" strokeWidth={2} />
          <span className="sr-only">Search keyword</span>
          <input
            type="search"
            name="q"
            placeholder="Search fryers, ovens, fridges..."
            className="min-w-0 flex-1 bg-transparent text-[#001b35] outline-none [&::placeholder]:text-slate-400 [&::placeholder]:opacity-100"
            style={{ color: "#001b35", WebkitTextFillColor: "#001b35" }}
          />
        </label>

        <label className="group flex min-h-16 items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 text-lg font-bold shadow-sm transition focus-within:border-[#FF6B00] focus-within:ring-4 focus-within:ring-[#FF6B00]/12">
          <MapPin className="h-7 w-7 shrink-0 text-[#FF3B00]" strokeWidth={2} />
          <span className="sr-only">Location</span>
          <input
            type="text"
            name="location"
            placeholder="Postcode or city"
            className="min-w-0 flex-1 bg-transparent text-[#001b35] outline-none [&::placeholder]:text-slate-400 [&::placeholder]:opacity-100"
            style={{ color: "#001b35", WebkitTextFillColor: "#001b35" }}
          />
        </label>

        <button
          type="submit"
          className="min-h-16 rounded-2xl bg-[#FF6B00] px-6 text-xl font-black text-white shadow-[0_20px_45px_rgba(255,107,0,0.28)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/30"
        >
          Search
        </button>

        <div className="grid grid-cols-2 gap-3 pt-2 sm:flex sm:flex-wrap sm:justify-center">
          <SearchQuickButton name="category" value="Catering Equipment" icon={<PackageCheck />}>
            Equipment
          </SearchQuickButton>
          <SearchQuickButton name="category" value="Catering Vans & Trailers" icon={<Truck />}>
            Vans & Trailers
          </SearchQuickButton>
          <SearchQuickButton name="category" value="Catering Businesses" icon={<Store />}>
            Businesses
          </SearchQuickButton>
          <SearchQuickButton name="condition" value="used" icon={<Tag />}>
            Used
          </SearchQuickButton>
          <SearchQuickButton name="condition" value="new" icon={<Sparkles />}>
            New
          </SearchQuickButton>
        </div>
      </form>
    </section>
  )
}

function SearchQuickButton({
  name,
  value,
  icon,
  children,
}: {
  name: string
  value: string
  icon: ReactElement
  children: ReactNode
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#07182d] shadow-sm transition hover:border-[#FF6B00]/45 hover:text-[#FF3B00] focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/15"
    >
      <span className="text-[#07182d] [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      {children}
    </button>
  )
}

function CategorySection({ counts }: { counts: Record<CategoryKey, number | null> }) {
  const categoryCards: CategoryCardData[] = [
    {
      key: "equipment",
      title: "Catering Equipment",
      description: "Ovens, fridges, fryers and more",
      image: "/home-equipment-card.png",
      href: "/category/catering-equipment",
      fallbackLabel: "Browse equipment",
      icon: <Utensils className="h-8 w-8" strokeWidth={1.8} />,
    },
    {
      key: "vans",
      title: "Vans & Trailers",
      description: "Catering vans, trailers and vehicles",
      image: "/home-van-card.png",
      href: "/category/catering-vans-trailers",
      fallbackLabel: "Browse vans & trailers",
      icon: <Truck className="h-8 w-8" strokeWidth={1.8} />,
    },
    {
      key: "businesses",
      title: "Hospitality Businesses",
      description: "Cafes, restaurants and takeaways",
      image: "/home-business-card.png",
      href: "/category/catering-businesses",
      fallbackLabel: "Browse businesses",
      icon: <Store className="h-8 w-8" strokeWidth={1.8} />,
    },
  ]
  return (
    <section className="mt-10" aria-labelledby="categories-heading">
      <SectionHeader title="Browse top categories" href={searchAllHref} action="View all" />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {categoryCards.map((category) => (
          <CategoryCard key={category.key} category={category} count={counts[category.key]} />
        ))}
      </div>
    </section>
  )
}

function CategoryCard({ category, count }: { category: CategoryCardData; count: number | null }) {
  const countLabel = count && count > 0 ? `${count.toLocaleString("en-GB")} listing${count === 1 ? "" : "s"}` : category.fallbackLabel

  return (
    <Link
      href={category.href}
      className="group relative min-h-[250px] overflow-hidden rounded-[1.55rem] border border-white/14 bg-[#061d38] shadow-[0_24px_75px_rgba(0,0,0,0.24)] transition hover:-translate-y-1 hover:border-[#FF6B00]/70 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25"
    >
      <Image
        src={category.image}
        alt={category.title}
        fill
        sizes="(min-width: 768px) 33vw, 100vw"
        className="object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,18,40,0.12)_0%,rgba(0,18,40,0.94)_82%)]" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF6B00] text-white shadow-[0_18px_40px_rgba(255,107,0,0.34)]">
          {category.icon}
        </span>
        <h3 className="mt-4 text-2xl font-black tracking-[-0.035em] text-white">{category.title}</h3>
        <p className="mt-2 text-base font-semibold leading-snug text-white/75">{category.description}</p>
        <div className="mt-4 flex items-center justify-between text-[#FF6B00]">
          <span className="text-base font-black">{countLabel}</span>
          <ArrowRight className="h-7 w-7 transition group-hover:translate-x-1" strokeWidth={2.2} />
        </div>
      </div>
    </Link>
  )
}

function FeaturedListings({ listings }: { listings: Listing[] }) {
  return (
    <section className="mt-5 rounded-[1.7rem] border border-white/12 bg-[#031d38]/74 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:p-6">
      <SectionHeader title="Featured Listings" href={searchAllHref} action="View all listings" />

      {listings.length > 0 ? (
        <FeaturedCarousel listings={listings} />
      ) : (
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/6 p-6 text-center">
          <PackageCheck className="mx-auto h-12 w-12 text-[#FF6B00]" strokeWidth={1.7} />
          <h3 className="mt-4 text-2xl font-black text-white">Listings will appear here soon</h3>
          <p className="mx-auto mt-2 max-w-lg text-base font-semibold leading-relaxed text-white/70">
            Listings will appear here as sellers begin uploading equipment.
          </p>
          <Link
            href={sellHref}
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#FF6B00] px-6 text-sm font-black text-white shadow-[0_18px_45px_rgba(255,107,0,0.28)]"
          >
            Start Free Listing
          </Link>
        </div>
      )}
    </section>
  )
}

function WhyCaterBids() {
  const whyCards: BenefitCard[] = [
    {
      title: "No final value fees",
      description: "Keep more of what you earn. No hidden costs.",
      icon: <Percent className="h-10 w-10" strokeWidth={1.65} />,
    },
    {
      title: "Verified seller tools",
      description: "Build trust with buyer verification and reviews.",
      icon: <ShieldCheck className="h-10 w-10" strokeWidth={1.65} />,
    },
    {
      title: "CaterBot AI listing support",
      description: "Our AI helps you create better listings, faster.",
      icon: <Bot className="h-10 w-10" strokeWidth={1.65} />,
    },
    {
      title: "Delivery support",
      description: "Prepare quote-ready delivery details across the UK.",
      icon: <Truck className="h-10 w-10" strokeWidth={1.65} />,
    },
    {
      title: "Built for UK catering",
      description: "Designed for the needs of UK caterers.",
      icon: <BadgeCheck className="h-10 w-10" strokeWidth={1.65} />,
    },
    {
      title: "Easy search & discovery",
      description: "Find the right equipment, faster.",
      icon: <Search className="h-10 w-10" strokeWidth={1.65} />,
    },
  ]
  return (
    <section className="mt-5 rounded-[1.7rem] border border-white/12 bg-[#041e38]/82 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:p-6">
      <h2 className="text-3xl font-black tracking-[-0.04em] text-white">Why CaterBidsUK</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {whyCards.map((card) => (
          <article key={card.title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#061d3a] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.28)]">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#FF6B00] bg-[#FF6B00]/15 text-[#FF6B00]">
              {card.icon}
            </span>
            <span>
              <h3 className="text-lg font-black leading-tight text-white">{card.title}</h3>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-white/70">{card.description}</p>
            </span>
          </article>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  const howItWorks: StepCard[] = [
    {
      title: "Upload item",
      description: "Add photos, details and set your price in minutes.",
      icon: <Upload className="h-9 w-9" strokeWidth={1.7} />,
    },
    {
      title: "CaterBot helps fill details",
      description: "AI suggests titles, descriptions and categories.",
      icon: <Bot className="h-9 w-9" strokeWidth={1.7} />,
    },
    {
      title: "Buyers discover listings",
      description: "Buyers find your item through smart search.",
      icon: <Search className="h-9 w-9" strokeWidth={1.7} />,
    },
    {
      title: "Sell and arrange delivery",
      description: "Close the deal and arrange collection or delivery.",
      icon: <Truck className="h-9 w-9" strokeWidth={1.7} />,
    },
  ]
  return (
    <section className="mt-5 rounded-[1.7rem] border border-white/12 bg-[#02152c]/82 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:p-6">
      <h2 className="text-3xl font-black tracking-[-0.04em] text-white">How It Works</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        {howItWorks.map((step, index) => (
          <article key={step.title} className="relative rounded-2xl border border-white/10 bg-[#061d3a] p-5 text-center shadow-[0_6px_24px_rgba(0,0,0,0.28)]">
            <span className="absolute -top-3 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B00] text-sm font-black text-white shadow-lg">
              {index + 1}
            </span>
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FF6B00]/15 text-[#FF6B00]">
              {step.icon}
            </span>
            <h3 className="mt-5 text-lg font-black leading-tight text-white">{step.title}</h3>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-white/70">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function ClosingCta({ freeRemaining, freeCap }: { freeRemaining: number; freeCap: number }) {
  return (
    <section className="mt-5 overflow-hidden rounded-[1.7rem] border border-white/10 bg-[rgba(0,12,30,0.7)] p-5 sm:p-7">
      <div className="grid items-center gap-5 sm:grid-cols-[1fr_auto]">
        <div className="border-l-2 border-[#FF6B00]/55 pl-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.28em] text-[#FF6B00]">Limited time launch offer</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-white sm:text-2xl">
            {freeRemaining > 0
              ? `${freeRemaining} of ${freeCap} free listings left`
              : `All ${freeCap} free listing slots taken`}
          </h2>
          <p className="mt-1.5 text-sm font-semibold text-white/60">No fees. No catch. Join UK caterers buying and selling equipment.</p>
          <p className="mt-3 text-[0.65rem] font-black uppercase tracking-[0.28em] text-[#FF6B00]/70">BUY · SELL · SAVE</p>
        </div>
        <div className="flex flex-wrap gap-3 sm:min-w-[200px] sm:flex-col">
          <Link
            href={sellHref}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#FF6B00]/55 px-6 text-sm font-black text-[#FF6B00] transition hover:bg-[#FF6B00]/10 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30"
          >
            Start Free Listing
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
          <Link
            href={searchAllHref}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/12 px-6 text-sm font-black text-white/60 transition hover:text-white/85 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <Search className="h-4 w-4" strokeWidth={2.2} />
            Browse Equipment
          </Link>
        </div>
      </div>
    </section>
  )
}


function SectionHeader({ title, href, action }: { title: string; href: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-3 text-3xl font-black tracking-[-0.045em] text-white">
        <span className="h-9 w-1.5 rounded-full bg-[#FF6B00]" aria-hidden="true" />
        {title}
      </h2>
      <Link
        href={href}
        className="hidden items-center gap-2 text-sm font-black text-[#FF6B00] transition hover:text-orange-300 sm:flex"
      >
        {action}
        <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
      </Link>
    </div>
  )
}

