export const CONDITION_OPTIONS = [
  "New",
  "Used",
  "Refurbished",
  "Spares or repairs",
  "Untested",
]

export const POWER_TYPE_OPTIONS = [
  "Unknown",
  "Single Phase",
  "Three Phase",
  "Electric",
  "Natural Gas",
  "LPG / Propane",
  "Dual Fuel",
  "Plug & Play 13A",
  "Hardwired",
  "Not Applicable",
]

export const WARRANTY_TYPE_OPTIONS = [
  "No warranty",
  "Seller tested",
  "Engineer tested",
  "Parts warranty",
  "Parts & labour warranty",
  "Refurbished supplier warranty",
]

export const TESTED_STATUS_OPTIONS = [
  "Working",
  "Tested",
  "Untested",
  "Needs repair",
  "Spares only",
]

export const DELIVERY_OPTION_OPTIONS = [
  "Collection only",
  "Delivery available through CaterBids",
  "Local delivery available",
  "Pallet delivery available",
  "Courier delivery available",
  "Buyer arranges transport",
  "Delivery quote required",
]

export const BUYER_WARNING =
  "Buyers should always check condition, power type, dimensions, warranty, delivery requirements and installation needs before purchase."

export const SAFETY_DISCLAIMER =
  "CaterBidsUK provides listing information to help buyers compare equipment. Buyers and sellers remain responsible for checking safety, suitability, installation requirements and legal compliance."

export type ListingTrustInfo = {
  title?: string | null
  category?: string | null
  description?: string | null
  condition?: string | null
  power_type?: string | null
  gas_type?: string | null
  electrical_phase?: string | null
  dimensions?: string | null
  service_history?: string | null
  warranty_type?: string | null
  manuals_available?: boolean | null
  tested_status?: string | null
  delivery_option?: string | null
  collection_postcode?: string | null
  vat_included?: boolean | null
  pallet_ready?: boolean | null
  tail_lift_required?: boolean | null
  delivery_available?: boolean | null
}

const checklistByCategory = {
  fryer: [
    "Confirm gas or electric model and whether baskets, lids and drain taps are included.",
    "Check oil tank condition, thermostat response, safety cut-out and drain valve leaks.",
    "Ask when it was last cleaned, serviced and PAT or gas checked.",
  ],
  fridge: [
    "Confirm it reaches and holds food-safe temperature before collection.",
    "Check door seals, shelves, compressor noise, refrigerant type and defrost operation.",
    "Measure access routes because commercial refrigeration can be heavy and deep.",
  ],
  oven: [
    "Confirm power, phase, gas type, installation requirements and extraction needs.",
    "Ask for service history, error codes, probe condition, trays and water treatment details.",
    "Check dimensions, door seals, controls, fans and steam generation before paying.",
  ],
  sink: [
    "Check bowl size, drainer side, taps, waste kit and whether legs or undershelf are included.",
    "Confirm stainless condition, dents, leaks, wall fixing points and collection size.",
    "Measure your prep area and check hygiene layout before buying.",
  ],
  kebab: [
    "Confirm LPG or natural gas setup and burner condition.",
    "Check motor, skewer, drip tray, burner ceramics and heat controls.",
    "Ask whether a qualified gas engineer has tested it for the current fuel type.",
  ],
  glasswasher: [
    "Confirm basket size, pump condition, rinse boiler, drain pump and water softener needs.",
    "Check wash temperature, rinse temperature, leaks and whether chemicals lines are intact.",
    "Ask about service history and whether it needs single or three phase power.",
  ],
  prep: [
    "Confirm stainless grade, table dimensions, undershelf, castors and load rating.",
    "Check dents, sharp edges, wobble, welds and whether it fits through your doorways.",
    "Measure height and depth against your kitchen layout before collection.",
  ],
  general: [
    "Ask the seller to show it powered on or working where possible.",
    "Confirm exact size, power type, delivery access and what accessories are included.",
    "Check warranty, service history and whether professional installation is needed.",
  ],
}

export function buyerChecklistForListing(listing: ListingTrustInfo) {
  const text = `${listing.title || ""} ${listing.category || ""} ${listing.description || ""}`.toLowerCase()

  if (/(fryer|chip fryer)/.test(text)) return { label: "Fryer", items: checklistByCategory.fryer }
  if (/(fridge|freezer|refrigeration|chiller|chilled)/.test(text)) return { label: "Fridge/freezer", items: checklistByCategory.fridge }
  if (/(oven|combi|rational|convection)/.test(text)) return { label: "Oven/combi oven", items: checklistByCategory.oven }
  if (/(sink|bowl|wash basin|washbasin)/.test(text)) return { label: "Sink", items: checklistByCategory.sink }
  if (/(kebab|doner|gyro|gyros)/.test(text)) return { label: "Kebab/doner machine", items: checklistByCategory.kebab }
  if (/(glasswasher|dishwasher|warewasher|warewashing)/.test(text)) {
    return { label: "Glasswasher/dishwasher", items: checklistByCategory.glasswasher }
  }
  if (/(prep table|stainless table|preparation table|stainless)/.test(text)) {
    return { label: "Prep table/stainless table", items: checklistByCategory.prep }
  }

  return { label: "General catering equipment", items: checklistByCategory.general }
}

export function trustBadgesForListing(listing: ListingTrustInfo) {
  const badges: string[] = []

  if (listing.tested_status && !/untested|unknown/i.test(listing.tested_status)) {
    badges.push(listing.tested_status)
  }

  if (listing.warranty_type && !/no warranty/i.test(listing.warranty_type)) {
    badges.push(listing.warranty_type)
  }

  if (listing.power_type && !/unknown/i.test(listing.power_type)) {
    badges.push(listing.power_type)
  }

  if (listing.manuals_available) {
    badges.push("Manuals")
  }

  if (listing.vat_included) {
    badges.push("VAT included")
  }

  if (listing.delivery_option && !/buyer arranges|quote required/i.test(listing.delivery_option)) {
    badges.push(listing.delivery_option)
  }

  if (listing.delivery_available) {
    badges.push("Delivery Available")
  }

  if (listing.pallet_ready) {
    badges.push("Pallet Ready")
  }

  if (listing.tail_lift_required) {
    badges.push("Tail-Lift Available")
  }

  return badges.slice(0, 4)
}

export function valueOrNotProvided(value?: string | null) {
  return value?.trim() || "Not provided"
}
