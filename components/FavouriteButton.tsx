"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"

export function FavouriteButton({ itemId, title = "Saved item" }: { itemId: string; title?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  async function handleFavourite() {
    const supabase = createClient()
    const user = await getCurrentUser(supabase)
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "")

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(currentUrl)}`)
      return
    }

    await supabase.from("favourites").upsert(
      {
        user_id: user.id,
        source: "caterbids",
        external_id: itemId,
        title,
      },
      { onConflict: "user_id,source,external_id" }
    )
  }

  return (
    <button
      type="button"
      onClick={handleFavourite}
      className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold"
    >
      Save
    </button>
  )
}
