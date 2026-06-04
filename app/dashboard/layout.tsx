import type { ReactNode } from "react"
import { AccountRouteLock } from "@/lib/route-locks"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AccountRouteLock>{children}</AccountRouteLock>
}
