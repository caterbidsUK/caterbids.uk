import type { Database } from "@/types/supabase"

type Review = Database["public"]["Tables"]["seller_reviews"]["Row"]

const ukDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
})

function formatDate(date: string | null) {
  if (!date) return ""
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ""
  return ukDateFormatter.format(d)
}

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "base" }) {
  const cls = size === "base" ? "text-base" : "text-sm"
  return (
    <span className={cls}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "text-[#FF6B00]" : "text-white/20"}>
          ★
        </span>
      ))}
    </span>
  )
}

type Props = {
  reviews: Review[]
  className?: string
}

export default function SellerReviewsList({ reviews, className = "" }: Props) {
  if (reviews.length === 0) {
    return (
      <p className={`rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold text-white/50 ${className}`}>
        No reviews yet.
      </p>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {reviews.map((review) => (
        <div key={review.id} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">

          {/* Top row: overall rating left, date right */}
          <div className="flex items-center justify-between gap-2">
            <Stars value={review.overall_rating} size="base" />
            <span className="shrink-0 text-xs font-bold text-white/40">
              {formatDate(review.created_at)}
            </span>
          </div>

          {/* Two-column area: stacked category ratings left, comment right.
              On mobile (< sm) the comment drops below the categories. */}
          <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-[auto_1fr]">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-28 text-xs font-bold text-white/50">Item</span>
                <Stars value={review.item_accuracy_rating} />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-28 text-xs font-bold text-white/50">Communication</span>
                <Stars value={review.communication_rating} />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-28 text-xs font-bold text-white/50">Delivery</span>
                <Stars value={review.delivery_rating} />
              </div>
            </div>

            {review.review_text && (
              <p className="self-center text-sm leading-relaxed text-white/80">
                {review.review_text}
              </p>
            )}
          </div>

          <p className="mt-3 text-xs font-bold text-white/35">Verified buyer</p>

          {review.seller_reply && (
            <div className="mt-3 rounded-2xl border border-[#FF6B00]/20 bg-[#FF6B00]/[0.06] p-3">
              <p className="text-xs font-black uppercase tracking-wide text-[#FF6B00]/70">Seller reply</p>
              <p className="mt-1 text-sm leading-relaxed text-white/75">{review.seller_reply}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
