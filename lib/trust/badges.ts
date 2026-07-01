export type TrustBadgeKey =
  | "verified_user"
  | "id_verified"
  | "verified_business"
  | "top_rated"
  | "fast_responder"
  | "trusted_seller"

export type TrustBadge = {
  key: TrustBadgeKey
  label: string
  description: string
}

export type SellerTrustInput = {
  emailVerified?: boolean | null
  phoneVerified?: boolean | null
  idVerified?: boolean | null
  businessVerified?: boolean | null
  stripeConnected?: boolean | null
  createdAt?: string | null
  completedSales?: number | null
  disputeCount?: number | null
  averageRating?: number | null
  reviewCount?: number | null
  responseRate?: number | null
  averageResponseHours?: number | null
  accountAgeMonths?: number | null
}

export type SellerTrustSummary = {
  badges: TrustBadge[]
  ratingLabel: string
  reviewCount: number
  completedSales: number
  responseLabel: string
  progressPercent: number
  progressText: string
  internalScore: number
}

const BADGE_COPY: Record<TrustBadgeKey, TrustBadge> = {
  verified_user: {
    key: "verified_user",
    label: "Verified User",
    description: "Email and mobile ownership have been checked.",
  },
  id_verified: {
    key: "id_verified",
    label: "ID Verified",
    description: "Seller identity has been checked.",
  },
  verified_business: {
    key: "verified_business",
    label: "Verified Business",
    description: "Business details and payout setup have been checked.",
  },
  top_rated: {
    key: "top_rated",
    label: "Top Rated",
    description: "High rating across completed sales.",
  },
  fast_responder: {
    key: "fast_responder",
    label: "Fast Responder",
    description: "Usually replies quickly.",
  },
  trusted_seller: {
    key: "trusted_seller",
    label: "Trusted Seller",
    description: "Established seller with strong transaction history.",
  },
}

export function formatUKDate(date?: string | null) {
  if (!date) return "Not available"

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return "Not available"

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(parsed)
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function buildSellerTrustSummary(input: SellerTrustInput): SellerTrustSummary {
  const reviewCount = Number(input.reviewCount || 0)
  const averageRating = Number(input.averageRating || 0)
  const completedSales = Number(input.completedSales || 0)
  const responseRate = Number(input.responseRate || 0)
  const averageResponseHours = Number(input.averageResponseHours || 0)
  const disputeCount = Number(input.disputeCount || 0)
  const ageMonths = Number(input.accountAgeMonths || 0)
  const emailVerified = Boolean(input.emailVerified)
  const phoneVerified = Boolean(input.phoneVerified)
  const idVerified = Boolean(input.idVerified)
  const businessVerified = Boolean(input.businessVerified && input.stripeConnected !== false)

  const badges: TrustBadge[] = []
  if (emailVerified && phoneVerified) badges.push(BADGE_COPY.verified_user)
  if (idVerified) badges.push(BADGE_COPY.id_verified)
  if (businessVerified) badges.push(BADGE_COPY.verified_business)
  if (averageRating >= 4.8 && completedSales >= 20) badges.push(BADGE_COPY.top_rated)
  if (responseRate >= 90 && averageResponseHours > 0 && averageResponseHours <= 2) {
    badges.push(BADGE_COPY.fast_responder)
  }
  if (ageMonths >= 6 && disputeCount === 0 && completedSales >= 50) badges.push(BADGE_COPY.trusted_seller)

  const progressParts = [
    emailVerified ? 20 : 0,
    phoneVerified ? 25 : 0,
    idVerified ? 25 : 0,
    businessVerified ? 30 : 0,
  ]
  const progressPercent = progressParts.reduce((total, value) => total + value, 0)

  const internalScore = clampScore(
    progressPercent * 0.35 +
      Math.min(30, completedSales * 0.6) +
      Math.min(25, averageRating * 5) +
      Math.min(10, ageMonths) -
      Math.min(30, disputeCount * 10)
  )

  return {
    badges,
    ratingLabel: reviewCount > 0 && averageRating > 0 ? `${averageRating.toFixed(1)} (${reviewCount})` : "New seller",
    reviewCount,
    completedSales,
    responseLabel: responseRate > 0 ? `${Math.round(responseRate)}% response rate` : "Response rate building",
    progressPercent,
    progressText:
      progressPercent >= 100
        ? "Trust profile complete"
        : `${progressPercent}% complete - verify more details to build buyer trust`,
    internalScore,
  }
}
