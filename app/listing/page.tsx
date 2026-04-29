"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  MapPin,
  Tag,
  Shield,
  Clock,
  MessageCircle,
  Share2,
  Heart,
  AlertTriangle,
  Eye,
} from "lucide-react"

type Listing = {
  id: string
  title: string
  price: string
  location: string
  category: string
  condition: string
  description: string
  image?: string
}

function ListingContent() {
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get("id")

  const [listing, setListing] = useState<Listing | null>(null)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    const listings = JSON.parse(localStorage.getItem("caterbids_listings") || "[]")
    const found = listings.find((item: Listing) => item.id === id)
    if (found) {
      setListing(found)
      return
    }
    const current = JSON.parse(localStorage.getItem("caterbids_current_listing") || "null")
    setListing(current)
  }, [id])

  if (!listing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#001633] text-white px-4">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-white/30" />
          <p className="mt-4 text-lg font-semibold text-white/70">Listing not found</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded-xl bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Back to Home
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#001633] text-white pb-8">
      <div className="mx-auto max-w-3xl">
        {/* Image Header */}
        <div className="relative">
          {listing.image ? (
            <div className="relative h-64 sm:h-80 overflow-hidden">
              <img
                src={listing.image}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001633] via-transparent to-transparent" />
            </div>
          ) : (
            <div className="h-48 sm:h-64 bg-white/5 flex items-center justify-center">
              <Tag className="h-12 w-12 text-white/20" />
            </div>
          )}

          {/* Top Actions */}
          <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
            <button
              onClick={() => router.push("/")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLiked(!liked)}
                className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] ${
                  liked ? "bg-red-500/80" : "bg-black/30 hover:bg-black/50"
                }`}
              >
                <Heart className={`h-5 w-5 ${liked ? "fill-white" : ""}`} />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Price Badge */}
          <div className="absolute bottom-4 left-4 sm:left-6">
            <span className="rounded-xl bg-[#FF6B00] px-4 py-2 text-lg font-bold text-white shadow-lg shadow-orange-500/30">
              {listing.price}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 -mt-2 relative z-10">
          {/* Title & Meta */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
            <h1 className="text-xl font-bold leading-snug sm:text-2xl">{listing.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                <MapPin className="h-3 w-3" /> {listing.location}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                <Tag className="h-3 w-3" /> {listing.category}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                <Shield className="h-3 w-3" /> {listing.condition}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-white/50">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> Listed just now
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" /> 1 view
              </span>
            </div>
          </div>

          {/* Live Badge */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3">
            <div className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </div>
            <span className="text-sm font-medium text-green-400">Your listing is live</span>
          </div>

          {/* Description */}
          <div className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/50">Description</h2>
            <p className="mt-3 leading-relaxed text-white/80 whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          {/* Safety Tips */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Shield className="h-4 w-4 text-[#FF6B00]" />
              Safety Tips
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-white/60">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6B00]" />
                Meet in a safe, public place when possible
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6B00]" />
                Inspect the item thoroughly before paying
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6B00]" />
                Use secure payment methods with buyer protection
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B00] py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02] hover:shadow-orange-500/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#001633]">
              <MessageCircle className="h-5 w-5" />
              Contact Seller
            </button>
            <button className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]">
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function ListingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#001633] text-white flex items-center justify-center">
          <div className="animate-pulse text-white/50">Loading...</div>
        </div>
      }
    >
      <ListingContent />
    </Suspense>
  )
}
