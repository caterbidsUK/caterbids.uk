import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Tag } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { MARKETPLACE_CATEGORIES, CATERING_CATEGORIES } from "@/lib/categories"

const PER_PAGE = 24

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page } = await searchParams
  const pageNum = Math.max(1, parseInt(String(page || "1"), 10))

  const base = {
    description:
      "Browse used commercial catering equipment, vans, trailers and catering businesses for sale across the UK — ovens, fridges, coffee machines and more. No middleman.",
  }

  if (pageNum <= 1) {
    return {
      ...base,
      title: "Used Catering Equipment for Sale UK | CaterBids Marketplace",
      alternates: { canonical: "/marketplace" },
    }
  }

  return {
    ...base,
    title: `Used Catering Equipment for Sale UK — Page ${pageNum} | CaterBids`,
    alternates: { canonical: `/marketplace?page=${pageNum}` },
  }
}

function formatPrice(price: unknown): string {
  const v = String(price ?? "").trim()
  if (!v) return "POA"
  return v.startsWith("£") ? v : `£${v}`
}

function firstImage(images: unknown, imageUrl: unknown): string | null {
  const arr = Array.isArray(images)
    ? images.filter((u): u is string => typeof u === "string" && Boolean(u))
    : []
  if (arr[0]) return arr[0]
  return typeof imageUrl === "string" && imageUrl ? imageUrl : null
}

const ALL_CATEGORIES = [...MARKETPLACE_CATEGORIES, ...CATERING_CATEGORIES]

export default async function MarketplacePage({ searchParams }: Props) {
  const { page } = await searchParams
  const pageNum = Math.max(1, parseInt(String(page || "1"), 10))
  const from = (pageNum - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  const supabase = await createClient()
  const { data, count, error } = await supabase
    .from("listings")
    .select("id, title, price, category, location, city, images, image_url, subcategory, condition", { count: "exact" })
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("Marketplace listings error:", error.message)
  }

  type ListingRow = {
    id: string
    title: string | null
    price: string | null
    category: string | null
    location: string | null
    city: string | null
    images: unknown
    image_url: string | null
    subcategory: string | null
    condition: string | null
  }

  const listings = (data ?? []) as ListingRow[]
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <main className="app-bg min-h-screen pb-24 text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">

        {/* Hero */}
        <section className="mb-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FF6B00]">CaterBids UK</p>
          <h1 className="mt-1 text-4xl font-black sm:text-5xl">Used Catering Equipment</h1>
          <p className="mt-3 max-w-2xl text-white/65">
            {total > 0 ? `${total} live listing${total === 1 ? "" : "s"}` : "Listings"} — ovens, fridges, vans, coffee machines and more.
            Buy direct from sellers across the UK.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/post-listing/start"
              className="premium-button inline-flex rounded-2xl px-5 py-2.5 text-sm font-black"
            >
              List yours for free
            </Link>
            <Link
              href="/search"
              className="soft-button inline-flex rounded-2xl px-5 py-2.5 text-sm font-black"
            >
              Search &amp; Filter
            </Link>
          </div>
        </section>

        {/* Categories */}
        <section className="mb-10">
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-white/55">Browse by category</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {ALL_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3 text-sm font-bold text-white/80 transition hover:border-[#FF6B00]/50 hover:bg-white/[0.10] hover:text-white"
              >
                <span className="block">{cat.title}</span>
                <span className="mt-1 line-clamp-2 block text-xs font-medium leading-relaxed text-white/45">
                  {cat.description}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Listings */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">All Listings</h2>
            {total > 0 && (
              <span className="text-sm text-white/55">
                {pageNum > 1
                  ? `Page ${pageNum} of ${totalPages}`
                  : `${total} found`}
              </span>
            )}
          </div>

          {listings.length === 0 ? (
            <div className="premium-card rounded-3xl p-10 text-center">
              <Tag className="mx-auto h-10 w-10 text-white/35" />
              <h3 className="mt-4 text-xl font-black">No live listings right now</h3>
              <p className="mt-2 text-sm text-white/55">Check back soon — or list something yourself.</p>
              <Link
                href="/post-listing/start"
                className="premium-button mt-5 inline-flex rounded-2xl px-5 py-2.5 text-sm font-black"
              >
                List yours for free
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((item) => {
                const image = firstImage(item.images, item.image_url)
                return (
                  <Link
                    key={item.id}
                    href={`/listing?id=${encodeURIComponent(item.id)}`}
                    className="premium-card group overflow-hidden rounded-3xl"
                  >
                    <div className="relative h-56 bg-[#001B35]">
                      {image ? (
                        <Image
                          src={image}
                          alt={item.title ?? "Catering equipment listing"}
                          fill
                          className="object-contain transition group-hover:scale-[1.02]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Tag className="h-10 w-10 text-white/35" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-2 flex flex-wrap gap-2">
                        {item.subcategory && (
                          <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-1 text-[11px] font-bold text-white/65">
                            {item.subcategory}
                          </span>
                        )}
                        {item.condition && (
                          <span className="rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-2 py-1 text-[11px] font-bold text-orange-100">
                            {item.condition}
                          </span>
                        )}
                      </div>
                      <h3 className="line-clamp-2 font-black">{item.title}</h3>
                      <p className="mt-2 text-xl font-black text-[#FF6B00]">{formatPrice(item.price)}</p>
                      <p className="mt-1 text-sm text-white/55">{item.city || item.location || "UK"}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
              {pageNum > 1 && (
                <Link
                  href={pageNum === 2 ? "/marketplace" : `/marketplace?page=${pageNum - 1}`}
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-bold text-white/80 transition hover:border-[#FF6B00]/50 hover:text-white"
                >
                  ← Previous
                </Link>
              )}
              <span className="text-sm text-white/45">Page {pageNum} of {totalPages}</span>
              {pageNum < totalPages && (
                <Link
                  href={`/marketplace?page=${pageNum + 1}`}
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-bold text-white/80 transition hover:border-[#FF6B00]/50 hover:text-white"
                >
                  Next →
                </Link>
              )}
            </nav>
          )}
        </section>

      </div>
    </main>
  )
}
