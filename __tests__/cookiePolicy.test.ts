/**
 * Tests for the cookie-consent gating logic (Page 23 §5/§7): non-necessary
 * scripts must not load until the visitor has explicitly consented.
 */
import { describe, it, expect } from 'vitest'
import {
  shouldLoadAnalytics,
  shouldLoadMarketing,
  buildConsent,
  acceptAllConsent,
  necessaryOnlyConsent,
} from '../lib/cookies/policy'

describe('shouldLoadAnalytics / shouldLoadMarketing — pre-consent gating', () => {
  it('does not load anything before any choice has been made (null consent)', () => {
    expect(shouldLoadAnalytics(null)).toBe(false)
    expect(shouldLoadMarketing(null)).toBe(false)
  })

  it('does not load analytics/marketing when only necessary was chosen', () => {
    const consent = necessaryOnlyConsent(1_700_000_000_000)
    expect(shouldLoadAnalytics(consent)).toBe(false)
    expect(shouldLoadMarketing(consent)).toBe(false)
    expect(consent.necessary).toBe(true)
  })

  it('loads both after "Accept all"', () => {
    const consent = acceptAllConsent(1_700_000_000_000)
    expect(shouldLoadAnalytics(consent)).toBe(true)
    expect(shouldLoadMarketing(consent)).toBe(true)
  })

  it('respects a partial opt-in (analytics only)', () => {
    const consent = buildConsent(true, false, 1_700_000_000_000)
    expect(shouldLoadAnalytics(consent)).toBe(true)
    expect(shouldLoadMarketing(consent)).toBe(false)
  })

  it('respects a partial opt-in (marketing only)', () => {
    const consent = buildConsent(false, true, 1_700_000_000_000)
    expect(shouldLoadAnalytics(consent)).toBe(false)
    expect(shouldLoadMarketing(consent)).toBe(true)
  })
})

describe('buildConsent — record shape', () => {
  it('always sets necessary to true and stamps the timestamp', () => {
    const consent = buildConsent(false, false, 42)
    expect(consent).toEqual({ necessary: true, analytics: false, marketing: false, ts: 42 })
  })
})
