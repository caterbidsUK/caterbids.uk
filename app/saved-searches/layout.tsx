import type { ReactNode } from "react"
import { AccountRouteLock } from "@/lib/route-locks"

export default function SavedSearchesLayout({ children }: { children: ReactNode }) {
  return <AccountRouteLock>{children}</AccountRouteLock>
}
