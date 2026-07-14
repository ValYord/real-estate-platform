import { z } from 'zod'

/** Same 7d/30d/90d value set as `components/dashboard/StatsModal.tsx`. */
export const proDateRangeSchema = z.enum(['7d', '30d', '90d']).default('30d')

export const proAnalyticsMetricSchema = z
  .enum(['views', 'favorites', 'contactClicks', 'leads'])
  .default('views')

/** Query params for GET /api/pro/overview */
export const overviewQuerySchema = z.object({
  range: proDateRangeSchema,
})

export type OverviewQueryInput = z.infer<typeof overviewQuerySchema>

/** Query params for GET /api/pro/analytics */
export const analyticsQuerySchema = z.object({
  range: proDateRangeSchema,
  metric: proAnalyticsMetricSchema,
})

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>
