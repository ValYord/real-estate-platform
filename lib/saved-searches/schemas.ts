import { z } from 'zod'
import { filtersSchema } from '@/lib/search/filtersSchema'
import { ALERT_FREQUENCIES } from './types'

/** Alert frequency — reused by the create/patch schemas and by `<FrequencyToggle>`. */
export const alertFrequencySchema = z.enum(ALERT_FREQUENCIES)

/**
 * Body for POST /api/saved-searches.
 * `filters` reuses the exact `/search` filters schema — no parallel shape.
 */
export const savedSearchSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name must be 60 characters or fewer'),
  filters: filtersSchema,
  alertFrequency: alertFrequencySchema.default('daily'),
})

export type SavedSearchInput = z.infer<typeof savedSearchSchema>

/** Body for PATCH /api/saved-searches/[id] — every field optional, at least one required. */
export const patchSavedSearchSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(60, 'Name must be 60 characters or fewer').optional(),
    filters: filtersSchema.optional(),
    alertFrequency: alertFrequencySchema.optional(),
    // The only way the client can mutate this in this task — reset-to-zero on
    // "Open search". No cron writes to this column yet.
    newMatchCount: z.literal(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' })

export type PatchSavedSearchInput = z.infer<typeof patchSavedSearchSchema>
