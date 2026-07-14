import { describe, expect, it } from 'vitest'
import { buildPreApprovalLoginRedirect } from '@/lib/mortgage/rates/redirect'

describe('buildPreApprovalLoginRedirect', () => {
  it('builds a login redirect with the encoded pathname (no query string)', () => {
    const result = buildPreApprovalLoginRedirect('/mortgage/rates')
    expect(result).toBe('/auth/login?next=%2Fmortgage%2Frates')
  })

  it('includes the query string when provided', () => {
    const result = buildPreApprovalLoginRedirect('/mortgage/rates', '?country=AM&term=15')
    expect(result).toBe('/auth/login?next=%2Fmortgage%2Frates%3Fcountry%3DAM%26term%3D15')
  })

  it('normalizes a search string missing its leading "?"', () => {
    const withLeadingMark = buildPreApprovalLoginRedirect('/mortgage/rates', '?country=AM')
    const withoutLeadingMark = buildPreApprovalLoginRedirect('/mortgage/rates', 'country=AM')
    expect(withoutLeadingMark).toBe(withLeadingMark)
  })

  it('round-trips through decodeURIComponent back to the original path + query', () => {
    const result = buildPreApprovalLoginRedirect('/mortgage/rates', '?country=AM')
    const next = new URL(`http://localhost${result}`).searchParams.get('next')
    expect(next).toBe('/mortgage/rates?country=AM')
  })

  it('always points at /auth/login', () => {
    expect(buildPreApprovalLoginRedirect('/mortgage/rates')).toMatch(/^\/auth\/login\?next=/)
  })
})
