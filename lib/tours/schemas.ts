import { z } from 'zod'

/**
 * Zod validation for Page 27 — Schedule a Tour (MVP).
 * See docs/design/27-schedule-tour-handoff.md §7.
 */

/** Accepts a generic E.164 phone number (matches lib/property/schemas.ts). */
const E164_PHONE = /^\+[1-9]\d{6,14}$/

export const TOUR_TYPES = ['in_person', 'video'] as const
export type TourType = (typeof TOUR_TYPES)[number]

/** Min lead time before a request can be booked (page-spec §5's own rule). */
export const MIN_LEAD_MS = 60 * 60 * 1000 // 1 hour
/** Near-term booking window (MVP substitute for a real availability calendar — see handoff §1 C2). */
export const MAX_LEAD_DAYS = 14

export const tourRequestSchema = z
  .object({
    propertyId: z.string().uuid('propertyId must be a UUID'),
    tourType: z.enum(TOUR_TYPES),
    requestedAt: z.string().datetime({ offset: true }),
    name: z.string().min(2, 'Name is required').max(50),
    phone: z.string().regex(E164_PHONE, 'Invalid phone number'),
    note: z.string().max(300).optional(),
    /** Honeypot — must stay empty to pass the spam filter. */
    website: z.string().max(0, 'Spam detected').optional(),
  })
  .refine(
    (v) => {
      const t = new Date(v.requestedAt).getTime()
      if (Number.isNaN(t)) return false
      const now = Date.now()
      return t >= now + MIN_LEAD_MS && t <= now + MAX_LEAD_DAYS * 24 * 60 * 60 * 1000
    },
    { message: 'Requested time must be between 1 hour and 14 days from now', path: ['requestedAt'] },
  )

export type TourRequestInput = z.infer<typeof tourRequestSchema>
