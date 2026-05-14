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
  const estimatedDeliveryTime = searchParams.get("estimatedDeliveryTime") || ""
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
  const missingDeliveryDetails =
    deliveryPrice <= 0
      ? []
      : [
          !buyerDeliveryFullAddress.trim() ? "delivery address" : "",
          !buyerDeliveryPostcode.trim() ? "delivery postcode" : "",
          !buyerPhone.trim() ? "buyer phone number" : "",
        ].filter(Boolean)
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

          <h1 className="mt-2 text-2xl font-black">Pay and book</h1>

          <p className="mt-2 text-sm text-slate-600">
            Secure checkout with delivery support.
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
                <div>
                  <p className="font-black text-[#002E5D]">Delivery details</p>
                  <p className="mt-1 leading-relaxed">
                    From <span className="font-bold text-[#002E5D]">{collectionPostcode || "pending"}</span>
                    {" "}to <span className="font-bold text-[#002E5D]">{buyerDeliveryPostcode || "pending"}</span>
                  </p>
                  <p className="mt-1 leading-relaxed">
                    Package: {weightKg || "?"}kg, {lengthCm || "?"} x {widthCm || "?"} x {heightCm || "?"}cm
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#002E5D]">
                    Buyer delivery full address <span className="text-[#FF6B00]">required</span>
                  </label>
                  <textarea
                    value={buyerDeliveryFullAddress}
                    onChange={(event) => setBuyerDeliveryFullAddress(event.target.value)}
                    placeholder="House/unit, street, town/city and any business name"
                    className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#002E5D] outline-none placeholder:text-slate-500 focus:border-[#FF6B00]"
                  />
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Courier delivery address.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#002E5D]">
                    Buyer delivery postcode <span className="text-[#FF6B00]">required</span>
                  </label>
                  <input
                    value={buyerDeliveryPostcode}
                    onChange={(event) => setBuyerDeliveryPostcode(event.target.value.toUpperCase())}
                    placeholder="e.g. M1 1AE"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#002E5D] outline-none placeholder:text-slate-500 focus:border-[#FF6B00]"
                  />
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Must match the quote.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#002E5D]">
                    Buyer phone number <span className="text-[#FF6B00]">required</span>
                  </label>
                  <input
                    value={buyerPhone}
                    onChange={(event) => setBuyerPhone(event.target.value)}
                    placeholder="e.g. 07123 456789"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#002E5D] outline-none placeholder:text-slate-500 focus:border-[#FF6B00]"
                  />
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    For delivery updates.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[#002E5D]">
                    Buyer access notes <span className="text-slate-400">optional</span>
                  </label>
                  <textarea
                    value={buyerAccessRestrictions}
                    onChange={(event) => setBuyerAccessRestrictions(event.target.value)}
                    placeholder="Loading bay, opening times, stairs, height limits or contact notes"
                    className="min-h-16 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-[#002E5D] outline-none placeholder:text-slate-500 focus:border-[#FF6B00]"
                  />
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Add access details.
                  </p>
                </div>
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
            <h2 className="font-black text-[#002E5D]">Delivery request</h2>
            <p className="mt-1 text-sm text-slate-700">
              {deliveryPrice > 0
                ? "CaterBids will confirm the courier booking after payment."
                : "No paid delivery option selected for this checkout."}
            </p>
          </div>

          {missingDeliveryDetails.length > 0 && (
            <p className="mt-4 rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/10 p-3 text-sm font-bold text-[#8A3A00]">
              Add the buyer {missingDeliveryDetails.join(", ")} to enable payment and delivery request.
            </p>
          )}

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
                    estimatedDeliveryTime,
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
            {checkoutLoading ? "Opening secure payment..." : deliveryPrice > 0 ? "Pay and book delivery" : "Pay"}
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
