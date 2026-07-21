"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Copy, ExternalLink, ListPlus, PackageCheck, Share2, UserCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import FeaturedBoostButton from "@/components/FeaturedBoostButton"

type Listing = {
  id: string
  title: string | null
  price: string | null
  images: unknown
  image_url: string | null
  status: string | null
  featured: boolean | null
  featured_until: string | null
}

function formatPrice(price: string | null) {
  if (!price) return "Price on request"
  const numeric = Number(String(price).replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(numeric) || numeric <= 0) return price
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(numeric)
}

function heroImage(listing: Listing): string | null {
  const images = Array.isArray(listing.images)
    ? (listing.images as unknown[]).filter(
        (img): img is string =>
          typeof img === "string" && Boolean(img) && !img.startsWith("data:")
      )
    : []
  return images[0] ?? listing.image_url ?? null
}

function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // user dismissed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard blocked — silently ignore
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/7 px-4 text-sm font-black text-white transition hover:bg-white/12"
    >
      {copied ? (
        <>
          <Copy className="h-4 w-4 text-emerald-400" />
          <span className="text-emerald-400">Link copied!</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Share listing
        </>
      )}
    </button>
  )
}

export default function PostListingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id")

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      router.replace("/post-listing/start")
      return
    }

    const supabase = createClient()

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      const { data } = await supabase
        .from("listings")
        .select("id, title, price, images, image_url, status, featured, featured_until")
        .eq("id", id as string)
        .eq("seller_id", user.id)
        .single()

      if (!data) {
        router.replace("/account")
        return
      }

      setListing(data as Listing)
      setLoading(false)
    }

    load()
  }, [id, router])

  if (loading || !listing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#002E5D]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#FF6B00]" />
      </main>
    )
  }

  const image = heroImage(listing)
  const price = formatPrice(listing.price)
  const listingPath = `/listing?id=${encodeURIComponent(listing.id)}`
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://caterbids.uk"}${listingPath}`

  return (
    <main className="min-h-screen bg-[#002E5D]">

      {/* Hero section */}
      <div className="relative overflow-hidden px-4 pb-10 pt-14 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
          <div className="h-64 w-64 rounded-full bg-[#FF6B00]/12 blur-3xl" />
        </div>
        <div className="relative">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#FF6B00]/40 bg-[#FF6B00]/15 shadow-[0_0_48px_rgba(255,107,0,0.25)]">
            <CheckCircle2 className="h-11 w-11 text-[#FF6B00]" strokeWidth={1.8} />
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-white">
            Your listing is live!
          </h1>
          <p className="mt-3 text-sm font-semibold text-white/60">
            Buyers across the UK can now find your equipment on CaterBids.
          </p>
        </div>
      </div>

      <div className="px-4 pb-16">
        <div className="mx-auto max-w-lg space-y-5">

          {/* Listing preview card */}
          <div className="overflow-hidden rounded-3xl border border-[#FF6B00]/20 bg-[#041f3f] shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
            <div className="relative">
              {image ? (
                <div className="h-56 overflow-hidden bg-[#001a3a]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={listing.title ?? "Your listing"}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-56 items-center justify-center bg-[#001a3a] text-white/20">
                  <PackageCheck className="h-20 w-20" strokeWidth={1.2} />
                </div>
              )}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Live
              </span>
            </div>
            <div className="border-t border-white/8 p-5">
              <p className="line-clamp-2 text-xl font-black leading-snug text-white">
                {listing.title ?? "Your listing"}
              </p>
              <p className="mt-2 text-3xl font-black text-[#FF6B00]">{price}</p>
            </div>
          </div>

          {/* Primary CTA */}
          <Link
            href={listingPath}
            className="flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-[#FF6B00] px-5 text-base font-black text-white shadow-[0_16px_48px_rgba(255,107,0,0.30)] transition hover:brightness-110"
          >
            <ExternalLink className="h-5 w-5" />
            View your live listing
          </Link>

          {/* Secondary actions */}
          <div className="grid grid-cols-2 gap-3">
            <ShareButton url={shareUrl} title={listing.title ?? "My CaterBidsUK listing"} />
            <Link
              href="/post-listing/start"
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/7 px-4 text-sm font-black text-white transition hover:bg-white/12"
            >
              <ListPlus className="h-4 w-4" />
              List another
            </Link>
          </div>

          {/* Boost upsell */}
          <div className="rounded-3xl border border-[#FF6B00]/15 bg-[#041f3f] p-5">
            <p className="mb-1 text-sm font-black text-white">Want to sell faster?</p>
            <p className="mb-4 text-xs font-semibold text-white/50">
              Feature your listing to appear on the homepage &amp; top of search results.
            </p>
            <FeaturedBoostButton
              listingId={listing.id}
              isFeatured={Boolean(listing.featured)}
              featuredUntil={listing.featured_until ?? null}
            />
          </div>

          {/* Back to account */}
          <div className="text-center">
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/40 transition hover:text-white/65"
            >
              <UserCircle2 className="h-4 w-4" />
              Back to account
            </Link>
          </div>

        </div>
      </div>
    </main>
  )
}
