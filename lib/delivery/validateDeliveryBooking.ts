export type DeliveryBookingOrder = {
  collection_full_address?: string | null
  collection_postcode?: string | null
  seller_contact_name?: string | null
  seller_phone?: string | null
  buyer_delivery_full_address?: string | null
  buyer_delivery_postcode?: string | null
  buyer_phone?: string | null
  pallet_weight_kg?: number | null
  pallet_length_cm?: number | null
  pallet_width_cm?: number | null
  pallet_height_cm?: number | null
  pallet_count?: number | null
  insurance_value?: number | null
}

const requiredFields: Array<{
  key: keyof DeliveryBookingOrder
  label: string
  type: "text" | "number"
}> = [
  { key: "collection_full_address", label: "Collection full address", type: "text" },
  { key: "collection_postcode", label: "Collection postcode", type: "text" },
  { key: "seller_contact_name", label: "Seller contact name", type: "text" },
  { key: "seller_phone", label: "Seller phone", type: "text" },
  { key: "buyer_delivery_full_address", label: "Buyer delivery full address", type: "text" },
  { key: "buyer_delivery_postcode", label: "Buyer delivery postcode", type: "text" },
  { key: "buyer_phone", label: "Buyer phone", type: "text" },
  { key: "pallet_weight_kg", label: "Pallet weight kg", type: "number" },
  { key: "pallet_length_cm", label: "Pallet length cm", type: "number" },
  { key: "pallet_width_cm", label: "Pallet width cm", type: "number" },
  { key: "pallet_height_cm", label: "Pallet height cm", type: "number" },
  { key: "pallet_count", label: "Pallet count", type: "number" },
  { key: "insurance_value", label: "Insurance value", type: "number" },
]

export function validateDeliveryBooking(order: DeliveryBookingOrder | null | undefined) {
  const missingFields: string[] = []

  for (const field of requiredFields) {
    const value = order?.[field.key]
    const isMissing =
      field.type === "number"
        ? !(Number(value || 0) > 0)
        : typeof value !== "string" || value.trim().length === 0

    if (isMissing) {
      missingFields.push(field.label)
    }
  }

  return {
    ready: missingFields.length === 0,
    missingFields,
  }
}
