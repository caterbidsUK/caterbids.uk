"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { sellerDeleteListing } from "./listings/listing-actions"

export default function DeleteListingButton({ listingId }: { listingId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")

  function handleDelete() {
    startTransition(async () => {
      const result = await sellerDeleteListing(listingId)
      if (!result.success) {
        setError(result.error)
        setShowConfirm(false)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setShowConfirm(true) }}
        className="flex items-center gap-1 rounded-xl border border-red-200/60 bg-red-50/60 px-2.5 py-1.5 text-xs font-black text-red-500 transition hover:bg-red-100"
      >
        <Trash2 className="h-3 w-3" />
        Delete
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false) }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-[#002E5D]">Remove this listing?</h2>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              This will remove your listing from the site. Buyers will no longer be able to find it.
              This cannot be undone by you — contact support if you need it restored.
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Any listing credit or free listing slot you used will not be refunded.
            </p>
            {error && (
              <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-[#002E5D] hover:bg-slate-50"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isPending ? "Removing…" : "Yes, remove it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
