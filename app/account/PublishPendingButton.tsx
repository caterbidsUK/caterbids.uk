"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { publishPendingListing } from "./listings/listing-actions"

export default function PublishPendingButton({ listingId }: { listingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errorLink, setErrorLink] = useState<string | null>(null)

  async function handlePublish() {
    setLoading(true)
    setError("")
    setErrorLink(null)
    try {
      const result = await publishPendingListing(listingId)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error)
        if ("redirectTo" in result && result.redirectTo) {
          setErrorLink(result.redirectTo)
        }
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handlePublish}
        disabled={loading}
        className="flex items-center gap-1 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-black text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-60"
      >
        {loading ? "Publishing…" : "Publish now"}
      </button>
      {error && (
        <p className="max-w-[14rem] text-right text-[11px] font-semibold text-red-400">
          {error}
          {errorLink && (
            <>
              {" "}
              <a href={errorLink} className="underline hover:text-red-300">
                View pricing →
              </a>
            </>
          )}
        </p>
      )}
    </div>
  )
}
