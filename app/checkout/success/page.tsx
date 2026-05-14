"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session_id")
  const hasConfirmed = useRef(false)
  const [orderStatus, setOrderStatus] = useState<"idle" | "saving" | "saved" | "error">(
    sessionId ? "saving" : "idle"
  )
  const [orderMessage, setOrderMessage] = useState("")
  const [deliveryStatus, setDeliveryStatus] = useState<
    "idle" | "request_received" | "not_required"
  >("idle")
  const [deliveryMessage, setDeliveryMessage] = useState("")

  useEffect(() => {
    if (!sessionId || hasConfirmed.current) return

    hasConfirmed.current = true
    setOrderStatus("saving")

    fetch("/api/stripe/confirm-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (res) => {
        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Unable to save order")
        }

        setOrderStatus("saved")

        if (data.listingId) {
          for (const key of ["caterbids_listings", "caterbids_public_listings"]) {
            try {
              const saved = JSON.parse(localStorage.getItem(key) || "[]")
              if (!Array.isArray(saved)) continue
              const updated = saved.map((item) =>
                String(item?.id ?? "") === String(data.listingId)
                  ? { ...item, status: "sold", sold_at: new Date().toISOString() }
                  : item
              )
              localStorage.setItem(key, JSON.stringify(updated))
            } catch (error) {
              console.warn(`Could not mark sold listing in ${key}:`, error)
            }
          }

          try {
            const current = JSON.parse(localStorage.getItem("caterbids_current_listing") || "null")
            if (current && String(current.id ?? "") === String(data.listingId)) {
              localStorage.setItem(
                "caterbids_current_listing",
                JSON.stringify({ ...current, status: "sold", sold_at: new Date().toISOString() })
              )
            }
          } catch (error) {
            console.warn("Could not mark current listing sold:", error)
          }
        }

        setOrderMessage(
          data.buyerLinked
            ? "Your order has been saved to your CaterBids account."
            : "Your order has been saved, but it was not linked to a logged-in buyer account."
        )

        setDeliveryStatus("request_received")
        setDeliveryMessage("Delivery request received. CaterBids will confirm final courier booking details.")
      })
      .catch((error) => {
        console.error("Order confirmation failed:", error)
        setOrderStatus("error")
        setOrderMessage("Payment succeeded, but CaterBids could not save the order yet. Check the dev terminal.")
      })
  }, [sessionId])

  return (
    <main className="min-h-screen bg-[#001B35] px-4 py-8 text-white">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 text-[#002E5D] shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF6B00]">
          CaterBids Payment
        </p>

        <h1 className="mt-2 text-3xl font-black">Payment successful</h1>

        <p className="mt-3 text-sm text-slate-600">Your payment is complete.</p>

        {sessionId && (
          <div className="mt-4 break-all rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
            Session ID: {sessionId}
          </div>
        )}

        {sessionId && (
          <div
            className={`mt-4 rounded-2xl border p-4 text-sm font-bold ${
              orderStatus === "saved"
                ? "border-green-200 bg-green-50 text-green-800"
                : orderStatus === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-orange-200 bg-orange-50 text-orange-700"
            }`}
          >
            {orderStatus === "saving"
              ? "Saving your order to CaterBids..."
              : orderMessage || "Order confirmation pending."}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <h2 className="font-black text-[#002E5D]">Delivery booking</h2>
          <p className="mt-1 text-sm text-slate-700">
            {deliveryStatus === "idle"
              ? "Delivery booking will run after order confirmation."
              : deliveryMessage || "Final courier confirmation will follow."}
          </p>
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#002E5D]">
            CaterBids will confirm the courier details.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-5 w-full rounded-2xl bg-[#FF6B00] px-5 py-4 text-base font-black text-white"
        >
          Back to CaterBids
        </button>
      </div>
    </main>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="app-bg flex min-h-screen items-center justify-center text-white">
          Loading payment...
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
