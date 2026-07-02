import { describe, it, expect } from 'vitest'
import { isProtectedPath, stripLocale } from '../lib/auth/protectedPaths'

describe('stripLocale()', () => {
  it('strips /hy locale prefix', () => {
    expect(stripLocale('/hy/dashboard')).toBe('/dashboard')
  })

  it('strips /ru locale prefix', () => {
    expect(stripLocale('/ru/favorites')).toBe('/favorites')
  })

  it('strips /en locale prefix', () => {
    expect(stripLocale('/en/messages/123')).toBe('/messages/123')
  })

  it('returns / for bare locale path', () => {
    expect(stripLocale('/hy')).toBe('/')
  })

  it('is a no-op for paths without a locale prefix', () => {
    expect(stripLocale('/dashboard')).toBe('/dashboard')
  })
})

describe('isProtectedPath()', () => {
  describe('paths that SHOULD require authentication', () => {
    it('protects /[locale]/dashboard', () => {
      expect(isProtectedPath('/hy/dashboard')).toBe(true)
    })

    it('protects /[locale]/dashboard sub-paths', () => {
      expect(isProtectedPath('/hy/dashboard/settings')).toBe(true)
    })

    it('protects /[locale]/favorites', () => {
      expect(isProtectedPath('/hy/favorites')).toBe(true)
    })

    it('protects /[locale]/messages', () => {
      expect(isProtectedPath('/ru/messages')).toBe(true)
    })

    it('protects /[locale]/messages/[id]', () => {
      expect(isProtectedPath('/en/messages/abc-123')).toBe(true)
    })
  })

  describe('paths that should be publicly accessible', () => {
    it('allows /[locale]/auth/login', () => {
      expect(isProtectedPath('/hy/auth/login')).toBe(false)
    })

    it('allows /[locale] (home)', () => {
      expect(isProtectedPath('/hy')).toBe(false)
    })

    it('allows /[locale]/search', () => {
      expect(isProtectedPath('/hy/search')).toBe(false)
    })

    it('allows /[locale]/property/[slug]', () => {
      expect(isProtectedPath('/hy/property/nice-apartment-yerevan')).toBe(false)
    })
  })
})
