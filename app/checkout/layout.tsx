import type { ReactNode } from "react"
import { AccountRouteLock } from "@/lib/route-locks"

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <AccountRouteLock>{children}</AccountRouteLock>
}
