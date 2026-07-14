import { describe, expect, it, beforeAll, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { matchesRatesFilter, getRates } from '@/lib/mortgage/rates/getRates'
import { MOCK_RATE_ROWS } from '@/lib/mortgage/rates/mockRates'
import type { RateRow } from '@/lib/mortgage/rates/types'

const baseRow: RateRow = {
  bankId: 'b1',
  bankSlug: 'bank-one',
  bankName: 'Bank One',
  logo: null,
  country: 'AM',
  currency: 'AMD',
  loanType: 'primary',
  ratePct: 11.9,
  termMin: 15,
  termMax: 20,
  minDownPct: 20,
  maxLtv: 80,
  commissionPct: 1,
  updatedAt: new Date().toISOString(),
}

describe('matchesRatesFilter', () => {
  it('matches when no filters are set (default no-filter case)', () => {
    expect(matchesRatesFilter(baseRow, {})).toBe(true)
  })

  it('filters by country', () => {
    expect(matchesRatesFilter(baseRow, { country: 'AM' })).toBe(true)
    expect(matchesRatesFilter(baseRow, { country: 'RU' })).toBe(false)
  })

  it('filters by currency', () => {
    expect(matchesRatesFilter(baseRow, { currency: 'AMD' })).toBe(true)
    expect(matchesRatesFilter(baseRow, { currency: 'USD' })).toBe(false)
  })

  it('filters by loan type', () => {
    expect(matchesRatesFilter(baseRow, { type: 'primary' })).toBe(true)
    expect(matchesRatesFilter(baseRow, { type: 'refinance' })).toBe(false)
  })

  it('term filter only matches rows whose [termMin, termMax] contains it', () => {
    expect(matchesRatesFilter(baseRow, { term: 15 })).toBe(true)
    expect(matchesRatesFilter(baseRow, { term: 20 })).toBe(true)
    expect(matchesRatesFilter(baseRow, { term: 18 })).toBe(true)
    expect(matchesRatesFilter(baseRow, { term: 14 })).toBe(false)
    expect(matchesRatesFilter(baseRow, { term: 25 })).toBe(false)
  })

  it('combines multiple filters (AND)', () => {
    expect(matchesRatesFilter(baseRow, { country: 'AM', currency: 'AMD', term: 15 })).toBe(true)
    expect(matchesRatesFilter(baseRow, { country: 'AM', currency: 'USD' })).toBe(false)
  })
})

describe('getRates (mock-data fallback path — no Supabase configured)', () => {
  beforeAll(() => {
    // Ensure the Supabase branch is skipped so getRates always uses MOCK_RATE_ROWS.
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('no-filter call returns all seeded rows, across at least 2 countries', async () => {
    const result = await getRates({})
    expect(result.items.length).toBe(MOCK_RATE_ROWS.length)
    const countries = new Set(MOCK_RATE_ROWS.map((r) => r.country))
    expect(countries.size).toBeGreaterThanOrEqual(2)
  })

  it('items are always sorted rate_pct ascending', async () => {
    const result = await getRates({})
    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i].ratePct).toBeGreaterThanOrEqual(result.items[i - 1].ratePct)
    }
  })

  it('narrows the result set when filtered by country', async () => {
    const result = await getRates({ country: 'AM' })
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.length).toBeLessThan(MOCK_RATE_ROWS.length)
  })

  it('narrows the result set when filtered by currency', async () => {
    const result = await getRates({ currency: 'RUB' })
    expect(result.items.length).toBeGreaterThan(0)
    result.items.forEach((item) => expect(item.currency).toBe('RUB'))
  })

  it('narrows the result set when filtered by loan type', async () => {
    const result = await getRates({ type: 'government' })
    result.items.forEach((item) => expect(item.loanType).toBe('government'))
  })

  it('a filter combination matching nothing returns { items: [] }, not a throw', async () => {
    const result = await getRates({ country: 'AM', currency: 'RUB' })
    expect(result.items).toEqual([])
    expect(result.updatedAt).toBeNull()
  })

  it('marks rows older than 30 days as stale', async () => {
    const result = await getRates({})
    const staleItem = result.items.find((item) => item.stale)
    expect(staleItem).toBeTruthy()
  })

  it('does not include a country field on the public item shape (matches the documented API response)', async () => {
    const result = await getRates({})
    result.items.forEach((item) => expect(item).not.toHaveProperty('country'))
  })

  it('updatedAt is the max updated_at across the returned items', async () => {
    const result = await getRates({})
    const expectedMax = result.items.reduce(
      (max, item) => (item.updatedAt > max ? item.updatedAt : max),
      result.items[0].updatedAt,
    )
    expect(result.updatedAt).toBe(expectedMax)
  })
})
