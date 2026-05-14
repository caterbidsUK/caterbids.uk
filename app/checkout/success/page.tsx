"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

type ConfirmOrderResponse = {
  success?: boolean
  listingId?: string
  buyerLinked?: boolean
  order?: {
    id?: string
    itemTitle?: string | null
    itemPrice?: number | null
    totalPrice?: number | null
    paymentStatus?: string | null
    deliveryStatus?: string | null
    deliveryName?: string | null
    deliveryPrice?: number | null
    collectionPostcode?: string | null
    deliveryPostcode?: string | null
  } | null
  deliveryOrder?: {
    id?: string
    status?: string | null
    selectedServiceName?: string | null
    selectedServicePrice?: number | null
    collectionPostcode?: string | null
    deliveryPostcode?: string | null
    courierProvider?: string | null
  } | null
  error?: string
}

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function statusLabel(value: string | null | undefined) {
  return (value || "booking_requested").replace(/_/g, " ")
}

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
  const [confirmation, setConfirmation] = useState<ConfirmOrderResponse | null>(null)

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
        const data = (await res.json()) as ConfirmOrderResponse

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Unable to save order")
        }

        setConfirmation(data)

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
            ? "Order saved to your CaterBids account."
            : "Order saved."
        )

        setDeliveryStatus("request_received")
        setDeliveryMessage("CaterBids will confirm final courier booking details.")
      })
      .catch((error) => {
        console.error("Order confirmation failed:", error)
        setOrderStatus("error")
        setOrderMessage("Payment succeeded, but CaterBids could not save the order yet. Check the dev terminal.")
      })
  }, [sessionId])

  const deliveryOrder = confirmation?.deliveryOrder
  const order = confirmation?.order
  const selectedDeliveryName = deliveryOrder?.selectedServiceName || order?.deliveryName || "Delivery option"
  const selectedDeliveryPrice = deliveryOrder?.selectedServicePrice ?? order?.deliveryPrice
  const collectionPostcode =
    deliveryOrder?.collectionPostcode || order?.collectionPostcode || "Collection postcode not provided"
  const deliveryPostcode = deliveryOrder?.deliveryPostcode || order?.deliveryPostcode || "Pending"
  const visibleDeliveryStatus = deliveryOrder?.status || order?.deliveryStatus || "booking_requested"

  return (
    <main className="min-h-screen bg-[#001B35] px-4 py-8 text-white">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 text-[#002E5D] shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF6B00]">
          CaterBids Payment
        </p>

        <h1 className="mt-2 text-3xl font-black">Payment successful</h1>

        <p className="mt-3 text-sm text-slate-600">Order saved. Delivery request received.</p>

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
              : orderMessage || "Order saved."}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <h2 className="font-black text-[#002E5D]">Delivery status: {statusLabel(visibleDeliveryStatus)}</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2">
              <span className="font-semibold text-slate-600">Selected delivery</span>
              <span className="text-right font-black">{selectedDeliveryName}</span>
            </div>
            <div className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2">
              <span className="font-semibold text-slate-600">Delivery price</span>
              <span className="font-black">£{money(selectedDeliveryPrice)}</span>
            </div>
            <div className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2">
              <span className="font-semibold text-slate-600">Collection</span>
              <span className="font-black">{collectionPostcode}</span>
            </div>
            <div className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2">
              <span className="font-semibold text-slate-600">Delivery</span>
              <span className="font-black">{deliveryPostcode}</span>
            </div>
          </div>
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#002E5D]">
            {deliveryStatus === "idle"
              ? "Final courier confirmation will follow."
              : deliveryMessage || "Final courier confirmation will follow."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/account/orders")}
          className="mt-5 w-full rounded-2xl bg-[#FF6B00] px-5 py-4 text-base font-black text-white"
        >
          View order
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-3 w-full rounded-2xl border border-[#002E5D]/15 bg-white px-5 py-4 text-base font-black text-[#002E5D]"
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
