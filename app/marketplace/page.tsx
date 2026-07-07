import { redirect } from "next/navigation"

export default function MarketplaceRedirectPage() {
  redirect("/search?q=all&category=All%20Categories&location=All%20UK")
}
