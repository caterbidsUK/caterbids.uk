import type { MetadataRoute } from "next"
import { CATERING_CATEGORIES, MARKETPLACE_CATEGORIES } from "@/lib/categories"
import { createAdminClient } from "@/lib/supabase/admin"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://caterbids.uk"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl,                             changeFrequency: "daily",   priority: 1.0 },
    { url: `${baseUrl}/search`,                 changeFrequency: "hourly",  priority: 0.3 },
    { url: `${baseUrl}/blog`,                   changeFrequency: "weekly",  priority: 0.8 },
    { url: `${baseUrl}/how-it-works`,           changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/pricing`,                changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/about`,                  changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/contact`,                changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/safety`,                 changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/buyer-safety`,           changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/seller-safety`,          changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/delivery-policy`,        changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/pallet-delivery-guide`,  changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/terms`,                  changeFrequency: "yearly",  priority: 0.4 },
    { url: `${baseUrl}/privacy-policy`,         changeFrequency: "yearly",  priority: 0.4 },
    { url: `${baseUrl}/refund-policy`,          changeFrequency: "yearly",  priority: 0.4 },
    { url: `${baseUrl}/legal/cookies`,          changeFrequency: "yearly",  priority: 0.3 },
    { url: `${baseUrl}/legal/prohibited-items`, changeFrequency: "yearly",  priority: 0.3 },
  ]

  const categoryPages: MetadataRoute.Sitemap = [
    ...MARKETPLACE_CATEGORIES,
    ...CATERING_CATEGORIES,
  ].map((cat) => ({
    url: `${baseUrl}/category/${cat.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }))

  const admin = createAdminClient()

  // Blog posts — published only, excluding test-category posts
  let blogEntries: MetadataRoute.Sitemap = []
  try {
    const { data, error } = await (admin.from("blog_posts" as any) as any)
      .select("slug, updated_at, created_at, category")
      .eq("status", "published")
      .order("created_at", { ascending: false })
    if (error) throw error
    blogEntries = (
      data as Array<{ slug: string; updated_at: string | null; created_at: string; category: string | null }>
    )
      .filter((post) => post.category?.toLowerCase() !== "test")
      .map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updated_at || post.created_at,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }))
  } catch (err) {
    console.error("sitemap: blog_posts query failed:", err)
  }

  // Listings — live status only, excluding test-profile sellers
  let listingEntries: MetadataRoute.Sitemap = []
  try {
    const { data: testProfiles } = await admin
      .from("profiles")
      .select("id")
      .eq("is_test", true)
    const testIds = ((testProfiles || []) as Array<{ id: string }>).map((p) => p.id)

    let query = (admin.from("listings" as any) as any)
      .select("id, updated_at")
      .eq("status", "live")
    if (testIds.length > 0) {
      query = query.not("seller_id", "in", `(${testIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error
    listingEntries = (data as Array<{ id: string; updated_at: string | null }>).map((listing) => ({
      url: `${baseUrl}/listing?id=${encodeURIComponent(listing.id)}`,
      lastModified: listing.updated_at ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))
  } catch (err) {
    console.error("sitemap: listings query failed:", err)
  }

  return [...staticPages, ...categoryPages, ...blogEntries, ...listingEntries]
}
