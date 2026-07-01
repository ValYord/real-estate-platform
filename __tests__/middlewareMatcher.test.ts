import { describe, it, expect } from 'vitest'
import { isLocaleHandledPath } from '../lib/middlewareMatcher'

describe('isLocaleHandledPath()', () => {
  describe('paths that SHOULD receive locale routing', () => {
    it('handles the root path', () => {
      expect(isLocaleHandledPath('/')).toBe(true)
    })

    it('handles locale-prefixed paths', () => {
      expect(isLocaleHandledPath('/hy')).toBe(true)
      expect(isLocaleHandledPath('/ru')).toBe(true)
      expect(isLocaleHandledPath('/en')).toBe(true)
    })

    it('handles deep paths without extensions', () => {
      expect(isLocaleHandledPath('/hy/search')).toBe(true)
      expect(isLocaleHandledPath('/ru/property/123')).toBe(true)
      expect(isLocaleHandledPath('/en/guides/buyer-tips')).toBe(true)
    })

    it('handles paths with query strings (no extension in last segment)', () => {
      expect(isLocaleHandledPath('/search?deal=sale')).toBe(true)
    })
  })

  describe('paths that should PASS THROUGH (not locale-routed)', () => {
    it('passes through /api/* routes', () => {
      expect(isLocaleHandledPath('/api/listings')).toBe(false)
      expect(isLocaleHandledPath('/api/auth/callback')).toBe(false)
    })

    it('passes through /_next/* paths', () => {
      expect(isLocaleHandledPath('/_next/static/css/main.css')).toBe(false)
      expect(isLocaleHandledPath('/_next/image?url=foo')).toBe(false)
    })

    it('passes through /_vercel/* paths', () => {
      expect(isLocaleHandledPath('/_vercel/insights/script.js')).toBe(false)
    })

    it('passes through static asset paths with file extensions', () => {
      expect(isLocaleHandledPath('/hero.jpg')).toBe(false)
      expect(isLocaleHandledPath('/favicon.ico')).toBe(false)
      expect(isLocaleHandledPath('/logo.svg')).toBe(false)
      expect(isLocaleHandledPath('/manifest.json')).toBe(false)
      expect(isLocaleHandledPath('/robots.txt')).toBe(false)
    })
  })
})
