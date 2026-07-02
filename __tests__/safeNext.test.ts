import { describe, it, expect } from 'vitest'
import { safeNext } from '../lib/auth/safeNext'

describe('safeNext()', () => {
  describe('safe relative paths — returned as-is', () => {
    it('returns the path for simple relative URL', () => {
      expect(safeNext('/favorites')).toBe('/favorites')
    })

    it('returns the path for nested relative URL', () => {
      expect(safeNext('/hy/property/123')).toBe('/hy/property/123')
    })

    it('returns /dashboard for undefined', () => {
      expect(safeNext(undefined)).toBe('/dashboard')
    })

    it('returns /dashboard for null', () => {
      expect(safeNext(null)).toBe('/dashboard')
    })

    it('returns /dashboard for empty string', () => {
      expect(safeNext('')).toBe('/dashboard')
    })
  })

  describe('open-redirect attacks — blocked with fallback to /dashboard', () => {
    it('blocks protocol-relative URLs (//evil.com)', () => {
      expect(safeNext('//evil.com')).toBe('/dashboard')
    })

    it('blocks http:// URLs', () => {
      expect(safeNext('http://evil.com')).toBe('/dashboard')
    })

    it('blocks https:// URLs', () => {
      expect(safeNext('https://evil.com/steal?token=abc')).toBe('/dashboard')
    })

    it('blocks paths not starting with /', () => {
      expect(safeNext('evil.com')).toBe('/dashboard')
    })

    it('blocks embedded https: in path', () => {
      expect(safeNext('/redirect?url=https://evil.com')).toBe('/dashboard')
    })

    it('blocks case-insensitive HTTP scheme', () => {
      expect(safeNext('HTTP://evil.com')).toBe('/dashboard')
    })
  })
})
