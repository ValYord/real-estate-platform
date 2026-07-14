import { z } from 'zod'
import { CURRENCIES, TERM_MIN, TERM_MAX, PRICE_MAX } from '@/lib/mortgage/constants'
import { LOAN_TYPES } from './constants'

const CURRENCY_VALUES = CURRENCIES.map((c) => c.value) as [string, ...string[]]
const LOAN_TYPE_VALUES = LOAN_TYPES.map((t) => t.value) as [string, ...string[]]

/** Generic E.164 phone shape, same pattern as lib/agent/schemas.ts / lib/auth/schemas.ts (D8). */
const E164_PHONE = /^\+[1-9]\d{6,14}$/

// ── GET /api/mortgage/rates query filters ───────────────────────────────────

export const ratesFilterSchema = z.object({
  country: z.string().trim().toUpperCase().length(2).optional(),
  currency: z.enum(CURRENCY_VALUES).optional(),
  type: z.enum(LOAN_TYPE_VALUES).optional(),
  term: z.coerce.number().int().min(TERM_MIN).max(TERM_MAX).optional(),
  amount: z.coerce.number().positive().max(PRICE_MAX).optional(),
})

export type RatesFilter = z.infer<typeof ratesFilterSchema>

/**
 * Parses raw URLSearchParams into a RatesFilter. Unknown/blank keys are
 * dropped so zod's `.optional()` applies (same drop-undefined-keys
 * technique as lib/search/filtersSchema.ts's parseSearchParams). Throws a
 * ZodError on invalid values — callers use `.safeParse`-style try/catch
 * (the API route) or fall back to `{}` on failure (the page).
 */
export function parseRatesFilter(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): RatesFilter {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined
    const v = params[key]
    return Array.isArray(v) ? v[0] : v
  }

  const raw: Record<string, unknown> = {
    country: get('country'),
    currency: get('currency'),
    type: get('type'),
    term: get('term'),
    amount: get('amount'),
  }
  Object.keys(raw).forEach((k) => {
    if (raw[k] === undefined || raw[k] === '') delete raw[k]
  })

  return ratesFilterSchema.parse(raw)
}

/** Serializes a RatesFilter back to URLSearchParams — the inverse of parseRatesFilter, shared by RatesFilterBar (client) and the page's self-fetch (server). */
export function ratesFilterToParams(filters: Partial<RatesFilter>): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.country) params.set('country', filters.country)
  if (filters.currency) params.set('currency', filters.currency)
  if (filters.type) params.set('type', filters.type)
  if (filters.term !== undefined) params.set('term', String(filters.term))
  if (filters.amount !== undefined) params.set('amount', String(filters.amount))
  return params
}

// ── POST /api/mortgage/preapproval body ─────────────────────────────────────

export const preApprovalSchema = z.object({
  name: z.string().min(2, 'Name is required').max(50),
  phone: z.string().regex(E164_PHONE, 'Invalid phone number'),
  loanAmount: z.coerce.number().positive('Loan amount is required').max(PRICE_MAX),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
  // Context, not user-editable — populated from the page's current filters.
  country: z.string().trim().toUpperCase().length(2).optional(),
  currency: z.enum(CURRENCY_VALUES).optional(),
  /** Honeypot — must stay empty, same convention as agentLeadSchema. */
  website: z.string().max(0, 'Spam detected').optional(),
})

export type PreApprovalInput = z.infer<typeof preApprovalSchema>

/**
 * Client-form-only variant, omitting `consent`: react-hook-form's checkbox
 * needs to hold `false` while unticked, which doesn't type-check against
 * `preApprovalSchema`'s `z.literal(true)`. The form validates the rest of
 * the fields with this schema and checks `consent` itself (a plain
 * `useState<boolean>`, see PreApprovalCtaBlock); the server route always
 * re-validates the full body — including consent — with `preApprovalSchema`.
 */
export const preApprovalFormSchema = preApprovalSchema.omit({ consent: true })

export type PreApprovalFormValues = z.infer<typeof preApprovalFormSchema>
