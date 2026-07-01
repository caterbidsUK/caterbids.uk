import type { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://caterbids.uk"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/account/",
        "/settings/",
        "/messages/",
        "/checkout/",
        "/auth/",
        "/reset-password/",
        "/favourites/",
        "/saved-searches/",
        "/post-listing/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
