export function isFeaturedAndActive(item: Record<string, unknown>): boolean {
  if (!item.featured && !item.is_featured) return false
  const until = item.featured_until
  if (!until) return false
  return new Date(String(until)).getTime() > Date.now()
}

export function applyFeaturedFirst<T extends Record<string, unknown>>(items: T[]): T[] {
  const featured = items.filter(isFeaturedAndActive)
  const normal = items.filter((item) => !isFeaturedAndActive(item))
  return [...featured, ...normal]
}
