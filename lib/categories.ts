export type CaterBidsCategory = {
  title: string
  slug: string
  description: string
  searchQuery: string
  subcategories: string[]
  marketplaceType?: "equipment" | "vans" | "businesses"
}

export const MARKETPLACE_CATEGORIES: CaterBidsCategory[] = [
  {
    title: "Catering Equipment",
    slug: "catering-equipment",
    description: "Browse all commercial catering equipment, from ovens and refrigeration to sinks and spares.",
    searchQuery: "commercial catering equipment",
    marketplaceType: "equipment",
    subcategories: [],
  },
  {
    title: "Catering Vans & Trailers",
    slug: "catering-vans-trailers",
    description: "Catering vans, food trucks, trailers, coffee vans and fitted mobile catering units.",
    searchQuery: "catering van food truck catering trailer",
    marketplaceType: "vans",
    subcategories: [
      "Catering Vans",
      "Food Trucks",
      "Catering Trailers",
      "Coffee Vans",
      "Burger Vans",
      "Pizza Vans",
      "Other Vans & Trailers",
    ],
  },
  {
    title: "Catering Businesses",
    slug: "catering-businesses",
    description: "Cafes, takeaways, restaurants and catering businesses for sale or transfer.",
    searchQuery: "catering business cafe takeaway restaurant business for sale",
    marketplaceType: "businesses",
    subcategories: [
      "Cafés",
      "Takeaways",
      "Restaurants",
      "Coffee Shops",
      "Food Van Businesses",
      "Commercial Kitchens",
      "Other Catering Businesses",
    ],
  },
]

export const CATERING_CATEGORIES: CaterBidsCategory[] = [
  {
    title: "Cooking Equipment",
    slug: "cooking-equipment",
    description: "Commercial ovens, fryers, grills, hobs and hot-food equipment.",
    searchQuery: "commercial cooking equipment",
    subcategories: [
      "Ovens & Combi Ovens",
      "Fryers",
      "Grills & Chargrills",
      "Ranges & Hobs",
      "Microwaves",
      "Kebab / Doner Machines",
      "Other Cooking Equipment",
    ],
  },
  {
    title: "Refrigeration",
    slug: "refrigeration",
    description: "Commercial fridges, freezers, bottle coolers, ice machines and cold storage.",
    searchQuery: "commercial refrigeration",
    subcategories: [
      "Commercial Fridges",
      "Commercial Freezers",
      "Prep / Counter Refrigerators",
      "Display Refrigerators",
      "Bottle Coolers",
      "Ice Machines",
      "Cold Rooms",
      "Other Refrigeration",
    ],
  },
  {
    title: "Food Preparation",
    slug: "food-preparation",
    description: "Mixers, slicers, processors, vacuum packers and prep machines.",
    searchQuery: "commercial food preparation equipment",
    subcategories: [
      "Mixers",
      "Food Processors",
      "Vegetable Prep Machines",
      "Slicers & Mincers",
      "Vacuum Packing Machines & Sealers",
      "Scales & Weighing Equipment",
      "Other Food Preparation",
    ],
  },
  {
    title: "Warewashing & Sinks",
    slug: "warewashing-sinks",
    description: "Dishwashers, glasswashers, sinks, basins, sprays and water treatment.",
    searchQuery: "commercial warewashing sinks",
    subcategories: [
      "Dishwashers",
      "Pass-Through Dishwashers",
      "Glasswashers",
      "Sinks & Basins",
      "Pre-Rinse Sprays",
      "Water Softeners",
      "Dishwasher Tables & Drainage",
      "Other Warewashing",
    ],
  },
  {
    title: "Coffee & Bar Equipment",
    slug: "coffee-bar-equipment",
    description: "Coffee machines, grinders, water boilers, bar fridges and bar sinks.",
    searchQuery: "commercial coffee bar equipment",
    subcategories: [
      "Coffee Machines",
      "Coffee Grinders",
      "Water Boilers & Dispensers",
      "Bar Fridges",
      "Bottle Coolers",
      "Ice Machines",
      "Bar Sinks",
      "Other Coffee & Bar Equipment",
    ],
  },
  {
    title: "Display & Serving",
    slug: "display-serving",
    description: "Heated, chilled and front-of-counter display and serving equipment.",
    searchQuery: "commercial display serving equipment",
    subcategories: [
      "Heated Display Cabinets",
      "Chilled Display Cabinets",
      "Serve-Over Counters & Saladettes",
      "Cake & Pastry Displays",
      "Buffet & Servery Counters",
      "Hot Cupboards & Plate Warmers",
      "Soup Kettles & Bain Maries",
      "Other Display & Serving",
    ],
  },
  {
    title: "Stainless Steel & Storage",
    slug: "stainless-steel-storage",
    description: "Stainless tables, shelving, cabinets, trolleys, bins and extraction canopies.",
    searchQuery: "stainless steel catering storage",
    subcategories: [
      "Stainless Steel Tables & Workbenches",
      "Shelving & Racking",
      "Stainless Cabinets & Cupboards",
      "Trolleys & Service Carts",
      "Storage Containers & Bins",
      "Gastronorm Pans & Accessories",
      "Canopies and extraction",
      "Other Stainless & Storage",
    ],
  },
  {
    title: "Parts & Spares",
    slug: "parts-spares",
    description: "Replacement parts and spares for core commercial catering equipment.",
    searchQuery: "commercial catering equipment parts spares",
    subcategories: [
      "Oven Parts",
      "Fryer Parts",
      "Refrigeration Parts",
      "Dishwasher & Glasswasher Parts",
      "Coffee Machine Parts",
      "Gas Fittings & Parts",
      "Electrical Parts & Elements",
      "Other Parts & Spares",
    ],
  },
]

export const CATEGORY_TITLES = CATERING_CATEGORIES.map((category) => category.title)
export const MARKETPLACE_CATEGORY_TITLES = MARKETPLACE_CATEGORIES.map((category) => category.title)
export const CATEGORY_OPTIONS = ["All Categories", ...MARKETPLACE_CATEGORY_TITLES]

export function slugifyCategory(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\//g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function categoryBySlug(slug: string | null | undefined) {
  if (!slug) return null
  if (slug === "catering-vans") {
    return MARKETPLACE_CATEGORIES.find((category) => category.slug === "catering-vans-trailers") || null
  }
  return (
    MARKETPLACE_CATEGORIES.find((category) => category.slug === slug) ||
    CATERING_CATEGORIES.find((category) => category.slug === slug) ||
    null
  )
}

export function categoryByTitle(title: string | null | undefined) {
  if (!title) return null
  const normalised = title.toLowerCase()
  if (normalised === "catering vans") {
    return MARKETPLACE_CATEGORIES.find((category) => category.slug === "catering-vans-trailers") || null
  }
  return (
    MARKETPLACE_CATEGORIES.find(
      (category) => category.title.toLowerCase() === normalised || category.slug === normalised
    ) ||
    CATERING_CATEGORIES.find(
      (category) => category.title.toLowerCase() === normalised || category.slug === normalised
    ) || null
  )
}

export function categoryFromParam(value: string | null | undefined) {
  if (!value || value === "All Categories" || value === "all") return null
  return categoryByTitle(value) || categoryBySlug(value) || categoryBySlug(slugifyCategory(value))
}

export function subcategoriesForCategory(categoryTitle: string | null | undefined) {
  const category = categoryByTitle(categoryTitle)
  if (category?.slug === "catering-equipment") return CATEGORY_TITLES
  return categoryByTitle(categoryTitle)?.subcategories || []
}

export function isEquipmentCategory(categoryTitle: string | null | undefined) {
  const category = categoryByTitle(categoryTitle)
  return !category || category.marketplaceType === "equipment" || CATERING_CATEGORIES.includes(category)
}
