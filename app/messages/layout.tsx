import type { ReactNode } from "react"
import { AccountRouteLock } from "@/lib/route-locks"

export default function MessagesLayout({ children }: { children: ReactNode }) {
  return <AccountRouteLock>{children}</AccountRouteLock>
}
