/**
 * Human-readable labels for a `Filters` object (from `lib/search/filtersSchema.ts`).
 *
 * Used by `<FilterChips>` (saved-searches card) and `<SaveSearchModal>`
 * (auto-generated name) so a saved search reads the same way the `/search`
 * filter bar (`components/search/FilterBar.tsx`) displayed it. This module
 * intentionally mirrors `FilterBar`'s label vocabulary (deal toggle labels,
 * beds label, price formatting) without importing from it — `FilterBar` is a
 * client component with no exported label helpers, and duplicating a handful
 * of pure string functions here keeps `/search` untouched (out of scope
 * beyond the single `onSaveSearch` touch point).
 */
import type { Filters, PropertyTypeFilter } from '@/lib/search/filtersSchema'

// Mirrors FilterBar's DEAL_OPTIONS.
const DEAL_LABELS: Record<Filters['deal'], string> = {
  sale: 'Buy',
  rent: 'Rent',
}

const TYPE_LABELS: Record<PropertyTypeFilter, string> = {
  apartment: 'Apartment',
  house: 'House',
  land: 'Land',
  commercial: 'Commercial',
  newdev: 'New development',
  garage: 'Garage',
}

export interface FilterChip {
  key: string
  label: string
}

export function dealLabel(deal: Filters['deal']): string {
  return DEAL_LABELS[deal]
}

/** "Apartment" for one type, "Apartment +1" for multiple — matches the doc's overflow convention. */
export function typeLabel(types: PropertyTypeFilter[] | undefined): string | null {
  if (!types || types.length === 0) return null
  const first = TYPE_LABELS[types[0]]
  return types.length > 1 ? `${first} +${types.length - 1}` : first
}

/** `district ? "${city}, ${district}" : city` — matches FilterBar's location display. */
export function locationLabel(city: string | undefined, district: string | undefined): string | null {
  if (!city) return null
  return district ? `${city}, ${district}` : city
}

/** Matches FilterBar's `bedsLabel` ("2+ beds"). */
export function bedsLabel(beds: number | undefined): string | null {
  return beds ? `${beds}+ beds` : null
}

export function bathsLabel(baths: number | undefined): string | null {
  return baths ? `${baths}+ baths` : null
}

export function areaLabel(areaMin: number | undefined): string | null {
  return areaMin ? `${areaMin}+ m²` : null
}

/** Matches FilterBar's price-label formatting ("up to 60M ֏" / "20–60M ֏"). Values are AMD (֏). */
export function priceLabel(priceMin: number | undefined, priceMax: number | undefined): string | null {
  if (priceMin === undefined && priceMax === undefined) return null
  if (priceMin && priceMax) {
    return `${Math.round(priceMin / 1e6)}–${Math.round(priceMax / 1e6)}M ֏`
  }
  if (priceMax) return `up to ${Math.round(priceMax / 1e6)}M ֏`
  return `from ${Math.round((priceMin ?? 0) / 1e6)}M ֏`
}

const MAX_VISIBLE_CHIPS = 5

/**
 * Builds the ordered list of filter-summary chips for a saved search.
 * Caps at 5 visible chips; the rest collapse into a final "+N filters" chip
 * (the caller is responsible for the click-to-expand interaction — this
 * function only decides which chips are "extra").
 */
export function buildFilterChips(filters: Filters): { visible: FilterChip[]; overflow: FilterChip[] } {
  const all: FilterChip[] = [{ key: 'deal', label: dealLabel(filters.deal) }]

  const type = typeLabel(filters.type)
  if (type) all.push({ key: 'type', label: type })

  const location = locationLabel(filters.city, filters.district)
  if (location) all.push({ key: 'location', label: location })

  const beds = bedsLabel(filters.beds)
  if (beds) all.push({ key: 'beds', label: beds })

  const baths = bathsLabel(filters.baths)
  if (baths) all.push({ key: 'baths', label: baths })

  const area = areaLabel(filters.areaMin)
  if (area) all.push({ key: 'area', label: area })

  const price = priceLabel(filters.priceMin, filters.priceMax)
  if (price) all.push({ key: 'price', label: price })

  return {
    visible: all.slice(0, MAX_VISIBLE_CHIPS),
    overflow: all.slice(MAX_VISIBLE_CHIPS),
  }
}

/**
 * Auto-generates a saved-search name from the current filters, e.g.
 * "2+ beds · Yerevan, Arabkir · up to 100M ֏". Falls back to "{deal} search"
 * when no distinguishing filters are set (deal alone isn't distinguishing
 * enough to build a name from).
 */
export function autoSavedSearchName(filters: Filters): string {
  const parts = [
    bedsLabel(filters.beds),
    locationLabel(filters.city, filters.district),
    typeLabel(filters.type),
    priceLabel(filters.priceMin, filters.priceMax),
  ].filter((p): p is string => p !== null)

  if (parts.length === 0) {
    return `${dealLabel(filters.deal)} search`
  }

  return parts.join(' · ')
}
