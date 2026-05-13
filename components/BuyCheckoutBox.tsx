"use client"

import type { DeliveryQuote } from "@/components/DeliveryQuoteBox"

type BuyCheckoutBoxProps = {
  listingId: string
  sellerId?: string | null
  title: string
  price: number
  selectedDelivery?: DeliveryQuote | null
  deliveryAvailable?: boolean
  onMessageSeller?: () => void
}

function money(value: number) {
  return Number.isFinite(value) ? value.toLocaleString("en-GB", { maximumFractionDigits: 2 }) : "0"
}

export default function BuyCheckoutBox({
  listingId,
  sellerId,
  title,
  price,
  selectedDelivery,
  deliveryAvailable = true,
  onMessageSeller,
}: BuyCheckoutBoxProps) {
  const deliveryPrice = selectedDelivery?.price || 0
  const total = price + deliveryPrice
  const checkoutDisabled = deliveryAvailable && !selectedDelivery

  function handleBuyNow() {
    if (checkoutDisabled) {
      alert("Please choose a CaterBids delivery option before checkout, or message the seller to arrange collection.")
      return
    }

    const params = new URLSearchParams({
      listingId,
      title,
      itemPrice: String(price),
      deliveryName: deliveryAvailable
        ? selectedDelivery?.name || "Delivery not selected"
        : "Collection only",
      deliveryPrice: String(deliveryPrice),
      total: String(total),
      sellerId: sellerId || "",
      returnUrl: `/listing?id=${listingId}`,
      deliveryQuoteId: selectedDelivery?.id || "",
      deliveryProvider: selectedDelivery?.provider || "",
      deliveryPostcode: selectedDelivery?.deliveryPostcode || "",
      collectionPostcode: selectedDelivery?.collectionPostcode || "",
      weightKg: String(selectedDelivery?.weightKg || ""),
      lengthCm: String(selectedDelivery?.lengthCm || ""),
      widthCm: String(selectedDelivery?.widthCm || ""),
      heightCm: String(selectedDelivery?.heightCm || ""),
      palletReady: selectedDelivery?.palletReady ? "true" : "false",
      tailLiftRequired: selectedDelivery?.tailLiftRequired ? "true" : "false",
      palletCount: String(selectedDelivery?.palletCount || ""),
      insuranceValue: String(selectedDelivery?.insuranceValue || price || ""),
    })

    window.location.href = `/checkout?${params.toString()}`
  }

  return (
    <div className="rounded-3xl border border-[#FF6B00]/40 bg-white p-5 text-[#002E5D] shadow-lg shadow-black/20">
      <h3 className="text-xl font-black">Ready to buy?</h3>
      <p className="mt-1 text-sm text-slate-600">
        {deliveryAvailable
          ? "Review the item and delivery cost before checkout."
          : "This listing is collection only. Review the item total before checkout."}
      </p>

      <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
        <div className="flex justify-between gap-3 text-sm">
          <span className="font-semibold text-slate-600">Item</span>
          <span className="text-right font-bold text-[#002E5D]">{title}</span>
        </div>

        <div className="flex justify-between gap-3 text-sm">
          <span className="font-semibold text-slate-600">Item price</span>
          <span className="font-black text-[#002E5D]">£{money(price)}</span>
        </div>

        {deliveryAvailable ? (
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-600">Delivery</span>
            <span className="text-right font-black text-[#002E5D]">
              {selectedDelivery ? `${selectedDelivery.name} - £${money(deliveryPrice)}` : "Not selected"}
            </span>
          </div>
        ) : (
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-600">Collection</span>
            <span className="text-right font-black text-[#002E5D]">Collection only - £0</span>
          </div>
        )}

        <div className="border-t border-slate-200 pt-3">
          <div className="flex justify-between gap-3">
            <span className="text-base font-black text-[#002E5D]">Total</span>
            <span className="text-2xl font-black text-[#FF6B00]">£{money(total)}</span>
          </div>
        </div>
      </div>

      {deliveryAvailable && !selectedDelivery && (
        <p className="mt-3 rounded-xl bg-orange-50 p-3 text-xs font-bold text-orange-700">
          Select a delivery option above first, or continue as collection only.
        </p>
      )}

      <button
        type="button"
        onClick={handleBuyNow}
        disabled={checkoutDisabled}
        className="mt-4 w-full rounded-2xl bg-[#FF6B00] px-5 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
      >
        {deliveryAvailable ? "Continue to payment" : "Buy Now"}
      </button>

      <button
        type="button"
        onClick={onMessageSeller}
        className="mt-3 w-full rounded-2xl border border-[#002E5D]/20 bg-white px-5 py-4 text-base font-black text-[#002E5D] hover:bg-slate-50"
      >
        Message Seller
      </button>

      <p className="mt-3 text-center text-xs text-slate-500">
        Secure checkout saves the order and delivery request. Final courier confirmation will follow.
      </p>
    </div>
  )
}
