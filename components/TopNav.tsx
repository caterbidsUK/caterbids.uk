"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Home } from "lucide-react"

export default function TopNav({ title }: { title?: string }) {
  const router = useRouter()

  return (
    <div className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#001326]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-white/80 hover:bg-white/10"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Logo / Title */}
        <div className="text-center">
          <h1 className="text-lg font-black tracking-tight">
            Cater<span className="text-[#FF6B00]">Bids</span>.UK
          </h1>
          <p className="text-[10px] font-bold tracking-widest text-[#FF6B00]">
            BUY • SELL • SAVE
          </p>
          {title && (
            <p className="text-sm font-semibold mt-1">{title}</p>
          )}
        </div>

        {/* Home */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-white/80 hover:bg-white/10"
        >
          <Home size={18} />
          <span className="hidden sm:inline">Home</span>
        </button>
      </div>
    </div>
  )
}
