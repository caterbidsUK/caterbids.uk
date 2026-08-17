import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight, Menu, Store, Truck, Utensils } from "lucide-react"
import SiteLogo from "@/components/SiteLogo"
import SiteFooter from "@/components/SiteFooter"
import { createClient } from "@/lib/supabase/server"

const searchAllHref = "/search"

const CATEGORIES = [
  {
    title: "Catering Equipment",
    description: "Ovens, fridges, fryers and more",
    image: "/home-equipment-card.png",
    icon: <Utensils className="h-8 w-8" strokeWidth={1.8} />,
  },
  {
    title: "Catering Vans & Trailers",
    description: "Catering vans, trailers and vehicles",
    image: "/home-van-card.png",
    icon: <Truck className="h-8 w-8" strokeWidth={1.8} />,
  },
  {
    title: "Catering Businesses",
    description: "Cafes, restaurants and takeaways",
    image: "/home-business-card.png",
    icon: <Store className="h-8 w-8" strokeWidth={1.8} />,
  },
]

export default async function PostListingStartPage() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id ?? null
  const accountHref = userId ? "/account" : "/login?next=%2Faccount"
  const accountLabel = userId ? "Account" : "Sign In"

  return (
    <>
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#001225]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <Link href="/" aria-label="CaterBidsUK home">
            <SiteLogo size="sm" />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-black text-white/80 lg:flex" aria-label="Primary">
            <Link className="transition hover:text-[#FF6B00]" href="/">Home</Link>
            <Link className="transition hover:text-[#FF6B00]" href={searchAllHref}>Marketplace</Link>
            <Link className="transition hover:text-[#FF6B00]" href="/blog">Blog</Link>
            <Link className="text-[#FF6B00]" href="/post-listing/start">Sell</Link>
            <Link className="transition hover:text-[#FF6B00]" href="/pricing">Pricing</Link>
            <Link className="transition hover:text-[#FF6B00]" href={accountHref}>{accountLabel}</Link>
          </nav>

          <details className="relative lg:hidden">
            <summary className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-full border border-white/20 bg-white/8 text-white [&::-webkit-details-marker]:hidden">
              <Menu className="h-6 w-6" strokeWidth={2.2} />
            </summary>
            <div className="absolute right-0 top-16 z-30 w-64 rounded-3xl border border-white/14 bg-[#001a34]/96 p-3 shadow-2xl backdrop-blur-xl">
              {(
                [
                  ["Home", "/"],
                  ["Marketplace", searchAllHref],
                  ["Blog", "/blog"],
                  ["Sell an Item", "/post-listing/start"],
                  ["Pricing", "/pricing"],
                  [accountLabel, accountHref],
                ] as [string, string][]
              ).map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black text-white transition hover:bg-white/8 hover:text-[#FF6B00]"
                >
                  {label}
                  <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
                </Link>
              ))}
            </div>
          </details>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────── */}
      <main className="bg-[#001B36] px-4 pb-20 pt-10 text-white sm:pt-14">
        <div className="mx-auto max-w-5xl">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-black text-white/55 transition hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
            Back to home
          </Link>

          {/* Heading */}
          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">
              Start your listing
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl lg:text-5xl">
              What are you selling?
            </h1>
            <p className="mt-2 text-base font-semibold text-white/55">
              Choose a category to begin. All listings are free during our launch period.
            </p>
          </div>

          {/* Cards — same markup and classes as CategoryCard in app/page.tsx */}
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.title}
                href={`/post-listing?category=${encodeURIComponent(cat.title)}`}
                className="group relative min-h-[250px] overflow-hidden rounded-[1.55rem] border border-white/14 bg-[#061d38] shadow-[0_24px_75px_rgba(0,0,0,0.24)] transition hover:-translate-y-1 hover:border-[#FF6B00]/70 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25"
              >
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,18,40,0.12)_0%,rgba(0,18,40,0.94)_82%)]" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF6B00] text-white shadow-[0_18px_40px_rgba(255,107,0,0.34)]">
                    {cat.icon}
                  </span>
                  <h2 className="mt-4 text-2xl font-black tracking-[-0.035em] text-white">{cat.title}</h2>
                  <p className="mt-2 text-base font-semibold leading-snug text-white/75">{cat.description}</p>
                  <div className="mt-4 flex items-center justify-between text-[#FF6B00]">
                    <span className="text-base font-black">Sell now</span>
                    <ArrowRight className="h-7 w-7 transition group-hover:translate-x-1" strokeWidth={2.2} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
