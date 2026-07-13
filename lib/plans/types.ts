import type { UserTier } from '@/types/database'

/** Same three values as `profiles.tier` (types/database.ts) — reused, not duplicated. */
export type PlanTier = UserTier

export type BillingCycle = 'monthly' | 'annual'

export type PlanCurrency = 'AMD' | 'USD' | 'EUR' | 'RUB'

export interface PlanCyclePrice {
  monthly: number
  annual: number
}

export type PlanPrices = Record<PlanCurrency, PlanCyclePrice>

export interface PlanFeatures {
  /** null = unlimited (Premium). */
  listings: number | null
  featuredPerMonth: number
  analytics: 'basic' | 'extended' | 'full'
  proBadge: boolean
  rankingPriority: 'none' | 'medium' | 'high'
  leadInbox: 'none' | 'standard' | 'priority'
  bulkUpload: boolean
  teamSeats: number
  support: 'community' | 'email' | 'email_phone'
  placementGuarantee: boolean
}

export interface Plan {
  tier: PlanTier
  isPopular: boolean
  prices: PlanPrices
  features: PlanFeatures
}

export interface CheckoutInput {
  tier: PlanTier
  cycle: BillingCycle
}

export interface CheckoutResponse {
  status: 'not_implemented'
  tier: PlanTier
  cycle: BillingCycle
}
