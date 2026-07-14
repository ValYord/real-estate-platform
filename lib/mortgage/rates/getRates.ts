import 'server-only'
import type { CalculatorCurrency } from '@/lib/mortgage/constants'
import type { RatesFilter } from './schemas'
import type { LoanType } from './constants'
import type { RateRow, RateOffer } from './types'
import { STALE_DAYS } from './constants'
import { MOCK_RATE_ROWS } from './mockRates'

export interface RatesQueryResult {
  updatedAt: string | null
  items: RateOffer[]
}

/** `updated_at` older than STALE_DAYS → stale (§5.3). `now` is injectable for tests. */
export function isStale(updatedAtIso: string, now: number = Date.now()): boolean {
  const ageMs = now - new Date(updatedAtIso).getTime()
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000
}

/**
 * Pure filter predicate shared by the mock-data path and the (documented,
 * not-executed-in-CI) Supabase query below — unit-testable without a live
 * Supabase instance (handoff §5.2/§10 "filter query building").
 */
export function matchesRatesFilter(row: RateRow, filters: RatesFilter): boolean {
  if (filters.country && row.country !== filters.country) return false
  if (filters.currency && row.currency !== filters.currency) return false
  if (filters.type && row.loanType !== filters.type) return false
  if (filters.term !== undefined && (row.termMin > filters.term || row.termMax < filters.term)) {
    return false
  }
  return true
}

function toRateOffer(row: RateRow): RateOffer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit `country` from the public API item shape (D4)
  const { country, ...rest } = row
  return { ...rest, stale: isStale(row.updatedAt) }
}

function sortByRateAscending(items: RateOffer[]): RateOffer[] {
  return [...items].sort((a, b) => a.ratePct - b.ratePct)
}

function latestUpdatedAt(items: RateOffer[]): string | null {
  if (items.length === 0) return null
  return items.reduce((max, item) => (item.updatedAt > max ? item.updatedAt : max), items[0].updatedAt)
}

interface JoinedRow {
  country: string
  currency: string
  loan_type: string
  rate_pct: number
  term_min: number
  term_max: number
  min_down_pct: number | null
  max_ltv: number | null
  commission_pct: number
  updated_at: string
  partner_banks: { id: string; slug: string; name: string; logo: string | null } | null
}

/**
 * Queries `mortgage_rates` joined to `partner_banks` (active only), applying
 * the same predicates as `matchesRatesFilter`. Returns `null` (rather than
 * throwing) when Supabase isn't configured or the query fails, so `getRates`
 * can fall through to the mock-data path — same "attempt Supabase, fall back
 * to mock" shape as app/api/properties/route.ts.
 */
async function queryMortgageRates(filters: RatesFilter): Promise<RateRow[] | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-project-id')) {
    return null
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let query = supabase
      .from('mortgage_rates')
      .select(
        `country, currency, loan_type, rate_pct, term_min, term_max, min_down_pct, max_ltv,
         commission_pct, updated_at,
         partner_banks!inner(id, slug, name, logo, is_active)`,
      )
      .eq('partner_banks.is_active', true)
      .order('rate_pct', { ascending: true })

    if (filters.country) query = query.eq('country', filters.country)
    if (filters.currency) query = query.eq('currency', filters.currency)
    if (filters.type) query = query.eq('loan_type', filters.type)
    if (filters.term !== undefined) {
      query = query.lte('term_min', filters.term).gte('term_max', filters.term)
    }

    const { data, error } = await query
    if (error || !data) return null

    return (data as unknown as JoinedRow[])
      .filter((row) => row.partner_banks !== null)
      .map((row) => ({
        bankId: row.partner_banks!.id,
        bankSlug: row.partner_banks!.slug,
        bankName: row.partner_banks!.name,
        logo: row.partner_banks!.logo,
        country: row.country,
        currency: row.currency as CalculatorCurrency,
        loanType: row.loan_type as LoanType,
        ratePct: row.rate_pct,
        termMin: row.term_min,
        termMax: row.term_max,
        minDownPct: row.min_down_pct,
        maxLtv: row.max_ltv,
        commissionPct: row.commission_pct,
        updatedAt: row.updated_at,
      }))
  } catch {
    return null
  }
}

/**
 * `GET /api/mortgage/rates` data layer: Supabase-configured path queries the
 * real tables; the not-configured path filters the in-memory mock seed
 * (`MOCK_RATE_ROWS`) with the exact same predicate. Either path computes
 * `stale` server-side and returns `items` sorted `rate_pct` ascending.
 */
export async function getRates(filters: RatesFilter): Promise<RatesQueryResult> {
  const queried = await queryMortgageRates(filters)
  const rows = queried ?? MOCK_RATE_ROWS.filter((row) => matchesRatesFilter(row, filters))

  const items = sortByRateAscending(rows.map(toRateOffer))
  return { updatedAt: latestUpdatedAt(items), items }
}
