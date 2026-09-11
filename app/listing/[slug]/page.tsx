import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { createPublicClient } from "@/lib/supabase/server"
import ListingPage from "../ListingPageClient"
import { parseListingPrice } from "@/lib/price"

type RelatedListing = {
  id: string
  slug: string | null
  title: string | null
  price: string | null
  images: string[] | null
  image_url: string | null
  subcategory: string | null
  condition: string | null
  location: string | null
  city: string | null
}

function RelatedCard({ listing }: { listing: RelatedListing }) {
  const imgs = Array.isArray(listing.images)
    ? listing.images.filter((u): u is string => typeof u === "string" && Boolean(u))
    : []
  const thumb = imgs[0] ?? listing.image_url ?? null
  const href = listing.slug ? `/listing/${listing.slug}` : null
  if (!href) return null
  return (
    <Link href={href} className="group block overflow-hidden rounded-2xl border border-white/10 bg-[#001633] transition hover:border-[#FF6B00]/40">
      <div className="relative flex h-44 items-center justify-center bg-[#001B35]">
        {thumb ? (
          <img src={thumb} alt={listing.title ?? ""} className="h-full w-full object-contain transition group-hover:scale-[1.02]" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-white/10" />
        )}
      </div>
      <div className="p-3">
        {listing.subcategory && (
          <span className="mb-1.5 inline-block rounded-full border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[10px] font-bold text-white/60">
            {listing.subcategory}
          </span>
        )}
        <p className="line-clamp-2 text-sm font-bold leading-snug text-white">{listing.title}</p>
        <p className="mt-1.5 text-base font-black text-[#FF6B00]">
          {listing.price ? (listing.price.startsWith("£") ? listing.price : `£${listing.price}`) : ""}
        </p>
        <p className="mt-0.5 text-xs text-white/45">{listing.city || listing.location || "UK"}</p>
      </div>
    </Link>
  )
}

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Listing | CaterBids",
    description: "Browse quality used catering equipment for sale on CaterBids UK.",
  }

  try {
    const { slug } = await params
    const client = createPublicClient()
    const { data } = await (client.from("listings" as any) as any)
      .select("title, description")
      .eq("slug", slug)
      .maybeSingle()

    if (!data) return fallback

    const decodeHtml = (s: string) =>
      s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")

    const rawTitle = decodeHtml((data.title as string | null) ?? "")
    const rawDesc  = decodeHtml((data.description as string | null) ?? "")

    const suffix   = " | CaterBids"
    const maxTitle = 60 - suffix.length
    let titlePart  = rawTitle
    if (rawTitle.length > maxTitle) {
      const cut       = rawTitle.slice(0, maxTitle - 1)
      const lastSpace = cut.lastIndexOf(" ")
      titlePart       = (lastSpace > 0 ? rawTitle.slice(0, lastSpace) : cut) + "…"
    }
    const pageTitle       = rawTitle ? titlePart + suffix : "Listing | CaterBids"
    const pageDescription = rawDesc.slice(0, 155) ||
      "Find quality used catering equipment for sale on CaterBids UK."

    return {
      title:       pageTitle,
      description: pageDescription,
      openGraph:   { title: pageTitle, description: pageDescription },
    }
  } catch {
    return fallback
  }
}

function toSchemaAvailability(status: string | null | undefined): string {
  if (status === "live") return "https://schema.org/InStock"
  if (status === "sold") return "https://schema.org/SoldOut"
  return "https://schema.org/Discontinued"
}

function toSchemaCondition(condition: string | null | undefined): string {
  if (condition === "New") return "https://schema.org/NewCondition"
  if (condition === "Refurbished") return "https://schema.org/RefurbishedCondition"
  if (condition === "Spares or Repair") return "https://schema.org/DamagedCondition"
  return "https://schema.org/UsedCondition"
}

export default async function ListingSlugPage({ params }: Props) {
  const { slug } = await params
  const client = createPublicClient()
  const { data } = await (client.from("listings" as any) as any)
    .select("*")
    .eq("slug", slug)
    .neq("status", "deleted")
    .maybeSingle()

  if (!data?.id) notFound()
  if (data.status === "removed" || data.status === "payment_pending") notFound()

  // Related listings: subcategory first, then category fallback to reach 3
  const listingSubcategory: string | null = data.subcategory ?? null
  const listingCategory: string | null = data.category ?? null
  const listingUserId: string | null = data.user_id ?? null

  let related: RelatedListing[] = []
  try {
    if (listingSubcategory) {
      const { data: bySub } = await (client.from("listings" as any) as any)
        .select("id, slug, title, price, images, image_url, subcategory, condition, location, city")
        .eq("status", "live")
        .eq("subcategory", listingSubcategory)
        .neq("slug", slug)
        .limit(6)
      related = (bySub || []) as RelatedListing[]
    }
    if (related.length < 3 && listingCategory) {
      const existingIds = related.map((r) => r.id)
      let fallback = (client.from("listings" as any) as any)
        .select("id, slug, title, price, images, image_url, subcategory, condition, location, city")
        .eq("status", "live")
        .eq("category", listingCategory)
        .neq("slug", slug)
        .limit(6 - related.length)
      if (existingIds.length > 0) fallback = fallback.not("id", "in", `(${existingIds.join(",")})`)
      const { data: byCat } = await fallback
      related = [...related, ...((byCat || []) as RelatedListing[])]
    }
  } catch {
    related = []
  }

  let sellerListings: RelatedListing[] = []
  try {
    if (listingUserId) {
      const { data: byUser } = await (client.from("listings" as any) as any)
        .select("id, slug, title, price, images, image_url, subcategory, condition, location, city")
        .eq("status", "live")
        .eq("user_id", listingUserId)
        .neq("slug", slug)
        .limit(3)
      sellerListings = (byUser || []) as RelatedListing[]
    }
  } catch {
    sellerListings = []
  }

  const rawImages: string[] = Array.isArray(data.images) ? data.images : []
  const schemaImages: string[] = rawImages.filter(
    (img: string) => typeof img === "string" && img.startsWith("http")
  )
  if (schemaImages.length === 0 &&
      typeof data.image_url === "string" && data.image_url.startsWith("http")) {
    schemaImages.push(data.image_url)
  }
  const numericPrice = parseListingPrice(data.price)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.title ?? "",
    description: data.description ?? "",
    ...(schemaImages.length > 0 ? { image: schemaImages } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      ...(numericPrice ? { price: numericPrice } : {}),
      availability: toSchemaAvailability(data.status),
      itemCondition: toSchemaCondition(data.condition),
    },
  }

  const relatedLabel = listingSubcategory || listingCategory || "listings"

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ListingPage listingId={data.id} initialListing={data} />
      {related.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-12 pt-2 sm:px-6">
          <h2 className="mb-4 text-lg font-black text-white">More {relatedLabel}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => <RelatedCard key={r.id} listing={r} />)}
          </div>
        </section>
      )}
      {sellerListings.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-2 sm:px-6">
          <h2 className="mb-4 text-lg font-black text-white">More from this seller</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sellerListings.map((r) => <RelatedCard key={r.id} listing={r} />)}
          </div>
        </section>
      )}
    </>
  )
}
