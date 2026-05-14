const FULL_UK_POSTCODE_PATTERN = /\b(GIR\s*0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i

export function formatUkPostcode(value: string) {
  const compact = value.replace(/\s+/g, "").toUpperCase()
  if (compact === "GIR0AA") return "GIR 0AA"
  if (compact.length <= 3) return compact
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`
}

export function resolveFullUkPostcode(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue

    const match = value.toUpperCase().match(FULL_UK_POSTCODE_PATTERN)
    if (match?.[1]) {
      return formatUkPostcode(match[1])
    }
  }

  return ""
}

export function isFullUkPostcode(value: unknown) {
  if (typeof value !== "string") return false
  const trimmed = value.trim().toUpperCase()
  return new RegExp(`^${FULL_UK_POSTCODE_PATTERN.source}$`, "i").test(trimmed)
}
