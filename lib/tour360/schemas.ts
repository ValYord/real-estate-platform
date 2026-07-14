import { z } from 'zod'

/**
 * Page 26 — 360° Virtual Tour Viewer (Part A).
 *
 * `tour_data` is a jsonb column (see supabase/migrations/0011_virtual_tour.sql)
 * whose shape depends on the sibling `tour_type` column. Nothing guarantees
 * the jsonb blob actually matches that shape (a bad manual DB edit, a future
 * Part B bug, a partial write) — so every place that *reads* tour_data
 * (the property API route) or the client component that renders it validates
 * it with the schemas below and fails safely (renders a fallback card)
 * instead of throwing. See CLAUDE.md: "Validate external input at server
 * boundaries" — jsonb from the DB is external input in this sense too.
 */

export const tourTypeSchema = z.enum(['panorama', 'embed_url', 'video'])

export type TourType = z.infer<typeof tourTypeSchema>

/** One scene = one or more equirectangular images (MVP: single-scene, no multi-room hotspot graph — see D3 in the design handoff). */
export const panoramaTourDataSchema = z.object({
  panoramaUrls: z.array(z.string().url()).min(1),
  /** Optional hint for the "Tap to load 360° (~8 MB)" placeholder copy. */
  sizeMB: z.number().positive().optional(),
})

export type PanoramaTourData = z.infer<typeof panoramaTourDataSchema>

export const embedTourDataSchema = z.object({
  embedUrl: z.string().url(),
  provider: z.string().optional(),
})

export type EmbedTourData = z.infer<typeof embedTourDataSchema>

export const videoTourDataSchema = z.object({
  videoUrl: z.string().url(),
})

export type VideoTourData = z.infer<typeof videoTourDataSchema>

export type ParsedTour =
  | { type: 'panorama'; data: PanoramaTourData }
  | { type: 'embed_url'; data: EmbedTourData }
  | { type: 'video'; data: VideoTourData }

/**
 * Validate `tour_data` against the schema for the given `tour_type`.
 * Never throws — returns `null` for an unknown tour_type, a missing
 * tour_data, or a tour_data shape that doesn't match its declared type, so
 * callers can render a "This tour couldn't be loaded" fallback instead of
 * crashing the property page.
 */
export function parseTourData(tourType: unknown, tourData: unknown): ParsedTour | null {
  const typeResult = tourTypeSchema.safeParse(tourType)
  if (!typeResult.success || tourData == null) return null

  switch (typeResult.data) {
    case 'panorama': {
      const parsed = panoramaTourDataSchema.safeParse(tourData)
      return parsed.success ? { type: 'panorama', data: parsed.data } : null
    }
    case 'embed_url': {
      const parsed = embedTourDataSchema.safeParse(tourData)
      return parsed.success ? { type: 'embed_url', data: parsed.data } : null
    }
    case 'video': {
      const parsed = videoTourDataSchema.safeParse(tourData)
      return parsed.success ? { type: 'video', data: parsed.data } : null
    }
  }
}
