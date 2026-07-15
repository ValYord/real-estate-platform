import { z } from 'zod'

/**
 * Zod validation for Page 10 — Agent / Agency Profile.
 * Mirrors docs/en/pages/10-agent-profile.md §5 "Validation (zod)".
 */

/** Accepts a generic E.164 phone number (matches lib/property/schemas.ts). */
const E164_PHONE = /^\+[1-9]\d{6,14}$/

// ── POST /api/agents/[slug]/reviews ─────────────────────────────────────────

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

// ── GET /api/agents/[slug]/listings ─────────────────────────────────────────

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

// ── POST /api/agents/[slug]/reviews/[reviewId]/reply ────────────────────────

export const agentReviewReplySchema = z.object({
  reply: z.string().min(1, 'Reply cannot be empty').max(1000),
})

export type AgentReviewReplyInput = z.infer<typeof agentReviewReplySchema>

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
