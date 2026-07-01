"use client"

import Link from "next/link"
import { ArrowRight, Bell, MapPin, PackageCheck } from "lucide-react"
import type { Database } from "@/types/supabase"
import { isFeaturedAndActive } from "@/lib/featured"

type Listing = Database["public"]["Tables"]["listings"]["Row"]

function imageUrls(listing: Listing) {
  const images = Array.isArray(listing.images)
    ? listing.images.filter((image): image is string => typeof image === "string" && Boolean(image))
    : []
  return images.length > 0 ? images : listing.image_url ? [listing.image_url] : []
}

function formatPrice(price: unknown) {
  const value = String(price ?? "").trim()
  if (!value) return "Price on request"
  if (value.startsWith("£")) return value

  const numeric = Number(value.replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(numeric) || numeric <= 0) return value
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(numeric)
}

function conditionLabel(condition?: string | null) {
  const value = String(condition || "").trim()
  return value || "Used"
}

export default function FeaturedListingCard({ listing }: { listing: Listing }) {
  const images = imageUrls(listing)
  const title = listing.title || "CaterBidsUK listing"
  const location = listing.city || listing.location || "UK"

  return (
    <article className="overflow-hidden rounded-3xl border border-white/12 bg-[#041f3f] shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
      <div className="relative h-48 overflow-hidden bg-[#002E5D]">
        {images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0]} alt={title} className="block h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-white/45">
            <PackageCheck className="h-16 w-16" strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#041f3f] via-transparent to-transparent" />
        {isFeaturedAndActive(listing as Record<string, unknown>) && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border-2 border-[#FF6B00] bg-[#0a2a4a] px-2 py-1 shadow-[0_0_10px_rgba(255,107,0,0.35)]">
            <Bell className="h-3 w-3 fill-[#FF6B00] text-[#FF6B00]" />
            <span className="text-[9px] font-black uppercase leading-none tracking-wide text-white">Featured</span>
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 min-h-[3.25rem] text-xl font-black leading-tight tracking-[-0.03em] text-white">
          {title}
        </h3>
        <p className="mt-1 text-sm font-semibold text-white/65">
          {listing.subcategory || listing.category || "Catering Equipment"}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-2xl font-black text-[#FF6B00]">{formatPrice(listing.price)}</span>
          <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-black text-white/82">
            {conditionLabel(listing.condition)}
          </span>
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-white/72">
          <MapPin className="h-4 w-4 text-white/58" strokeWidth={2} />
          {location}
        </p>
        <Link
          href={`/listing?id=${encodeURIComponent(String(listing.id))}`}
          className="mt-4 flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-[#FF6B00] px-5 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,107,0,0.24)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/25"
        >
          View Details
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Link>
      </div>
    </article>
  )
}
