"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"

export function SaveSearchButton() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  async function handleSaveSearch() {
    const supabase = createClient()
    const user = await getCurrentUser(supabase)
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "")

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(currentUrl)}`)
      return
    }

    await supabase.from("saved_searches").insert({
      user_id: user.id,
      query: searchParams.get("q") || "all",
      location: searchParams.get("city") || searchParams.get("location") || null,
      category: searchParams.get("category") || "all",
      condition: searchParams.get("condition") || "all",
      search_url: currentUrl,
      search_query: searchParams.get("q") || "",
      city: searchParams.get("city") || "",
    })
  }

  return (
    <button
      type="button"
      onClick={handleSaveSearch}
      className="rounded-xl bg-[#FF6B00] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
    >
      Save this search
    </button>
  )
}
