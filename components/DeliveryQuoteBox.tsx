"use client"

import { useState } from "react"

export type DeliveryQuote = {
  id: string
  name: string
  price: number
  eta: string
  description?: string
  recommended?: boolean
  provider?: string
  collectionPostcode?: string | null
  deliveryPostcode?: string
  weightKg?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  palletReady?: boolean | null
  tailLiftRequired?: boolean | null
  palletCount?: number | null
  insuranceValue?: number | null
}

type DeliveryQuoteBoxProps = {
  listingId?: string
  collectionPostcode?: string | null
  weightKg?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  palletReady?: boolean | null
  tailLiftRequired?: boolean | null
  palletCount?: number | null
  insuranceValue?: number | null
  deliveryAvailable?: boolean | null
  onSelectDelivery?: (quote: DeliveryQuote | null) => void
}

export default function DeliveryQuoteBox({
  collectionPostcode,
  weightKg,
  lengthCm,
  widthCm,
  heightCm,
  palletReady,
  tailLiftRequired,
  palletCount,
  insuranceValue,
  deliveryAvailable = true,
  onSelectDelivery,
}: DeliveryQuoteBoxProps) {
  const [postcode, setPostcode] = useState("")
  const [loading, setLoading] = useState(false)
  const [quotes, setQuotes] = useState<DeliveryQuote[]>([])
  const [error, setError] = useState("")
  const [selectedQuote, setSelectedQuote] = useState<DeliveryQuote | null>(null)
  const [quoteProvider, setQuoteProvider] = useState("")

  async function getQuote() {
    setError("")
    setQuotes([])
    setSelectedQuote(null)
    onSelectDelivery?.(null)
    setQuoteProvider("")

    if (!postcode.trim()) {
      setError("Please enter a delivery postcode.")
      return
    }

    setLoading(true)

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_CATERBIDS_DELIVERY_API ||
        "http://157.245.42.103:3001"

      const requestBody = {
        collectionPostcode,
        deliveryPostcode: postcode,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        palletReady,
        tailLiftRequired,
        palletCount,
        insuranceValue,
      }

      const res = await fetch(`${apiBase}/api/delivery/quote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Delivery quote failed.")
      }

      setQuoteProvider(data.provider || "Live delivery API")
      setQuotes(
        Array.isArray(data.quotes)
          ? data.quotes.map((quote: DeliveryQuote) => ({
              ...quote,
              provider: data.provider || "Live delivery API",
              collectionPostcode,
              deliveryPostcode: postcode,
              weightKg,
              lengthCm,
              widthCm,
              heightCm,
              palletReady,
              tailLiftRequired,
              palletCount,
              insuranceValue,
            }))
          : []
      )
    } catch (err) {
      console.error("Delivery quote error:", err)

      try {
        const fallbackRes = await fetch("/api/delivery/quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            collectionPostcode,
            deliveryPostcode: postcode,
            weightKg,
            lengthCm,
            widthCm,
            heightCm,
            palletReady,
            tailLiftRequired,
            palletCount,
            insuranceValue,
          }),
        })
        const fallbackData = await fallbackRes.json()

        if (!fallbackRes.ok || !fallbackData.success) {
          throw new Error(fallbackData.error || "Delivery quote failed.")
        }

        setQuoteProvider("Local beta fallback")
        setQuotes(
          Array.isArray(fallbackData.quotes)
            ? fallbackData.quotes.map((quote: DeliveryQuote) => ({
                ...quote,
                provider: "Local beta fallback",
                collectionPostcode,
                deliveryPostcode: postcode,
                weightKg,
                lengthCm,
                widthCm,
                heightCm,
                palletReady,
                tailLiftRequired,
                palletCount,
                insuranceValue,
              }))
            : []
        )
        setError("Live delivery prices are unavailable, so these are beta estimates.")
      } catch (fallbackError) {
        console.error("Delivery quote fallback error:", fallbackError)
        setError("Unable to get live delivery prices right now. Please try again shortly.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (!deliveryAvailable) {
    return (
      <div className="premium-card rounded-3xl border-white/10 p-5">
        <h3 className="text-lg font-black text-white">Collection only</h3>
        <p className="mt-1 text-sm text-white/60">
          Contact the seller to arrange pickup.
        </p>
      </div>
    )
  }

  return (
    <div className="premium-card rounded-3xl border-[#FF6B00]/25 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-white">
            Check delivery
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-white/65">
            Enter a postcode for pallet options.
          </p>
        </div>

        <span className="rounded-full bg-[#FF6B00]/10 px-3 py-1 text-xs font-black text-[#FF6B00]">
          Delivery
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-xs font-bold sm:grid-cols-2">
        <span className="rounded-full bg-[#002E5D]/70 px-3 py-2 text-white">
          Delivery available
        </span>
        {palletReady && (
          <span className="rounded-full bg-[#002E5D]/70 px-3 py-2 text-white">
            Pallet ready
          </span>
        )}
        {tailLiftRequired && (
          <span className="rounded-full bg-[#002E5D]/70 px-3 py-2 text-white">
            Tail-lift available
          </span>
        )}
      </div>

      <p className="mt-4 text-xs font-semibold text-orange-100">
        Choose delivery before checkout.
      </p>

      <div className="mt-5">
        <label className="text-sm font-bold text-white">
          Delivery postcode
        </label>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={postcode}
            onChange={(event) => setPostcode(event.target.value.toUpperCase())}
            placeholder="e.g. B12 0AB"
            className="premium-input w-full rounded-2xl px-4 py-3 text-sm"
          />

          <button
            type="button"
            onClick={getQuote}
            disabled={loading}
            className="premium-button rounded-2xl px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? "Checking..." : "Check delivery"}
          </button>
        </div>

        {error && <p className="mt-2 text-sm font-bold text-red-300">{error}</p>}
      </div>

      {quotes.length > 0 && (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-black text-white">Choose delivery</h4>
            {quoteProvider && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/55">
                {quoteProvider}
              </span>
            )}
          </div>

          {quotes.map((quote) => {
            const isSelected = selectedQuote?.id === quote.id

            return (
              <button
                key={quote.id}
                type="button"
                onClick={() => {
                  setSelectedQuote(quote)
                  onSelectDelivery?.(quote)
                }}
                className={`w-full rounded-3xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-[#FF6B00] bg-[#FF6B00]/10"
                    : "border-white/10 bg-white/[0.04] hover:border-[#FF6B00]/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="font-black text-white">{quote.name}</h5>
                      {quote.recommended && (
                        <span className="rounded-full bg-[#FF6B00] px-2 py-1 text-[10px] font-black text-white">
                          Recommended
                        </span>
                      )}
                    </div>
                    {quote.description && (
                      <p className="mt-1 text-sm text-white/65">{quote.description}</p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-white/45">
                      ETA: {quote.eta}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-black text-[#FF6B00]">
                      £{quote.price}
                    </p>
                    <p className="text-xs text-white/45">estimate</p>
                  </div>
                </div>

                <span className="mt-4 block w-full rounded-2xl bg-[#002E5D] px-4 py-3 text-center text-sm font-black text-white">
                  {isSelected ? "Selected" : "Select Delivery"}
                </span>
              </button>
            )
          })}

          {selectedQuote && (
            <div className="rounded-3xl border border-green-400/25 bg-green-500/10 p-4">
              <p className="text-sm font-black text-green-100">
                Selected delivery: {selectedQuote.name} - £{selectedQuote.price}
              </p>
              <p className="mt-1 text-xs text-green-100/70">
                Delivery postcode: {selectedQuote.deliveryPostcode}. Delivery request is saved before payment; final courier confirmation follows.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
