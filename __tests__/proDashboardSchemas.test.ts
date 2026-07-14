/**
 * Unit tests for Pro Dashboard query-param schemas (lib/pro-dashboard/schemas.ts).
 */

import { describe, it, expect } from 'vitest'
import {
  proDateRangeSchema,
  proAnalyticsMetricSchema,
  overviewQuerySchema,
  analyticsQuerySchema,
} from '../lib/pro-dashboard/schemas'

describe('proDateRangeSchema', () => {
  it.each(['7d', '30d', '90d'])('accepts %s', (value) => {
    expect(proDateRangeSchema.parse(value)).toBe(value)
  })

  it('defaults to 30d for undefined', () => {
    expect(proDateRangeSchema.parse(undefined)).toBe('30d')
  })

  it('rejects an unknown range', () => {
    expect(() => proDateRangeSchema.parse('60d')).toThrow()
  })
})

describe('proAnalyticsMetricSchema', () => {
  it.each(['views', 'favorites', 'contactClicks', 'leads'])('accepts %s', (value) => {
    expect(proAnalyticsMetricSchema.parse(value)).toBe(value)
  })

  it('defaults to views for undefined', () => {
    expect(proAnalyticsMetricSchema.parse(undefined)).toBe('views')
  })

  it('rejects an unknown metric', () => {
    expect(() => proAnalyticsMetricSchema.parse('impressions')).toThrow()
  })
})

describe('overviewQuerySchema', () => {
  it('parses a valid range', () => {
    expect(overviewQuerySchema.parse({ range: '7d' })).toEqual({ range: '7d' })
  })

  it('defaults range when omitted', () => {
    expect(overviewQuerySchema.parse({})).toEqual({ range: '30d' })
  })

  it('rejects an invalid range', () => {
    const result = overviewQuerySchema.safeParse({ range: 'nope' })
    expect(result.success).toBe(false)
  })
})

describe('analyticsQuerySchema', () => {
  it('parses valid range + metric', () => {
    expect(analyticsQuerySchema.parse({ range: '90d', metric: 'leads' })).toEqual({
      range: '90d',
      metric: 'leads',
    })
  })

  it('defaults both when omitted', () => {
    expect(analyticsQuerySchema.parse({})).toEqual({ range: '30d', metric: 'views' })
  })

  it('rejects an invalid metric', () => {
    const result = analyticsQuerySchema.safeParse({ range: '30d', metric: 'nope' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid range', () => {
    const result = analyticsQuerySchema.safeParse({ range: '60d', metric: 'views' })
    expect(result.success).toBe(false)
  })
})
