import type { Currency, DealType } from '@/types/database'
import type { CompareProperty } from './types'

/** Shape of the row returned by the `.select()` in the `ids` branch of app/api/properties/route.ts. */
export interface CompareRow {
  id: string
  slug: string
  title: Record<string, string>
  price: number
  currency: string
  deal_type: string
  area_m2: number | null
  rooms: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  floors_total: number | null
  year_built: number | null
  property_type: string
  status: string
  city: string
  district: string | null
  amenities: string[] | null
  property_media: Array<{ url: string; sort_order: number }> | null
}

/**
 * Maps Supabase rows to `CompareProperty[]`, preserving the order of the
 * requested `ids` (Supabase's `.in()` does not guarantee row order). An id
 * with no matching row (hard-deleted) becomes a synthetic unavailable entry.
 * A row with `status === 'sold'` keeps its real fields but is flagged
 * unavailable — "sold" still has a DB row, so title/photo still render in
 * the unavailable column per the design handoff.
 */
export function mapCompareRows(rows: CompareRow[], ids: string[]): CompareProperty[] {
  const byId = new Map(rows.map((row) => [row.id, row]))

  return ids.map((id) => {
    const row = byId.get(id)
    if (!row) {
      return {
        id,
        unavailable: true,
        slug: null,
        title: null,
        price: null,
        currency: null,
        dealType: null,
        area: null,
        rooms: null,
        bedrooms: null,
        bathrooms: null,
        floor: null,
        floorsTotal: null,
        yearBuilt: null,
        propertyType: null,
        city: null,
        district: null,
        amenities: [],
        cover: null,
      }
    }

    const sortedMedia = [...(row.property_media ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    )

    return {
      id: row.id,
      unavailable: row.status === 'sold' || row.status === 'archived',
      slug: row.slug,
      title: row.title,
      price: row.price,
      currency: row.currency as Currency,
      dealType: row.deal_type as DealType,
      area: row.area_m2,
      rooms: row.rooms,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      floor: row.floor,
      floorsTotal: row.floors_total,
      yearBuilt: row.year_built,
      propertyType: row.property_type,
      city: row.city,
      district: row.district,
      amenities: row.amenities ?? [],
      cover: sortedMedia[0]?.url ?? null,
    }
  })
}
