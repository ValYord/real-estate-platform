import { z } from 'zod'
import { AGENTS_SORT_OPTIONS } from './types'

/**
 * Zod validation for Page 10 — Agent / Agency Profile.
 * Mirrors docs/en/pages/10-agent-profile.md §5 "Validation (zod)".
 */

/** Accepts a generic E.164 phone number (matches lib/property/schemas.ts). */
const E164_PHONE = /^\+[1-9]\d{6,14}$/

// ── POST /api/agents/[id]/reviews ───────────────────────────────────────────

export const agentReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating is required').max(5),
  text: z.string().min(10, 'Review is too short').max(1000),
})

export type AgentReviewInput = z.infer<typeof agentReviewSchema>

export const agentReviewsQuerySchema = z.object({
  sort: z.enum(['newest', 'highest', 'lowest']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
})

export type AgentReviewsQueryInput = z.infer<typeof agentReviewsQuerySchema>

// ── GET /api/agents/[id]/listings ───────────────────────────────────────────

export const agentListingsQuerySchema = z.object({
  deal: z.enum(['all', 'sale', 'rent']).default('all'),
  sort: z.enum(['new', 'price_asc', 'price_desc']).default('new'),
  page: z.coerce.number().int().min(1).default(1),
})

export type AgentListingsQueryInput = z.infer<typeof agentListingsQuerySchema>

// ── POST /api/conversations (agent-initiated, no property) ─────────────────

export const agentConversationSchema = z.object({
  agentId: z.string().uuid('agentId must be a UUID'),
  message: z.string().min(1).max(2000),
})

export type AgentConversationInput = z.infer<typeof agentConversationSchema>

// ── POST /api/agent-leads ───────────────────────────────────────────────────

export const agentLeadSchema = z.object({
  agentId: z.string().uuid('agentId must be a UUID'),
  dealType: z.enum(['buy', 'sell', 'rent']),
  propertyType: z.string().min(1, 'Property type is required'),
  city: z.string().min(2, 'City is required'),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  currency: z.enum(['AMD', 'RUB', 'USD', 'EUR']),
  rooms: z.number().int().positive().optional(),
  name: z.string().min(2, 'Name is required').max(50),
  phone: z.string().regex(E164_PHONE, 'Invalid phone number'),
  message: z.string().max(1000).optional(),
  /** Honeypot — must stay empty to pass the spam filter. */
  website: z.string().max(0, 'Spam detected').optional(),
})

export type AgentLeadInput = z.infer<typeof agentLeadSchema>

// ── POST /api/agents/[id]/reviews/[reviewId]/reply ──────────────────────────

export const agentReviewReplySchema = z.object({
  reply: z.string().min(1, 'Reply cannot be empty').max(1000),
})

export type AgentReviewReplyInput = z.infer<typeof agentReviewReplySchema>

// ── GET /api/agents (Page 11 — Find an Agent directory) ─────────────────────

export const agentsQuerySchema = z.object({
  city: z.string().trim().min(1, 'City must not be empty').max(100).optional(),
  specialty: z.string().trim().min(1, 'Specialty must not be empty').max(50).optional(),
  lang: z.string().trim().min(2, 'Language code is too short').max(5).optional(),
  minRating: z.coerce
    .number({ invalid_type_error: 'minRating must be a number' })
    .min(0, 'minRating must be between 0 and 5')
    .max(5, 'minRating must be between 0 and 5')
    .optional(),
  sort: z.enum(AGENTS_SORT_OPTIONS, {
    errorMap: () => ({ message: `sort must be one of: ${AGENTS_SORT_OPTIONS.join(', ')}` }),
  }).default('rating'),
  page: z.coerce
    .number({ invalid_type_error: 'page must be a number' })
    .int('page must be an integer')
    .positive('page must be positive')
    .max(1000, 'page is out of range')
    .default(1),
})

export type AgentsQueryInput = z.infer<typeof agentsQuerySchema>

/**
 * Parse a URLSearchParams (or Next.js `searchParams` record) into a validated
 * AgentsQueryInput. Empty strings are treated the same as an absent param so
 * defaults apply. Throws ZodError on invalid input — callers decide the
 * fallback (see app/[locale]/agents/page.tsx).
 */
export function parseAgentsSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): AgentsQueryInput {
  const get = (key: string): string | undefined => {
    const raw = params instanceof URLSearchParams
      ? params.get(key)
      : (() => {
        const v = params[key]
        return Array.isArray(v) ? v[0] : v
      })()
    return raw === null || raw === undefined || raw === '' ? undefined : raw
  }

  return agentsQuerySchema.parse({
    city: get('city'),
    specialty: get('specialty'),
    lang: get('lang'),
    minRating: get('minRating'),
    sort: get('sort'),
    page: get('page'),
  })
}

/** Serialize an AgentsQueryInput back to a URLSearchParams (shareable/bookmarkable URL). */
export function agentsQueryToParams(query: Partial<AgentsQueryInput>): URLSearchParams {
  const p = new URLSearchParams()
  if (query.city) p.set('city', query.city)
  if (query.specialty) p.set('specialty', query.specialty)
  if (query.lang) p.set('lang', query.lang)
  if (query.minRating !== undefined) p.set('minRating', String(query.minRating))
  if (query.sort && query.sort !== 'rating') p.set('sort', query.sort)
  if (query.page && query.page > 1) p.set('page', String(query.page))
  return p
}

// ── POST /api/reports (review target) ───────────────────────────────────────

export const reviewReportSchema = z.object({
  targetType: z.literal('review'),
  targetId: z.string().uuid('targetId must be a UUID'),
  reason: z.enum(['spam', 'fraud', 'abuse', 'other'], {
    errorMap: () => ({ message: 'Invalid reason' }),
  }),
  note: z.string().max(500).optional(),
})

export type ReviewReportInput = z.infer<typeof reviewReportSchema>
