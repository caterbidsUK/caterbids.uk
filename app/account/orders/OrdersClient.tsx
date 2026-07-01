"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Home, PackageCheck } from "lucide-react"
import InterparcelBookingButton from "@/components/InterparcelBookingButton"
import { validateDeliveryBooking } from "@/lib/delivery/validateDeliveryBooking"
import { isRealTrackingAvailable } from "@/lib/delivery/deliveryOrders"
import type { Database } from "@/types/supabase"

type Order = Database["public"]["Tables"]["orders"]["Row"]
type DeliveryOrder = Database["public"]["Tables"]["delivery_orders"]["Row"]

type Props = {
  userId: string
  orders: Order[]
  deliveryOrders: DeliveryOrder[]
  reviewedOrderIds: string[]
  hasError: boolean
  testCourierMode: boolean
}

const REVIEWABLE_STATUSES = new Set(["paid", "completed", "delivered", "collected"])

function isOrderComplete(order: Order) {
  return (
    REVIEWABLE_STATUSES.has(String(order.payment_status || "").toLowerCase()) ||
    REVIEWABLE_STATUSES.has(String(order.order_status || "").toLowerCase()) ||
    REVIEWABLE_STATUSES.has(String(order.delivery_status || "").toLowerCase())
  )
}

function money(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function statusLabel(value: string | null | undefined) {
  return (value || "pending").replace(/_/g, " ")
}

type Ratings = { overall: number; communication: number; itemAccuracy: number; delivery: number }

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase text-white/50">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-2xl leading-none transition ${
              n <= value ? "text-[#FF6B00]" : "text-white/20 hover:text-white/50"
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

export default function OrdersClient({
  userId,
  orders,
  deliveryOrders,
  reviewedOrderIds,
  hasError,
  testCourierMode,
}: Props) {
  const deliveryOrdersByOrderId = new Map(
    deliveryOrders
      .filter((d) => d.order_id)
      .map((d) => [d.order_id as string, d]),
  )
  const deliveryOrdersByStripeSession = new Map(
    deliveryOrders
      .filter((d) => d.stripe_checkout_session_id)
      .map((d) => [d.stripe_checkout_session_id as string, d]),
  )

  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null)
  const [ratings, setRatings] = useState<Ratings>({ overall: 0, communication: 0, itemAccuracy: 0, delivery: 0 })
  const [reviewText, setReviewText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState("")
  const [localReviewed, setLocalReviewed] = useState<Set<string>>(() => new Set(reviewedOrderIds))

  function openReviewModal(order: Order) {
    setReviewingOrder(order)
    setRatings({ overall: 0, communication: 0, itemAccuracy: 0, delivery: 0 })
    setReviewText("")
    setReviewError("")
  }

  function closeReviewModal() {
    if (submitting) return
    setReviewingOrder(null)
    setReviewError("")
  }

  async function submitReview() {
    if (!reviewingOrder) return
    if (!ratings.overall || !ratings.communication || !ratings.itemAccuracy || !ratings.delivery) {
      setReviewError("Please rate all four categories.")
      return
    }
    setSubmitting(true)
    setReviewError("")
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: reviewingOrder.id,
          listing_id: reviewingOrder.listing_id,
          seller_id: reviewingOrder.seller_id,
          overall_rating: ratings.overall,
          communication_rating: ratings.communication,
          item_accuracy_rating: ratings.itemAccuracy,
          delivery_rating: ratings.delivery,
          review_text: reviewText.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setReviewError(data.error || "Could not save review.")
        return
      }
      setLocalReviewed((prev) => new Set([...prev, reviewingOrder.id]))
      setReviewingOrder(null)
    } catch {
      setReviewError("Connection error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const allRatingsSet =
    ratings.overall > 0 && ratings.communication > 0 && ratings.itemAccuracy > 0 && ratings.delivery > 0

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
            <p className="text-[10px] font-bold tracking-widest text-[#FF6B00]">ORDERS</p>
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
            <PackageCheck size={24} />
          </div>
          <h1 className="mt-4 text-3xl font-black">Orders</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">Purchases and sales.</p>
        </section>

        {hasError && (
          <section className="rounded-3xl border border-[#FF6B00]/30 bg-[#FF6B00]/10 p-5 text-orange-100">
            <h2 className="font-black">Orders table not ready</h2>
            <p className="mt-2 text-sm leading-relaxed text-orange-100/75">Orders are not available yet.</p>
          </section>
        )}

        {!hasError && orders.length === 0 && (
          <section className="premium-card rounded-[2rem] p-8 text-center">
            <PackageCheck className="mx-auto h-10 w-10 text-white/30" />
            <h2 className="mt-4 text-xl font-black">No orders yet</h2>
            <p className="mt-2 text-sm text-white/60">Orders will appear here.</p>
            <Link href="/search" className="premium-button mt-5 inline-flex rounded-2xl px-5 py-3 text-sm font-bold">
              Search listings
            </Link>
          </section>
        )}

        {!hasError && orders.length > 0 && (
          <section className="grid gap-4">
            {orders.map((order) => {
              const isSellerOrder = order.seller_id === userId
              const deliveryValidation = validateDeliveryBooking(order)
              const deliveryOrder =
                deliveryOrdersByOrderId.get(order.id) ||
                deliveryOrdersByStripeSession.get(order.stripe_session_id || "") ||
                null
              const deliveryStatus = deliveryOrder?.delivery_status || order.delivery_status || "not_required"
              const isPalletDelivery =
                order.delivery_method === "pallet_delivery" ||
                Boolean(order.delivery_booking_required) ||
                Number(order.delivery_price || 0) > 0
              const selectedService = isPalletDelivery
                ? deliveryOrder?.selected_service_name || order.delivery_name || "CaterBids Pallet Delivery"
                : "Collection only"
              const selectedServicePrice = isPalletDelivery
                ? (deliveryOrder?.selected_service_price ?? order.delivery_price)
                : 0
              const showTracking = isRealTrackingAvailable(deliveryOrder)
              const canSimulateCourier =
                testCourierMode &&
                isSellerOrder &&
                deliveryValidation.ready &&
                ["awaiting_booking", "booking_requested"].includes(deliveryStatus)
              const isBuyerOrder = order.buyer_id === userId
              const showReviewButton = isBuyerOrder && isOrderComplete(order) && !localReviewed.has(order.id)
              const showReviewedBadge = isBuyerOrder && localReviewed.has(order.id)

              return (
                <article key={order.id} className="premium-card rounded-[2rem] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF6B00]">
                        {order.buyer_id === userId ? "Purchase" : "Sale"}
                      </p>
                      <h2 className="mt-1 text-lg font-black">{order.item_title || "CaterBids item"}</h2>
                      <p className="mt-1 break-all text-xs text-white/45">Listing: {order.listing_id}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-black text-[#FF6B00]">£{money(order.total_price)}</p>
                      <p className="text-xs font-bold capitalize text-white/55">{statusLabel(order.order_status)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs font-bold uppercase text-white/40">Item</p>
                      <p className="mt-1 font-black">£{money(order.item_price)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs font-bold uppercase text-white/40">Delivery</p>
                      <p className="mt-1 font-black">
                        {selectedService} - £{money(selectedServicePrice)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs font-bold uppercase text-white/40">Payment</p>
                      <p className="mt-1 font-black capitalize">{statusLabel(order.payment_status)}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                    <p className="text-xs font-bold uppercase text-white/40">Shipping</p>
                    <p className="mt-1 font-black capitalize">{statusLabel(deliveryStatus)}</p>
                    {!isPalletDelivery && (
                      <p className="mt-2 text-xs text-white/55">
                        Collection only — arrange collection with the buyer or seller directly.
                      </p>
                    )}
                    {deliveryOrder?.courier_provider && (
                      <p className="mt-1 text-xs text-white/55">Provider: {deliveryOrder.courier_provider}</p>
                    )}
                    {deliveryOrder?.courier_reference && (
                      <p className="mt-1 break-all text-xs text-white/55">
                        Reference: {deliveryOrder.courier_reference}
                        {deliveryOrder.is_test ? " (test)" : ""}
                      </p>
                    )}
                    {showTracking && (
                      <Link
                        href={deliveryOrder?.tracking_url || "#"}
                        className="mt-2 inline-flex text-xs font-black text-[#FF9A4A] underline-offset-4 hover:underline"
                      >
                        Open tracking
                      </Link>
                    )}
                    {isSellerOrder &&
                      (order.collection_full_address ||
                        order.collection_postcode ||
                        deliveryOrder?.collection_postcode) && (
                        <p className="mt-2 text-xs text-white/55">
                          Collection:{" "}
                          {order.collection_full_address ||
                            deliveryOrder?.collection_postcode ||
                            order.collection_postcode}
                        </p>
                      )}
                    {(deliveryOrder?.delivery_postcode || order.buyer_delivery_postcode) && (
                      <p className="mt-2 text-xs text-white/55">
                        Buyer delivery: {deliveryOrder?.delivery_postcode || order.buyer_delivery_postcode}
                      </p>
                    )}
                  </div>

                  {isSellerOrder && isPalletDelivery && (
                    <div className="mt-3 rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-4">
                      <h3 className="font-black text-orange-100">Prepare for pallet collection</h3>
                      <div className="mt-3 grid gap-2 text-xs font-semibold text-orange-50/85 sm:grid-cols-2">
                        {[
                          "Clean item",
                          "Disconnect safely",
                          "Measure and weigh",
                          "Box loose parts",
                          "Wrap and strap to pallet",
                          "Clear access for collection",
                        ].map((item) => (
                          <span key={item} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                            {item}
                          </span>
                        ))}
                      </div>
                      <a
                        href="/pallet-delivery-guide"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-xl bg-[#FF6B00] px-4 py-2 text-xs font-black text-white"
                      >
                        View full pallet preparation guide
                      </a>
                    </div>
                  )}

                  {canSimulateCourier && (
                    <InterparcelBookingButton
                      orderId={order.id}
                      deliveryOrderId={deliveryOrder?.id || ""}
                      ready={deliveryValidation.ready}
                      missingFields={deliveryValidation.missingFields}
                      testMode
                    />
                  )}

                  {showReviewButton && (
                    <button
                      type="button"
                      onClick={() => openReviewModal(order)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FF6B00]/40 bg-[#FF6B00]/10 py-3 text-sm font-black text-[#FF6B00] transition hover:bg-[#FF6B00]/20"
                    >
                      ★ Leave a review
                    </button>
                  )}

                  {showReviewedBadge && (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-center text-xs font-bold text-white/50">
                      Reviewed ✓
                    </div>
                  )}

                  {order.stripe_session_id && (
                    <details className="mt-4 rounded-2xl bg-black/15 p-3 text-[11px] text-white/45">
                      <summary className="cursor-pointer font-bold text-white/60">More details</summary>
                      <p className="mt-2 break-all">Stripe session: {order.stripe_session_id}</p>
                    </details>
                  )}
                </article>
              )
            })}
          </section>
        )}
      </div>

      {reviewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#0f1f35] p-6 shadow-2xl">
            <h3 className="mb-1 text-xl font-black text-white">Leave a review</h3>
            <p className="mb-5 truncate text-sm text-white/60">
              {reviewingOrder.item_title || "CaterBids item"}
            </p>

            <div className="space-y-4">
              <StarPicker
                label="Overall"
                value={ratings.overall}
                onChange={(n) => setRatings((r) => ({ ...r, overall: n }))}
              />
              <StarPicker
                label="Item as described"
                value={ratings.itemAccuracy}
                onChange={(n) => setRatings((r) => ({ ...r, itemAccuracy: n }))}
              />
              <StarPicker
                label="Communication"
                value={ratings.communication}
                onChange={(n) => setRatings((r) => ({ ...r, communication: n }))}
              />
              <StarPicker
                label="Delivery"
                value={ratings.delivery}
                onChange={(n) => setRatings((r) => ({ ...r, delivery: n }))}
              />

              <div>
                <p className="mb-1 text-xs font-bold uppercase text-white/50">Comments (optional)</p>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value.slice(0, 800))}
                  rows={3}
                  placeholder="Share your experience…"
                  className="premium-input w-full resize-none rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30"
                />
                <p className="mt-1 text-right text-xs text-white/30">{reviewText.length}/800</p>
              </div>

              {reviewError && <p className="text-sm font-bold text-red-400">{reviewError}</p>}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={closeReviewModal}
                disabled={submitting}
                className="flex-1 rounded-2xl border border-white/20 py-3 font-bold text-white/70 hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={submitting || !allRatingsSet}
                className="flex-1 rounded-2xl bg-[#FF6B00] py-3 font-black text-white hover:bg-[#FF6B00]/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Submitting…" : "Submit review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
