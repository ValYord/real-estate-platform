import { z } from 'zod'

export const PROPERTY_TYPES = ['apartment', 'house', 'land', 'commercial', 'newdev', 'garage'] as const
export type PropertyTypeFilter = (typeof PROPERTY_TYPES)[number]

export const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'area_desc', 'most_viewed'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export const filtersSchema = z
  .object({
    deal: z.enum(['sale', 'rent']).default('sale'),
    type: z
      .union([
        z.array(z.enum(PROPERTY_TYPES)),
        z.enum(PROPERTY_TYPES).transform((v) => [v]),
      ])
      .optional(),
    city: z.string().min(1).max(100).optional(),
    district: z.string().min(1).max(100).optional(),
    priceMin: z.coerce.number().int().nonnegative().optional(),
    priceMax: z.coerce.number().int().positive().optional(),
    beds: z.coerce.number().int().min(0).max(10).optional(),
    baths: z.coerce.number().int().min(0).max(10).optional(),
    areaMin: z.coerce.number().positive().optional(),
    sort: z.enum(SORT_OPTIONS).default('newest'),
    page: z.coerce.number().int().positive().default(1),
    bounds: z
      .string()
      .regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/)
      .optional(),
  })
  .refine(
    (d) => !d.priceMax || !d.priceMin || d.priceMax >= d.priceMin,
    {
      message: 'The maximum price must be greater than the minimum',
      path: ['priceMax'],
    },
  )

export type Filters = z.infer<typeof filtersSchema>

/** Parse URLSearchParams (snake_case keys) into the filters schema (camelCase). */
export function parseSearchParams(params: URLSearchParams | Record<string, string | string[]>): Filters {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined
    const v = (params as Record<string, string | string[]>)[key]
    return Array.isArray(v) ? v[0] : v
  }
  const getAll = (key: string): string[] => {
    if (params instanceof URLSearchParams) return params.getAll(key)
    const v = (params as Record<string, string | string[]>)[key]
    if (!v) return []
    return Array.isArray(v) ? v : [v]
  }

  const raw: Record<string, unknown> = {
    deal: get('deal'),
    type: getAll('type').length > 0 ? getAll('type') : undefined,
    city: get('city'),
    district: get('district'),
    priceMin: get('price_min'),
    priceMax: get('price_max'),
    beds: get('beds'),
    baths: get('baths'),
    areaMin: get('area_min'),
    sort: get('sort'),
    page: get('page'),
    bounds: get('bounds'),
  }
  // Remove undefined entries so zod defaults kick in
  Object.keys(raw).forEach((k) => raw[k] === undefined && delete raw[k])

  const result = filtersSchema.parse(raw)
  return result
}

/** Serialize Filters back to URLSearchParams (snake_case). */
export function filtersToParams(filters: Partial<Filters>): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.deal) p.set('deal', filters.deal)
  if (filters.city) p.set('city', filters.city)
  if (filters.district) p.set('district', filters.district)
  if (filters.priceMin !== undefined) p.set('price_min', String(filters.priceMin))
  if (filters.priceMax !== undefined) p.set('price_max', String(filters.priceMax))
  if (filters.beds !== undefined) p.set('beds', String(filters.beds))
  if (filters.baths !== undefined) p.set('baths', String(filters.baths))
  if (filters.areaMin !== undefined) p.set('area_min', String(filters.areaMin))
  if (filters.sort && filters.sort !== 'newest') p.set('sort', filters.sort)
  if (filters.page && filters.page > 1) p.set('page', String(filters.page))
  if (filters.bounds) p.set('bounds', filters.bounds)
  filters.type?.forEach((t) => p.append('type', t))
  return p
}
