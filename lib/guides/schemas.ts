import { z } from 'zod'

/** The 4 canonical journey-stage categories used to group guides on the hub. */
export const guideCategorySchema = z.enum(['buyer', 'seller', 'renter', 'finance'])

/**
 * Query params for the `/guides` hub (`?search=&category=`).
 *
 * Both fields fall back to `undefined` on any parse failure (`.catch()`) —
 * malformed/unknown input never throws; the hub simply renders its
 * unfiltered default view instead of a 500. This also covers pre-existing
 * nav links to non-canonical category values (e.g. `selling-tips`,
 * `renting-tips` in components/layout/Header.tsx) — they fall through to
 * the "no guides in this category yet" empty state rather than crashing.
 */
export const guidesSearchParamsSchema = z.object({
  search: z
    .string()
    .trim()
    .max(100)
    // Strip ILIKE wildcard characters so a user-supplied '%'/'_' can't change
    // the *meaning* of their own search (e.g. accidentally matching
    // everything). The Supabase client already parameterizes .ilike()/.or()
    // calls — this is about search-result correctness, not SQL injection.
    .transform((s) => s.replace(/[%_]/g, ''))
    .transform((s) => (s.length > 0 ? s : undefined))
    .optional()
    .catch(undefined),
  category: guideCategorySchema.optional().catch(undefined),
})

export type GuidesSearchParams = z.infer<typeof guidesSearchParamsSchema>
