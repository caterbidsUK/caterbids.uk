import type { ReactNode } from "react"
import { AdminRouteLock } from "@/lib/route-locks"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminRouteLock>{children}</AdminRouteLock>
}
