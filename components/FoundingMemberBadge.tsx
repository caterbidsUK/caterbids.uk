"use client"

import { Star } from "lucide-react"

type Props = {
  variant?: "full" | "compact"
}

export default function FoundingMemberBadge({ variant = "full" }: Props) {
  if (variant === "compact") {
    return (
      <span
        title="One of the first 100 founding members of CaterBids."
        className="inline-flex items-center gap-1 rounded-full border border-[#FF6B00]/40 bg-[#002E5D] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#FF6B00]"
      >
        <Star className="h-2.5 w-2.5 fill-[#FF6B00] text-[#FF6B00]" aria-hidden="true" />
        Founding Member
      </span>
    )
  }

  return (
    <span
      title="One of the first 100 founding members of CaterBids."
      className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/40 bg-[#002E5D] px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#FF6B00]"
    >
      <Star className="h-3.5 w-3.5 fill-[#FF6B00] text-[#FF6B00]" aria-hidden="true" />
      Founding Member
    </span>
  )
}
