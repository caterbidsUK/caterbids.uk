export type CaterBidsDeliveryOption = {
  id: string
  name: string
  price: number
  eta: string
  description: string
  recommended?: boolean
  provider?: string
}

export const DELIVERY_PREVIEW_MODE_LABEL = "TEST READY / Preview only"

export function normaliseDeliveryOption(option: CaterBidsDeliveryOption) {
  return {
    ...option,
    price: Number(option.price || 0),
  }
}
