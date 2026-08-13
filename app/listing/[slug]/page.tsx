import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import ListingPage from "../ListingPageClient"

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
    const admin = createAdminClient()
    const { data } = await (admin.from("listings" as any) as any)
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

export default async function ListingSlugPage({ params }: Props) {
  const { slug } = await params
  const admin    = createAdminClient()
  const { data } = await (admin.from("listings" as any) as any)
    .select("id")
    .eq("slug", slug)
    .neq("status", "deleted")
    .maybeSingle()

  if (!data?.id) notFound()

  return <ListingPage listingId={data.id} />
}
