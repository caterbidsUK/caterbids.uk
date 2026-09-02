import type { Metadata } from "next"
import { categoryBySlug } from "@/lib/categories"
import CategoryPageClient from "./CategoryPageClient"
import { getFreeListingsRemaining } from "@/lib/counters"

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
  const { remaining: freeRemaining } = await getFreeListingsRemaining()
  return <CategoryPageClient params={params} freeRemaining={freeRemaining} />
}
