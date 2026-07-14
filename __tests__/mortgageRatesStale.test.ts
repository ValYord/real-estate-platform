import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { isStale } from '@/lib/mortgage/rates/getRates'
import { STALE_DAYS } from '@/lib/mortgage/rates/constants'

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = 1_800_000_000_000 // fixed reference instant

function daysAgoIso(days: number): string {
  return new Date(NOW - days * DAY_MS).toISOString()
}

describe('isStale (> STALE_DAYS boundary, §5.3)', () => {
  it('STALE_DAYS is 30, per the deep spec', () => {
    expect(STALE_DAYS).toBe(30)
  })

  it('29 days old → not stale', () => {
    expect(isStale(daysAgoIso(29), NOW)).toBe(false)
  })

  it('exactly 30 days old → not stale (documented tie-break: "> 30 days")', () => {
    expect(isStale(daysAgoIso(30), NOW)).toBe(false)
  })

  it('31 days old → stale', () => {
    expect(isStale(daysAgoIso(31), NOW)).toBe(true)
  })

  it('just-updated (0 days old) → not stale', () => {
    expect(isStale(daysAgoIso(0), NOW)).toBe(false)
  })
})
