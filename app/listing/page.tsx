import type { Metadata } from "next"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import ListingPageClient from "./ListingPageClient"

type Props = {
  searchParams: Promise<{ id?: string }>
}

function formatTitlePrice(price: string | null | undefined): string {
  if (!price) return ""
  const num = parseFloat(String(price).replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(num) || num <= 0) return ""
  return `£${num.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Catering Equipment Listing | CaterBids UK",
    description:
      "View this catering equipment listing on CaterBids UK — details, seller information, specs and delivery options.",
  }

  const { id } = await searchParams
  if (
    !id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    return fallback
  }

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("listings")
      .select("title, price, description")
      .eq("id", id)
      .neq("status", "deleted")
      .single()

    if (!data?.title) return fallback

    const formattedPrice = formatTitlePrice(data.price)
    const title = formattedPrice
      ? `${data.title} — ${formattedPrice} | CaterBids UK`
      : `${data.title} | CaterBids UK`

    const rawDesc = String(data.description || "")
      .replace(/\s+/g, " ")
      .trim()
    const description =
      rawDesc.length > 10
        ? rawDesc.slice(0, 147) + (rawDesc.length > 147 ? "..." : "")
        : "View this catering equipment listing on CaterBids UK — details, seller information, specs and delivery options."

    return { title, description }
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
