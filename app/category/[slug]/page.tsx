import type { Metadata } from "next"
import { CATERING_CATEGORIES, categoryBySlug } from "@/lib/categories"
import CategoryPageClient from "./CategoryPageClient"
import { getFreeListingsRemaining } from "@/lib/counters"
import { createPublicClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"

type Listing = Database["public"]["Tables"]["listings"]["Row"]

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = categoryBySlug(slug)

  if (!category) {
    return {
      title: "Catering Equipment for Sale | CaterBids UK",
      description: "Browse used commercial catering equipment listings for sale across the UK on CaterBids.",
    }
  }

  return {
    title: `New and Used ${category.title} for Sale | CaterBids UK`,
    description: `Browse new and used ${category.title.toLowerCase()} listings for sale across the UK. ${category.description.replace(/\.$/, "")} on CaterBids.`,
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const category = categoryBySlug(slug)
  const { remaining: freeRemaining } = await getFreeListingsRemaining()

  let initialListings: Listing[] = []
  if (category) {
    try {
      const supabase = createPublicClient()
      let query = (supabase.from("listings" as any) as any)
        .select("*")
        .eq("status", "live")
        .order("created_at", { ascending: false })

      if (category.marketplaceType) {
        query = query.eq("category", category.title)
      } else {
        // CATERING sub-category: match on subcategory field using first keyword from title
        const keyword = category.title.split(/[\s,&]+/).filter(Boolean)[0] ?? ""
        if (keyword) query = query.ilike("subcategory", `%${keyword}%`)
      }

      const { data } = await query
      initialListings = (data || []) as Listing[]
    } catch {
      // fall through — client will fetch its own data
    }
  }

  return <CategoryPageClient params={params} freeRemaining={freeRemaining} initialListings={initialListings} />
}
