"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function PostListingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[post-listing error boundary]", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#001633] px-6 text-center text-white">
      <h1 className="text-2xl font-black">Something went wrong</h1>
      <p className="max-w-sm text-sm font-semibold text-white/60">
        Your listing wasn&apos;t submitted. Your photos are still saved in your browser — go back and try again.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-2xl bg-[#FF6B00] px-6 py-3 text-sm font-black text-white"
        >
          Try again
        </button>
        <Link
          href="/post-listing"
          className="rounded-2xl border border-white/18 bg-white/7 px-6 py-3 text-sm font-black text-white"
        >
          Start over
        </Link>
      </div>
    </div>
  )
}
