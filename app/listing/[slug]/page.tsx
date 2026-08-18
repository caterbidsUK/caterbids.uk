import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createPublicClient } from "@/lib/supabase/server"
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

  const images: string[] = Array.isArray(data.images) ? data.images : []
  const schemaImage = images.find((img: string) => img && !img.startsWith("data:"))
  const numericPrice = (data.price as string | null)?.replace(/[£,\s]/g, "") ?? undefined

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.title ?? "",
    description: data.description ?? "",
    ...(schemaImage ? { image: schemaImage } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      ...(numericPrice ? { price: numericPrice } : {}),
      availability: toSchemaAvailability(data.status),
      itemCondition: toSchemaCondition(data.condition),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ListingPage listingId={data.id} initialListing={data} />
    </>
  )
}
