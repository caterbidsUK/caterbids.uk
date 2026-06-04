import type { ReactNode } from "react"
import { SellRouteLock } from "@/lib/route-locks"

export default function PostListingLayout({ children }: { children: ReactNode }) {
  return <SellRouteLock>{children}</SellRouteLock>
}
