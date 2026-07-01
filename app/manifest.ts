import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CaterBidsUK",
    short_name: "CaterBids",
    description: "The UK Marketplace for Catering Equipment — BUY • SELL • SAVE",
    start_url: "/",
    display: "standalone",
    background_color: "#001225",
    theme_color: "#FF6B00",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
