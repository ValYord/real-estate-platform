import { describe, it, expect } from 'vitest'
import { computeMarketSummary, computeSoldRecords, computeTrendSeries } from '../lib/market/aggregate'
import type { MarketPropertyRow } from '../lib/market/types'
import { MIN_TREND_POINTS } from '../lib/market/types'

const REFERENCE = new Date('2026-07-17T00:00:00.000Z')

function row(overrides: Partial<MarketPropertyRow> & Pick<MarketPropertyRow, 'id'>): MarketPropertyRow {
  return {
    price: 50_000_000,
    currency: 'AMD',
    dealType: 'sale',
    areaM2: 70,
    status: 'active',
    listedAt: REFERENCE.toISOString(),
    updatedAt: REFERENCE.toISOString(),
    ...overrides,
  }
}

describe('computeMarketSummary', () => {
  it('returns every metric as null/zero for an empty area (no fabricated numbers)', () => {
    const result = computeMarketSummary([], REFERENCE)
    expect(result.medianPrice).toBeNull()
    expect(result.activeCount).toBe(0)
    expect(result.pricePerM2).toBeNull()
    expect(result.yoyChange).toBeNull()
    expect(result.daysOnMarket).toBeNull()
    expect(result.marketType).toBeNull()
    expect(result.saleToList).toBeNull()
    expect(result.inventory).toBeNull()
  })

  it('computes the median sale price and mean $/m² from active sale rows only', () => {
    const rows: MarketPropertyRow[] = [
      row({ id: '1', price: 40_000_000, areaM2: 80 }),
      row({ id: '2', price: 50_000_000, areaM2: 100 }),
      row({ id: '3', price: 60_000_000, areaM2: 120 }),
      // A rent row must not pollute the sale median/price-per-m2.
      row({ id: '4', price: 999_999_999, dealType: 'rent' }),
      // A sold row must not count as "active".
      row({ id: '5', price: 1, status: 'sold' }),
    ]
    const result = computeMarketSummary(rows, REFERENCE)
    expect(result.medianPrice).toBe(50_000_000)
    expect(result.activeCount).toBe(3)
    expect(result.inventory).toBe(3)
    // mean(500000, 500000, 500000) = 500000
    expect(result.pricePerM2).toBe(500_000)
    expect(result.pricePerM2Currency).toBe('AMD')
  })

  it('always reports saleToList as null (no original-list-price history exists in this schema)', () => {
    const rows: MarketPropertyRow[] = [row({ id: '1' }), row({ id: '2', status: 'sold' })]
    expect(computeMarketSummary(rows, REFERENCE).saleToList).toBeNull()
  })

  it('derives daysOnMarket from sold rows and a marketType from that value', () => {
    const rows: MarketPropertyRow[] = [
      row({
        id: 'sold-1',
        status: 'sold',
        listedAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-15T00:00:00.000Z', // 14 days
      }),
      row({
        id: 'sold-2',
        status: 'sold',
        listedAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-19T00:00:00.000Z', // 18 days
      }),
    ]
    const result = computeMarketSummary(rows, REFERENCE)
    expect(result.daysOnMarket).toBe(16) // median(14, 18)
    expect(result.marketType).toBe('sellers') // <= 30 days
  })

  it('reports a buyers market when days-on-market is long', () => {
    const rows: MarketPropertyRow[] = [
      row({ id: 'sold-1', status: 'sold', listedAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z' }),
    ]
    expect(computeMarketSummary(rows, REFERENCE).marketType).toBe('buyers')
  })

  it('computes YoY change by comparing the latest populated month to the same month a year prior', () => {
    const rows: MarketPropertyRow[] = [
      row({ id: 'current', price: 55_000_000, listedAt: '2026-07-05T00:00:00.000Z' }),
      row({ id: 'year-ago', price: 50_000_000, listedAt: '2025-07-05T00:00:00.000Z' }),
    ]
    const result = computeMarketSummary(rows, REFERENCE)
    expect(result.yoyChange).toBe(10) // (55M - 50M) / 50M * 100
  })

  it('returns yoyChange: null when there is no same-month-last-year bucket to compare against', () => {
    const rows: MarketPropertyRow[] = [row({ id: '1', listedAt: '2026-07-05T00:00:00.000Z' })]
    expect(computeMarketSummary(rows, REFERENCE).yoyChange).toBeNull()
  })
})

describe('computeTrendSeries', () => {
  function monthlyRows(count: number, deal: MarketPropertyRow['dealType'] = 'sale'): MarketPropertyRow[] {
    return Array.from({ length: count }, (_, i) =>
      row({
        id: `m-${i}`,
        dealType: deal,
        price: 50_000_000 + i * 100_000,
        listedAt: new Date(Date.UTC(REFERENCE.getUTCFullYear(), REFERENCE.getUTCMonth() - i, 10)).toISOString(),
      }),
    )
  }

  it('flags insufficient data and clears the series when below MIN_TREND_POINTS', () => {
    const rows = monthlyRows(MIN_TREND_POINTS - 1)
    const result = computeTrendSeries(rows, '12m', 'sale', 'total', REFERENCE)
    expect(result.insufficient).toBe(true)
    expect(result.series).toEqual([])
    expect(result.pointCount).toBe(MIN_TREND_POINTS - 1)
  })

  it('returns a populated, sorted series once the minimum is met', () => {
    const rows = monthlyRows(MIN_TREND_POINTS)
    const result = computeTrendSeries(rows, '12m', 'sale', 'total', REFERENCE)
    expect(result.insufficient).toBe(false)
    expect(result.pointCount).toBe(MIN_TREND_POINTS)
    expect(result.series).toHaveLength(MIN_TREND_POINTS)
    const dates = result.series.map((p) => p.date)
    expect(dates).toEqual([...dates].sort())
  })

  it('never mixes deal types into the same series', () => {
    const rows = [...monthlyRows(MIN_TREND_POINTS, 'sale'), ...monthlyRows(2, 'rent')]
    const rentResult = computeTrendSeries(rows, '12m', 'rent', 'total', REFERENCE)
    expect(rentResult.insufficient).toBe(true)
    expect(rentResult.pointCount).toBe(2)
  })

  it('skips rows with no areaM2 when metric=per_m2', () => {
    const rows = [
      row({ id: '1', price: 60_000_000, areaM2: 100, listedAt: REFERENCE.toISOString() }),
      row({ id: '2', price: 999, areaM2: null, listedAt: REFERENCE.toISOString() }),
    ]
    const result = computeTrendSeries(rows, '12m', 'sale', 'per_m2', REFERENCE)
    // Only 1 populated month bucket (from row '1') — well below MIN_TREND_POINTS regardless.
    expect(result.pointCount).toBeLessThanOrEqual(1)
  })
})

describe('computeSoldRecords', () => {
  it('generalizes every row to the district — the shape never carries an address', () => {
    const rows: MarketPropertyRow[] = [
      row({ id: '1', status: 'sold', price: 40_000_000, areaM2: 80, updatedAt: '2026-06-01T00:00:00.000Z' }),
      row({ id: '2', status: 'sold', price: 30_000_000, areaM2: null, updatedAt: '2026-06-15T00:00:00.000Z' }),
      row({ id: '3', status: 'active' }), // excluded — not sold
    ]
    const records = computeSoldRecords(rows, 'Arabkir')
    expect(records).toHaveLength(2)
    expect(records.every((r) => r.district === 'Arabkir')).toBe(true)
    expect(records.every((r) => !('address' in r))).toBe(true)
    // Most recent first.
    expect(records[0].id).toBe('2')
    expect(records[0].pricePerM2).toBeNull()
    expect(records[1].pricePerM2).toBe(500_000)
  })

  it('respects the limit', () => {
    const rows: MarketPropertyRow[] = Array.from({ length: 5 }, (_, i) =>
      row({ id: `s-${i}`, status: 'sold', updatedAt: new Date(2026, 0, i + 1).toISOString() }),
    )
    expect(computeSoldRecords(rows, 'Kentron', 2)).toHaveLength(2)
  })
})
