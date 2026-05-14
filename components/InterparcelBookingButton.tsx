"use client"

import { useState } from "react"

type InterparcelBookingButtonProps = {
  orderId: string
  deliveryOrderId?: string | null
  ready: boolean
  missingFields: string[]
  testMode?: boolean
}

export default function InterparcelBookingButton({
  orderId,
  deliveryOrderId,
  ready,
  missingFields,
  testMode = false,
}: InterparcelBookingButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function confirmDelivery() {
    setLoading(true)
    setMessage("")
    setError("")

    try {
      const res = await fetch(testMode ? "/api/delivery/test-confirm" : "/api/delivery/interparcel/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, deliveryOrderId }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        const missing = Array.isArray(data.missingFields) ? data.missingFields.join(", ") : ""
        throw new Error(missing ? `${data.error} Missing: ${missing}` : data.error || "Could not book delivery.")
      }

      if (data.confirmed) {
        setMessage("Test courier confirmation saved.")
        window.location.reload()
      } else if (data.booked) {
        setMessage(`Courier confirmed: ${data.booking?.bookingReference || "confirmed"}`)
        window.location.reload()
      } else {
        setMessage(data.message || "Delivery data is ready. Final courier confirmation will follow.")
      }
    } catch (bookingError) {
      setError(bookingError instanceof Error ? bookingError.message : "Could not book delivery.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      {ready ? (
        <>
          <button
            type="button"
            onClick={confirmDelivery}
            disabled={loading}
            className="w-full rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Checking delivery data..." : testMode ? "Simulate courier confirmation" : "Request courier confirmation"}
          </button>
          <p className="mt-2 text-xs text-white/55">
            {testMode
              ? "Local/test only. This creates clearly labelled test tracking values."
              : "No final courier booking is created until the live courier API confirms it."}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-black text-orange-100">Delivery not ready to book</p>
          <p className="mt-1 text-xs text-white/55">
            Missing: {missingFields.join(", ")}
          </p>
        </>
      )}

      {message && <p className="mt-2 text-xs font-bold text-green-200">{message}</p>}
      {error && <p className="mt-2 text-xs font-bold text-red-200">{error}</p>}
    </div>
  )
}
