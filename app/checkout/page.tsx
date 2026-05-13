"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function money(value: number) {
  return Number.isFinite(value) ? value.toLocaleString("en-GB", { maximumFractionDigits: 2 }) : "0"
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const listingId = searchParams.get("listingId") || searchParams.get("listing") || ""
  const title = searchParams.get("title") || "CaterBids item"
  const itemPrice = Number(searchParams.get("itemPrice") || 0)
  const deliveryName = searchParams.get("deliveryName") || "Not selected"
  const deliveryPrice = Number(searchParams.get("deliveryPrice") || 0)
  const total = Number(searchParams.get("total") || itemPrice + deliveryPrice)
  const deliveryPostcode = searchParams.get("deliveryPostcode") || ""
  const collectionPostcode = searchParams.get("collectionPostcode") || ""
  const deliveryQuoteId = searchParams.get("deliveryQuoteId") || ""
  const deliveryProvider = searchParams.get("deliveryProvider") || ""
  const weightKg = searchParams.get("weightKg") || ""
  const lengthCm = searchParams.get("lengthCm") || ""
  const widthCm = searchParams.get("widthCm") || ""
  const heightCm = searchParams.get("heightCm") || ""
  const palletReady = searchParams.get("palletReady") || ""
  const tailLiftRequired = searchParams.get("tailLiftRequired") || ""
  const palletCount = searchParams.get("palletCount") || ""
  const insuranceValue = searchParams.get("insuranceValue") || ""
  const returnUrl = `/checkout?${searchParams.toString()}`
  const sellerId = searchParams.get("sellerId") || ""
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState("")
  const [buyerDeliveryFullAddress, setBuyerDeliveryFullAddress] = useState("")
  const [buyerDeliveryPostcode, setBuyerDeliveryPostcode] = useState(deliveryPostcode)
  const [buyerPhone, setBuyerPhone] = useState("")
  const [buyerAccessRestrictions, setBuyerAccessRestrictions] = useState("")
  const deliveryDetailsComplete =
    deliveryPrice <= 0 ||
    Boolean(buyerDeliveryFullAddress.trim() && buyerDeliveryPostcode.trim() && buyerPhone.trim())
  const canContinueToPayment =
    !checkoutLoading &&
    Boolean(listingId && title && itemPrice > 0 && sellerId) &&
    (deliveryPrice <= 0 || Boolean(deliveryName && deliveryQuoteId && deliveryDetailsComplete))

  return (
    <main className="min-h-screen bg-[#001B35] px-4 py-6 text-white">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white"
        >
          Back
        </button>

        <div className="rounded-3xl border border-white/10 bg-white p-5 text-[#002E5D] shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF6B00]">
            CaterBids Checkout
          </p>

          <h1 className="mt-2 text-2xl font-black">Complete your purchase</h1>

          <p className="mt-2 text-sm text-slate-600">
            Secure test payment is connected. Delivery requests are saved now, with final courier confirmation after payment.
          </p>

          <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-600">Listing ID</span>
              <span className="break-all text-right font-bold">{listingId || "Pending"}</span>
            </div>

            <div className="flex justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-600">Item</span>
              <span className="text-right font-bold">{title}</span>
            </div>

            <div className="flex justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-600">Item price</span>
              <span className="font-black">£{money(itemPrice)}</span>
            </div>

            <div className="flex justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-600">Delivery</span>
              <span className="text-right font-black">
                {deliveryName} - £{money(deliveryPrice)}
              </span>
            </div>

            {deliveryPrice > 0 && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                <p className="font-black text-[#002E5D]">Delivery details for booking</p>
                <p className="mt-1">
                  {collectionPostcode || "Collection postcode pending"} to {buyerDeliveryPostcode || "delivery postcode pending"}
                </p>
                <p className="mt-1">
                  Package: {weightKg || "?"}kg, {lengthCm || "?"} x {widthCm || "?"} x {heightCm || "?"}cm
                </p>
                <textarea
                  value={buyerDeliveryFullAddress}
                  onChange={(event) => setBuyerDeliveryFullAddress(event.target.value)}
                  placeholder="Buyer full delivery address"
                  className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#002E5D] outline-none focus:border-[#FF6B00]"
                />
                <input
                  value={buyerDeliveryPostcode}
                  onChange={(event) => setBuyerDeliveryPostcode(event.target.value.toUpperCase())}
                  placeholder="Buyer delivery postcode"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#002E5D] outline-none focus:border-[#FF6B00]"
                />
                <input
                  value={buyerPhone}
                  onChange={(event) => setBuyerPhone(event.target.value)}
                  placeholder="Buyer phone number"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#002E5D] outline-none focus:border-[#FF6B00]"
                />
                <textarea
                  value={buyerAccessRestrictions}
                  onChange={(event) => setBuyerAccessRestrictions(event.target.value)}
                  placeholder="Buyer access restrictions, opening times or delivery notes"
                  className="min-h-16 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#002E5D] outline-none focus:border-[#FF6B00]"
                />
              </div>
            )}

            <div className="border-t border-slate-200 pt-3">
              <div className="flex justify-between gap-3">
                <span className="text-lg font-black">Total</span>
                <span className="text-3xl font-black text-[#FF6B00]">£{money(total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
            <h2 className="font-black text-[#002E5D]">Delivery request preview</h2>
            <p className="mt-1 text-sm text-slate-700">
              {deliveryPrice > 0
                ? "Preview quote subject to courier confirmation. CaterBids will confirm final courier booking details after payment."
                : "No paid delivery option selected for this checkout."}
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (checkoutLoading) return
              setCheckoutLoading(true)
              setCheckoutUrl("")
              try {
                const supabase = createClient()
                const {
                  data: { user },
                  error: userError,
                } = await supabase.auth.getUser()

                console.log("CHECKOUT AUTH USER:", user)

                if (userError || !user) {
                  const currentUrl = window.location.pathname + window.location.search
                  window.location.href = `/login?returnUrl=${encodeURIComponent(currentUrl)}`
                  return
                }

                if (!sellerId) {
                  alert("Seller details are missing. This listing needs to be saved as a real CaterBids listing before checkout.")
                  return
                }

                if (deliveryPrice > 0 && (!buyerDeliveryFullAddress.trim() || !buyerDeliveryPostcode.trim() || !buyerPhone.trim())) {
                  alert("Please add delivery address, delivery postcode and phone number before payment.")
                  return
                }

                const res = await fetch("/api/stripe/create-checkout-session", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    listingId,
                    title,
                    itemPrice,
                    deliveryName,
                    deliveryPrice,
                    deliveryQuoteId,
                    deliveryProvider,
                    deliveryPostcode,
                    buyerDeliveryFullAddress,
                    buyerDeliveryPostcode,
                    buyerPhone,
                    buyerAccessRestrictions,
                    collectionPostcode,
                    weightKg,
                    lengthCm,
                    widthCm,
                    heightCm,
                    palletReady,
                    tailLiftRequired,
                    palletCount,
                    insuranceValue,
                    returnUrl,
                    buyerId: user.id,
                    sellerId,
                  }),
                })

                const data = await res.json()

                if (!res.ok || !data.url) {
                  alert(data.error || "Unable to start checkout.")
                  return
                }

                setCheckoutUrl(data.url)
                window.location.href = data.url
              } catch (error) {
                console.error(error)
                alert("Checkout failed. Please try again.")
              } finally {
                setCheckoutLoading(false)
              }
            }}
            disabled={!canContinueToPayment}
            className="mt-5 w-full rounded-2xl bg-[#FF6B00] px-5 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
          >
            {checkoutLoading ? "Opening secure payment..." : deliveryPrice > 0 ? "Pay and request delivery" : "Continue to secure payment"}
          </button>

          {checkoutUrl && (
            <a
              href={checkoutUrl}
              className="mt-3 block rounded-2xl border border-[#FF6B00]/30 bg-orange-50 px-5 py-3 text-center text-sm font-black text-[#FF6B00]"
            >
              Open Stripe checkout
            </a>
          )}

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-3 w-full rounded-2xl border border-[#002E5D]/20 bg-white px-5 py-4 text-base font-black text-[#002E5D]"
          >
            Return to listing
          </button>
        </div>
      </div>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="app-bg flex min-h-screen items-center justify-center text-white">
          Loading checkout...
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
