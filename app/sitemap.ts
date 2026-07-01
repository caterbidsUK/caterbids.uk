import type { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://caterbids.uk"

const categorySlugs = [
  "catering-equipment",
  "catering-vans-trailers",
  "catering-businesses",
  "cooking-equipment",
  "refrigeration",
  "food-preparation",
  "warewashing-sinks",
  "coffee-bar-equipment",
  "display-serving",
  "stainless-steel-storage",
  "parts-spares",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl,                             changeFrequency: "daily",   priority: 1.0 },
    { url: `${baseUrl}/search`,                 changeFrequency: "hourly",  priority: 0.9 },
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

  const categoryPages: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${baseUrl}/category/${slug}`,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }))

  return [...staticPages, ...categoryPages]
}
