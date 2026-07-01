import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Home, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import SellerReviewsList from "@/components/SellerReviewsList"
import type { Database } from "@/types/supabase"

type Review = Database["public"]["Tables"]["seller_reviews"]["Row"]

export default async function MyReviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/account/reviews")
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from("seller_reviews")
    .select("*")
    .eq("seller_id", user.id)
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })

  const reviews = (data || []) as Review[]
  const reviewCount = reviews.length
  const averageRating =
    reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviewCount : 0

  return (
    <main className="app-bg min-h-screen px-4 pb-10 text-white">
      <header className="bottom-nav sticky top-0 z-50 -mx-4 mb-5 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/account" className="soft-button flex items-center gap-2 rounded-2xl px-3 py-2 text-sm">
            <ArrowLeft size={18} />
            Account
          </Link>

          <Link href="/" className="text-center">
            <h1 className="text-lg font-black">
              Cater<span className="text-[#FF6B00]">Bids</span>.UK
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-[#FF6B00]">REVIEWS</p>
          </Link>

          <Link href="/" className="soft-button flex items-center gap-2 rounded-2xl px-3 py-2 text-sm">
            <Home size={18} />
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5">
        <section className="premium-shell rounded-[2rem] p-6">
          <div className="orange-glow flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00]">
            <Star size={24} />
          </div>
          <h1 className="mt-4 text-3xl font-black">My Reviews</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Reviews from buyers on your completed sales.
          </p>
        </section>

        {reviewCount > 0 && (
          <section className="premium-card rounded-[2rem] p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-2xl font-black text-[#FF6B00]">{averageRating.toFixed(1)}</p>
                <p className="mt-1 text-xs font-bold text-white/45">Average rating</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-2xl font-black text-white">{reviewCount}</p>
                <p className="mt-1 text-xs font-bold text-white/45">
                  {reviewCount === 1 ? "Review" : "Reviews"}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="premium-card rounded-[2rem] p-5">
          <SellerReviewsList reviews={reviews} />
        </section>
      </div>
    </main>
  )
}
