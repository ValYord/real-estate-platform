import { z } from 'zod'

/**
 * zod validation for Page 12 — Home Value Tool.
 * `estimateRequestSchema` mirrors docs/en/pages/12-home-value.md §5 exactly,
 * extended with `city`/`district` (needed server-side to look up the
 * district-median price/m², see lib/home-value/medianLookup.ts).
 */

export const homeValuePropertyTypeSchema = z.enum(['apartment', 'house', 'land', 'commercial'])

// NOTE: 'needs_renovation' (not the doc's 'needs_work') to match the existing
// `properties.condition` CHECK constraint (0004_listing_wizard.sql) — this
// keeps a matched property's condition value directly usable without a
// translation table.
export const homeValueConditionSchema = z.enum(['new', 'renovated', 'good', 'needs_renovation'])

export const geoSuggestionSchema = z.object({
  label: z.string().min(1),
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  country: z.string().min(1),
  region: z.string().optional(),
  city: z.string().min(1),
  district: z.string().optional(),
  street: z.string().optional(),
})

export const autocompleteQuerySchema = z.object({
  q: z.string().trim().min(2, 'Type at least 2 characters').max(200),
})

export const matchQuerySchema = z.object({
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
})

export const estimateRequestSchema = z.object({
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  city: z.string().min(1, 'City is required'),
  district: z.string().trim().max(120).optional(),
  addressLabel: z.string().trim().max(300).optional(),
  propertyType: homeValuePropertyTypeSchema,
  areaM2: z.coerce.number().min(5, 'Area is too small').max(100000, 'Unrealistic area'),
  rooms: z.coerce.number().int().min(0).max(50).optional(),
  floor: z.coerce.number().int().min(-3).max(200).optional(),
  floorsTotal: z.coerce.number().int().min(1).max(200).optional(),
  yearBuilt: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
  condition: homeValueConditionSchema.optional(),
})

export type EstimateRequestInput = z.infer<typeof estimateRequestSchema>

/** Client-side form schema — same as `estimateRequestSchema` minus the geo fields (owned by the address step). */
export const propertyDetailsFormSchema = estimateRequestSchema.omit({
  lat: true,
  lng: true,
  city: true,
  district: true,
  addressLabel: true,
})

export type PropertyDetailsFormInput = z.infer<typeof propertyDetailsFormSchema>

/** Path param validation for `GET /api/home-value/[hash]` — defensive, hashes are opaque tokens. */
export const estimateHashSchema = z
  .string()
  .trim()
  .min(4)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid estimate hash')
