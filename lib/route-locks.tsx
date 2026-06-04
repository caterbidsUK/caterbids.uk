import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { accountIsLive, adminIsLive, marketplaceIsLive, sellIsLive } from "@/lib/launch-gates"

export function MarketplaceRouteLock({ children }: { children: ReactNode }) {
  if (!marketplaceIsLive()) redirect("/marketplace")
  return children
}

export function SellRouteLock({ children }: { children: ReactNode }) {
  if (!sellIsLive()) redirect("/marketplace")
  return children
}

export function AccountRouteLock({ children }: { children: ReactNode }) {
  if (!accountIsLive()) redirect("/")
  return children
}

export function AdminRouteLock({ children }: { children: ReactNode }) {
  if (!adminIsLive()) redirect("/")
  return children
}
