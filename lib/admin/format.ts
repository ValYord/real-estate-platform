/**
 * Small formatting helpers shared by the Moderation queue's row, card, and
 * drawer views (Page 24 — Admin Panel MVP). Mirrors the symbol map / fallback
 * chain already duplicated across CompareTable.tsx, PropertyMainInfo.tsx,
 * etc. — extracted here (rather than re-duplicated a fourth time) since two
 * admin components need the exact same formatting.
 */

const CURRENCY_SYMBOL: Record<string, string> = {
  AMD: '֏',
  USD: '$',
  EUR: '€',
  RUB: '₽',
}

export function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  return `${price.toLocaleString()} ${symbol}`
}

export interface ListingTitleLike {
  hy?: string
  ru?: string
  en?: string
}

/** Same fallback chain as ListingRow.tsx / CompareTable.tsx. */
export function getListingTitle(title: ListingTitleLike): string {
  return title.en ?? title.hy ?? title.ru ?? 'Untitled'
}

export function formatCreatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** "waiting {n}h" while under 24h, "waiting {n}d" past that — and whether the amber threshold applies. */
export function formatWaiting(iso: string): { text: string; isStale: boolean } {
  const ms = Math.max(0, Date.now() - new Date(iso).getTime())
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (hours < 24) {
    return { text: `waiting ${hours}h`, isStale: false }
  }
  const days = Math.floor(hours / 24)
  return { text: `waiting ${days}d`, isStale: true }
}
