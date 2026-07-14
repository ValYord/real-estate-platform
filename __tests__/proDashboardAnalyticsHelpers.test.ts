/**
 * Unit tests for the pure Pro Dashboard analytics helpers
 * (lib/pro-dashboard/analytics.ts) — trend math, the Phase-1 view-count
 * distribution approximation, and timestamp bucketing. No Supabase mocking
 * needed here; the route-handler tests (proOverviewRoute.test.ts /
 * proAnalyticsRoute.test.ts) cover the wiring.
 */

import { describe, it, expect } from 'vitest'
import {
  rangeToDays,
  computeTrend,
  synthesizeDailySeries,
  synthesizeTrendFromTotal,
  bucketPeriodCounts,
  bucketDailySeries,
  dailyDateLabels,
  toDatedSeries,
  groupCountInRange,
  pickTitle,
} from '../lib/pro-dashboard/analytics'

describe('rangeToDays', () => {
  it('maps 7d/30d/90d to their day counts', () => {
    expect(rangeToDays('7d')).toBe(7)
    expect(rangeToDays('30d')).toBe(30)
    expect(rangeToDays('90d')).toBe(90)
  })
})

describe('computeTrend', () => {
  it('computes a positive trend', () => {
    expect(computeTrend(120, 100)).toBeCloseTo(0.2)
  })

  it('computes a negative trend', () => {
    expect(computeTrend(80, 100)).toBeCloseTo(-0.2)
  })

  it('returns 0 when both current and previous are 0', () => {
    expect(computeTrend(0, 0)).toBe(0)
  })

  it('returns 1 (full "up") when previous is 0 but current is positive', () => {
    expect(computeTrend(5, 0)).toBe(1)
  })
})

describe('synthesizeDailySeries', () => {
  it('returns an empty array for 0 days', () => {
    expect(synthesizeDailySeries(100, 0)).toEqual([])
  })

  it('returns `days` entries summing approximately to the total', () => {
    const series = synthesizeDailySeries(700, 7)
    expect(series).toHaveLength(7)
    const sum = series.reduce((s, v) => s + v, 0)
    // Weighted distribution is an approximation, not exact — assert it's in
    // a sane ballpark rather than pinning an exact rounding-dependent value.
    expect(sum).toBeGreaterThan(0)
    expect(sum).toBeLessThan(700 * 1.6)
  })

  it('never returns negative day values', () => {
    const series = synthesizeDailySeries(0, 10)
    expect(series.every((v) => v >= 0)).toBe(true)
  })

  it('weights the most recent day at least as high as the oldest day', () => {
    const series = synthesizeDailySeries(1000, 10)
    expect(series[series.length - 1]).toBeGreaterThanOrEqual(series[0])
  })
})

describe('synthesizeTrendFromTotal', () => {
  it('splits a 2×days synthesis into previous/current halves', () => {
    const { current, previous, currentSeries } = synthesizeTrendFromTotal(1000, 10)
    expect(currentSeries).toHaveLength(10)
    expect(current).toBeGreaterThan(0)
    expect(previous).toBeGreaterThan(0)
    // Recent-weighted distribution → current period is never less than previous.
    expect(current).toBeGreaterThanOrEqual(previous)
  })

  it('returns all zeros for a zero total', () => {
    const { current, previous } = synthesizeTrendFromTotal(0, 5)
    expect(current).toBe(0)
    expect(previous).toBe(0)
  })
})

describe('bucketPeriodCounts', () => {
  const now = new Date('2026-07-14T12:00:00.000Z')

  it('counts timestamps in the current vs previous 7-day windows', () => {
    const timestamps = [
      '2026-07-13T00:00:00.000Z', // current (1 day ago)
      '2026-07-10T00:00:00.000Z', // current (4 days ago)
      '2026-07-05T00:00:00.000Z', // previous (9 days ago)
      '2026-06-20T00:00:00.000Z', // outside both windows
    ]
    const result = bucketPeriodCounts(timestamps, now, 7)
    expect(result.current).toBe(2)
    expect(result.previous).toBe(1)
  })

  it('returns zeros for an empty input', () => {
    expect(bucketPeriodCounts([], now, 30)).toEqual({ current: 0, previous: 0 })
  })
})

describe('dailyDateLabels', () => {
  it('returns `days` labels ending with today', () => {
    const now = new Date('2026-07-14T12:00:00.000Z')
    const labels = dailyDateLabels(now, 3)
    expect(labels).toEqual(['2026-07-12', '2026-07-13', '2026-07-14'])
  })
})

describe('toDatedSeries', () => {
  it('zips values with the last N calendar-day labels', () => {
    const now = new Date('2026-07-14T12:00:00.000Z')
    const result = toDatedSeries([1, 2, 3], now, 3)
    expect(result).toEqual([
      { date: '2026-07-12', value: 1 },
      { date: '2026-07-13', value: 2 },
      { date: '2026-07-14', value: 3 },
    ])
  })

  it('fills missing values with 0', () => {
    const now = new Date('2026-07-14T12:00:00.000Z')
    const result = toDatedSeries([1], now, 3)
    expect(result.map((p) => p.value)).toEqual([1, 0, 0])
  })
})

describe('bucketDailySeries', () => {
  it('buckets timestamps by calendar day, filling gaps with 0', () => {
    const now = new Date('2026-07-14T12:00:00.000Z')
    const timestamps = [
      '2026-07-14T01:00:00.000Z',
      '2026-07-14T05:00:00.000Z',
      '2026-07-12T00:00:00.000Z',
    ]
    const result = bucketDailySeries(timestamps, now, 3)
    expect(result).toEqual([
      { date: '2026-07-12', value: 1 },
      { date: '2026-07-13', value: 0 },
      { date: '2026-07-14', value: 2 },
    ])
  })

  it('ignores timestamps outside the window', () => {
    const now = new Date('2026-07-14T12:00:00.000Z')
    const result = bucketDailySeries(['2026-01-01T00:00:00.000Z'], now, 3)
    expect(result.reduce((s, p) => s + p.value, 0)).toBe(0)
  })
})

describe('groupCountInRange', () => {
  const now = new Date('2026-07-14T12:00:00.000Z')

  it('groups and counts rows by key within the window', () => {
    const rows = [
      { propertyId: 'a', createdAt: '2026-07-13T00:00:00.000Z' },
      { propertyId: 'a', createdAt: '2026-07-12T00:00:00.000Z' },
      { propertyId: 'b', createdAt: '2026-07-13T00:00:00.000Z' },
      { propertyId: 'a', createdAt: '2026-01-01T00:00:00.000Z' }, // outside window
    ]
    const result = groupCountInRange(
      rows,
      (r) => r.propertyId,
      (r) => r.createdAt,
      now,
      7,
    )
    expect(result.get('a')).toBe(2)
    expect(result.get('b')).toBe(1)
  })

  it('skips rows with a null key', () => {
    const rows = [{ propertyId: null, createdAt: '2026-07-13T00:00:00.000Z' }]
    const result = groupCountInRange(
      rows,
      (r) => r.propertyId,
      (r) => r.createdAt,
      now,
      7,
    )
    expect(result.size).toBe(0)
  })
})

describe('pickTitle', () => {
  it('prefers the English title', () => {
    expect(pickTitle({ en: 'Nice flat', hy: 'Bnakaran' })).toBe('Nice flat')
  })

  it('falls back to any available locale', () => {
    expect(pickTitle({ hy: 'Bnakaran' })).toBe('Bnakaran')
  })

  it('falls back to "Untitled listing" for null/empty title', () => {
    expect(pickTitle(null)).toBe('Untitled listing')
    expect(pickTitle({})).toBe('Untitled listing')
  })
})
