import type { Plan } from './types'

/**
 * Typed fallback used when Supabase isn't configured (same
 * `supabaseUrl.includes('your-project-id')` guard as
 * app/[locale]/search/page.tsx) or the `plans` query errors/returns no rows.
 * Values are a literal TypeScript transcription of
 * supabase/migrations/0009_plans.sql's seed INSERT — keep both in sync.
 */
export const DEFAULT_PLANS: Plan[] = [
  {
    tier: 'free',
    isPopular: false,
    prices: {
      AMD: { monthly: 0, annual: 0 },
      USD: { monthly: 0, annual: 0 },
      EUR: { monthly: 0, annual: 0 },
      RUB: { monthly: 0, annual: 0 },
    },
    features: {
      listings: 3,
      featuredPerMonth: 0,
      analytics: 'basic',
      proBadge: false,
      rankingPriority: 'none',
      leadInbox: 'none',
      bulkUpload: false,
      teamSeats: 0,
      support: 'community',
      placementGuarantee: false,
    },
  },
  {
    tier: 'pro',
    isPopular: false,
    prices: {
      AMD: { monthly: 9900, annual: 95040 },
      USD: { monthly: 25, annual: 240 },
      EUR: { monthly: 23, annual: 221 },
      RUB: { monthly: 2400, annual: 23040 },
    },
    features: {
      listings: 25,
      featuredPerMonth: 2,
      analytics: 'extended',
      proBadge: true,
      rankingPriority: 'medium',
      leadInbox: 'standard',
      bulkUpload: false,
      teamSeats: 1,
      support: 'email',
      placementGuarantee: false,
    },
  },
  {
    tier: 'premium',
    isPopular: true,
    prices: {
      AMD: { monthly: 24900, annual: 239040 },
      USD: { monthly: 65, annual: 624 },
      EUR: { monthly: 60, annual: 576 },
      RUB: { monthly: 6100, annual: 58560 },
    },
    features: {
      listings: null,
      featuredPerMonth: 10,
      analytics: 'full',
      proBadge: true,
      rankingPriority: 'high',
      leadInbox: 'priority',
      bulkUpload: true,
      teamSeats: 10,
      support: 'email_phone',
      placementGuarantee: true,
    },
  },
]
