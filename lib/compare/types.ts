import type { Currency, DealType } from '@/types/database'

/**
 * A single property row in the comparison table.
 *
 * `unavailable` covers both "sold" (row still exists, most fields populated)
 * and "hard-deleted" (no matching row at all — the synthetic entry built by
 * `mapCompareRows`/`getMockPropertiesByIds` for a requested id with no match).
 * The client renders the same "No longer available" state for both cases.
 */
export interface CompareProperty {
  id: string
  unavailable: boolean
  slug: string | null
  title: Record<string, string> | null
  price: number | null
  currency: Currency | null
  dealType: DealType | null
  area: number | null
  rooms: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  floorsTotal: number | null
  yearBuilt: number | null
  propertyType: string | null
  city: string | null
  district: string | null
  amenities: string[]
  cover: string | null
}

export interface ComparePropertiesResponse {
  items: CompareProperty[]
}
