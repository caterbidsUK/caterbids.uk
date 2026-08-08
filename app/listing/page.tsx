import type { Metadata } from "next"
import { Suspense } from "react"
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

    const rawTitle = (data.title as string | null) ?? ""
    const rawDesc = (data.description as string | null) ?? ""

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

export default function ListingPage() {
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
