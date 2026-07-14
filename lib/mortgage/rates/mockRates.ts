import type { BankSummary, RateRow } from './types'

/**
 * Hand-seeded fallback data for the Supabase-unconfigured dev/test path
 * (same convention as lib/search/mockData.ts). Mirrors the rows seeded by
 * supabase/migrations/0013_mortgage_rates.sql — keep both in sync.
 */
export const MOCK_BANKS: BankSummary[] = [
  {
    bankId: 'ardshinbank',
    slug: 'ardshinbank',
    name: 'Ardshinbank',
    logo: '/images/banks/ardshinbank.svg',
    country: ['AM'],
    description: 'Leading Armenian retail bank.',
    isActive: true,
  },
  {
    bankId: 'ameriabank',
    slug: 'ameriabank',
    name: 'Ameriabank',
    logo: '/images/banks/ameriabank.svg',
    country: ['AM'],
    description: 'Universal bank offering mortgage programs.',
    isActive: true,
  },
  {
    bankId: 'inecobank',
    slug: 'inecobank',
    name: 'Inecobank',
    logo: '/images/banks/inecobank.svg',
    country: ['AM'],
    description: 'Retail and SME bank with government mortgage programs.',
    isActive: true,
  },
  {
    bankId: 'sberbank-ru',
    slug: 'sberbank-ru',
    name: 'Sberbank',
    logo: '/images/banks/sberbank.svg',
    country: ['RU'],
    description: "Russia's largest retail bank.",
    isActive: true,
  },
  {
    bankId: 'vtb-ru',
    slug: 'vtb-ru',
    name: 'VTB',
    logo: '/images/banks/vtb.svg',
    country: ['RU'],
    description: 'Major Russian universal bank.',
    isActive: true,
  },
]

const DAY_MS = 24 * 60 * 60 * 1000
const now = () => new Date()

function daysAgo(days: number): string {
  return new Date(now().getTime() - days * DAY_MS).toISOString()
}

export const MOCK_RATE_ROWS: RateRow[] = [
  {
    bankId: 'ardshinbank', bankSlug: 'ardshinbank', bankName: 'Ardshinbank',
    logo: '/images/banks/ardshinbank.svg', country: 'AM', currency: 'AMD', loanType: 'primary',
    ratePct: 11.9, termMin: 15, termMax: 20, minDownPct: 20, maxLtv: 80, commissionPct: 1.0,
    updatedAt: daysAgo(0),
  },
  {
    bankId: 'ardshinbank', bankSlug: 'ardshinbank', bankName: 'Ardshinbank',
    logo: '/images/banks/ardshinbank.svg', country: 'AM', currency: 'AMD', loanType: 'secondary',
    ratePct: 12.5, termMin: 10, termMax: 20, minDownPct: 20, maxLtv: 80, commissionPct: 1.0,
    updatedAt: daysAgo(10),
  },
  {
    bankId: 'ameriabank', bankSlug: 'ameriabank', bankName: 'Ameriabank',
    logo: '/images/banks/ameriabank.svg', country: 'AM', currency: 'AMD', loanType: 'secondary',
    ratePct: 12.4, termMin: 10, termMax: 20, minDownPct: 15, maxLtv: 85, commissionPct: 1.5,
    updatedAt: daysAgo(45), // stale — > 30 days
  },
  {
    bankId: 'ameriabank', bankSlug: 'ameriabank', bankName: 'Ameriabank',
    logo: '/images/banks/ameriabank.svg', country: 'AM', currency: 'USD', loanType: 'primary',
    ratePct: 9.8, termMin: 10, termMax: 15, minDownPct: 20, maxLtv: 80, commissionPct: 1.0,
    updatedAt: daysAgo(2),
  },
  {
    bankId: 'inecobank', bankSlug: 'inecobank', bankName: 'Inecobank',
    logo: '/images/banks/inecobank.svg', country: 'AM', currency: 'AMD', loanType: 'government',
    ratePct: 10.5, termMin: 10, termMax: 20, minDownPct: 10, maxLtv: 90, commissionPct: 0.5,
    updatedAt: daysAgo(1),
  },
  {
    bankId: 'inecobank', bankSlug: 'inecobank', bankName: 'Inecobank',
    logo: '/images/banks/inecobank.svg', country: 'AM', currency: 'AMD', loanType: 'new_construction',
    ratePct: 12.0, termMin: 10, termMax: 25, minDownPct: 15, maxLtv: 85, commissionPct: 1.0,
    updatedAt: daysAgo(5),
  },
  {
    bankId: 'sberbank-ru', bankSlug: 'sberbank-ru', bankName: 'Sberbank',
    logo: '/images/banks/sberbank.svg', country: 'RU', currency: 'RUB', loanType: 'primary',
    ratePct: 16.5, termMin: 15, termMax: 30, minDownPct: 20, maxLtv: 80, commissionPct: 0.5,
    updatedAt: daysAgo(0),
  },
  {
    bankId: 'sberbank-ru', bankSlug: 'sberbank-ru', bankName: 'Sberbank',
    logo: '/images/banks/sberbank.svg', country: 'RU', currency: 'RUB', loanType: 'refinance',
    ratePct: 17.0, termMin: 10, termMax: 25, minDownPct: 20, maxLtv: 80, commissionPct: 0.5,
    updatedAt: daysAgo(35), // stale — > 30 days
  },
  {
    bankId: 'vtb-ru', bankSlug: 'vtb-ru', bankName: 'VTB',
    logo: '/images/banks/vtb.svg', country: 'RU', currency: 'RUB', loanType: 'primary',
    ratePct: 15.9, termMin: 15, termMax: 30, minDownPct: 15, maxLtv: 85, commissionPct: 0.7,
    updatedAt: daysAgo(3),
  },
  {
    bankId: 'vtb-ru', bankSlug: 'vtb-ru', bankName: 'VTB',
    logo: '/images/banks/vtb.svg', country: 'RU', currency: 'USD', loanType: 'secondary',
    ratePct: 10.2, termMin: 10, termMax: 20, minDownPct: 25, maxLtv: 75, commissionPct: 1.2,
    updatedAt: daysAgo(7),
  },
]
