import type { ReactNode } from "react"
import { MarketplaceRouteLock } from "@/lib/route-locks"

export default function SearchLayout({ children }: { children: ReactNode }) {
  return <MarketplaceRouteLock>{children}</MarketplaceRouteLock>
}
