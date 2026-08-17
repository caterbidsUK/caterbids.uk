import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { createPublicClient } from "@/lib/supabase/server"
import SearchContent from "./SearchContent"
import type { Database } from "@/types/supabase"

type Listing = Database["public"]["Tables"]["listings"]["Row"]

export default async function SearchPage() {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from("listings")
    .select("*")
    .or("status.is.null,status.eq.live,status.eq.payment_pending")
    .order("created_at", { ascending: false })

  const initialListings = (data ?? []) as Listing[]

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#001A35] text-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
        </div>
      }
    >
      <SearchContent initialListings={initialListings} />
    </Suspense>
  )
}
