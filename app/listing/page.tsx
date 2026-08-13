import type { Metadata } from "next"
import { Suspense } from "react"
import { permanentRedirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import ListingPageClient from "./ListingPageClient"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Listing | CaterBids",
    description: "Browse quality used catering equipment for sale on CaterBids UK.",
  }

  try {
    const { id } = await searchParams
    const listingId = Array.isArray(id) ? id[0] : id
    if (!listingId) return fallback

    const admin = createAdminClient()
    const { data } = await (admin.from("listings" as any) as any)
      .select("title, description, category, price")
      .eq("id", listingId)
      .maybeSingle()

    if (!data) return fallback

    // DB titles may contain HTML entities (e.g. &amp;) from legacy input paths.
    // Next.js re-encodes metadata strings, so decode first to avoid double-encoding.
    const decodeHtml = (s: string) =>
      s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")

    const rawTitle = decodeHtml((data.title as string | null) ?? "")
    const rawDesc = decodeHtml((data.description as string | null) ?? "")

    const suffix = " | CaterBids"
    const maxTitle = 60 - suffix.length // 48 chars for the listing title portion
    let titlePart = rawTitle
    if (rawTitle.length > maxTitle) {
      const cut = rawTitle.slice(0, maxTitle - 1) // reserve 1 char for "…"
      const lastSpace = cut.lastIndexOf(" ")
      titlePart = (lastSpace > 0 ? rawTitle.slice(0, lastSpace) : cut) + "…"
    }
    const pageTitle = rawTitle ? titlePart + suffix : "Listing | CaterBids"
    const pageDescription = rawDesc.slice(0, 155) ||
      "Find quality used catering equipment for sale on CaterBids UK."

    return {
      title: pageTitle,
      description: pageDescription,
      openGraph: {
        title: pageTitle,
        description: pageDescription,
      },
    }
  } catch {
    return fallback
  }
}

export default async function ListingPage({ searchParams }: Props) {
  const params = await searchParams
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  if (id) {
    let slug: string | null = null
    try {
      const admin = createAdminClient()
      const { data } = await (admin.from("listings" as any) as any)
        .select("slug")
        .eq("id", id)
        .maybeSingle()
      slug = (data as { slug?: string | null } | null)?.slug ?? null
    } catch {
      // DB lookup failed — fall through and let the client component handle it
    }

    if (slug) {
      const featuredParam = params.featured === "success" ? "?featured=success" : ""
      permanentRedirect(`/listing/${slug}${featuredParam}`)
    }
  }

  return (
    <Suspense
      fallback={
        <div className="app-bg flex min-h-screen items-center justify-center text-white">
          <div className="animate-pulse text-white/50">Loading...</div>
        </div>
      }
    >
      <ListingPageClient />
    </Suspense>
  )
}
