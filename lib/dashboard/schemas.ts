import { z } from 'zod'

/** Status toggle payload — used by PATCH /api/listings/[id] status path */
export const statusToggleSchema = z.object({
  status: z.enum(['active', 'archived']),
})

/** Query params for GET /api/listings/mine */
export const myListingsQuerySchema = z.object({
  status: z.enum(['active', 'draft', 'pending', 'archived']).default('active'),
})

/** Query params for GET /api/listings/[id]/stats */
export const statsRangeSchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('30d'),
})

/** Query params for GET /api/dashboard/activity */
export const activityQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type StatusToggleInput = z.infer<typeof statusToggleSchema>
export type MyListingsQuery = z.infer<typeof myListingsQuerySchema>
export type StatsRangeQuery = z.infer<typeof statsRangeSchema>
export type ActivityQuery = z.infer<typeof activityQuerySchema>
