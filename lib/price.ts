export function parseListingPrice(raw: unknown): number | null {
  const s = String(raw ?? "").trim()
  if (!s) return null

  // Strip currency symbols and whitespace only (commas and dots handled separately)
  const stripped = s.replace(/[£€$¥\s]/g, "")
  if (!stripped) return null

  const hasComma = stripped.includes(",")
  const withoutCommas = hasComma ? stripped.replace(/,/g, "") : stripped

  const dots = (withoutCommas.match(/\./g) ?? []).length
  if (dots >= 2) return null

  // "15.000" with no comma is ambiguous (could be 15 or 15000 in EU notation)
  if (dots === 1 && !hasComma) {
    const afterDot = withoutCommas.split(".")[1] ?? ""
    if (afterDot.length === 3) return null
  }

  const n = Number(withoutCommas)
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return null
  return n
}

// Canonical price string used as the price segment of a duplicate-detection key.
// Normalises both stored DB prices and pasted strings to the same format so
// "£1,200", "1200", and "£1200" all produce the same key.
export function priceKey(raw: string | null | undefined): string {
  const n = parseListingPrice(raw ?? '')
  if (n === null) return (raw ?? '').toLowerCase().trim()
  return `£${n % 1 === 0 ? n : n.toFixed(2)}`
}
