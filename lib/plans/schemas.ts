import { z } from 'zod'

/**
 * Body schema for POST /api/plans/checkout.
 * `tier` mirrors `profiles.tier` (types/database.ts UserTier); 'free' is
 * accepted too since the checkout button is one uniform control across all
 * three tiers in this MVP (see docs/design/17-pricing-handoff.md D4) — the
 * route stubs a response either way, no plan-specific branching.
 */
export const checkoutSchema = z.object({
  tier: z.enum(['free', 'pro', 'premium']),
  cycle: z.enum(['monthly', 'annual']),
})

export type CheckoutSchema = z.infer<typeof checkoutSchema>
