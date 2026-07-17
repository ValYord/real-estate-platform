import { z } from 'zod'

/**
 * `GET /api/market/[area]/trends?period=&deal=&metric=` query validation.
 * Matches docs/en/pages/20-neighborhood.md §5 exactly.
 */
export const trendsQuerySchema = z.object({
  period: z.enum(['12m', '5y']).default('12m'),
  deal: z.enum(['sale', 'rent']).default('sale'),
  metric: z.enum(['total', 'per_m2']).default('total'),
})
export type TrendsQuery = z.infer<typeof trendsQuerySchema>

/** `GET /api/market/[area]/sold?limit=` query validation. */
export const soldQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20),
})
export type SoldQuery = z.infer<typeof soldQuerySchema>

export function parseTrendsQuery(params: URLSearchParams): TrendsQuery {
  return trendsQuerySchema.parse({
    period: params.get('period') ?? undefined,
    deal: params.get('deal') ?? undefined,
    metric: params.get('metric') ?? undefined,
  })
}

export function parseSoldQuery(params: URLSearchParams): SoldQuery {
  return soldQuerySchema.parse({
    limit: params.get('limit') ?? undefined,
  })
}
