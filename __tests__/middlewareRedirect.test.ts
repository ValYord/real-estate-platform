import { describe, it, expect } from 'vitest'
import { isProtectedPath, stripLocale } from '../lib/auth/protectedPaths'

/**
 * Determines which auth page to redirect to for a given path.
 * /sell/new → /auth/register; all others → /auth/login.
 */
function resolveAuthPage(pathname: string): 'register' | 'login' {
  const p = stripLocale(pathname)
  return p === '/sell/new' || p.startsWith('/sell/new/') ? 'register' : 'login'
}

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

    it('protects /[locale]/messages', () => {
      expect(isProtectedPath('/ru/messages')).toBe(true)
    })

    it('protects /[locale]/messages/[id]', () => {
      expect(isProtectedPath('/en/messages/abc-123')).toBe(true)
    })

    it('protects /[locale]/settings (Page 21)', () => {
      expect(isProtectedPath('/hy/settings')).toBe(true)
    })

    it('protects /[locale]/settings/profile deep-link tab', () => {
      expect(isProtectedPath('/ru/settings/profile')).toBe(true)
    })

    it('protects /[locale]/settings/account, /preferences, /notifications, /privacy tabs', () => {
      expect(isProtectedPath('/en/settings/account')).toBe(true)
      expect(isProtectedPath('/en/settings/preferences')).toBe(true)
      expect(isProtectedPath('/en/settings/notifications')).toBe(true)
      expect(isProtectedPath('/en/settings/privacy')).toBe(true)
    })
  })

  describe('listing wizard routes require authentication', () => {
    it('protects /[locale]/sell/new', () => {
      expect(isProtectedPath('/hy/sell/new')).toBe(true)
    })

    it('protects /[locale]/sell (parent path)', () => {
      expect(isProtectedPath('/ru/sell')).toBe(true)
    })

    it('protects /[locale]/listing/[id]/edit', () => {
      expect(isProtectedPath('/en/listing/abc-123/edit')).toBe(true)
    })

    it('protects /[locale]/listing sub-paths', () => {
      expect(isProtectedPath('/hy/listing/some-id/edit')).toBe(true)
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

    // /favorites is intentionally public at the middleware level — guests see
    // a login-wall card rendered by the page itself (not a redirect).
    it('allows /[locale]/favorites (login wall rendered in-page, not redirected)', () => {
      expect(isProtectedPath('/hy/favorites')).toBe(false)
    })

    // /admin (Page 24) is intentionally NOT in PROTECTED_PATHS: the
    // acceptance criteria require a 403 "Access denied" page for guests too
    // (not a redirect to /auth/login), so the guard lives entirely in
    // app/[locale]/admin/layout.tsx's requireAdmin() check, not middleware.
    it('does not redirect /[locale]/admin — the layout renders 403 in place instead', () => {
      expect(isProtectedPath('/hy/admin')).toBe(false)
      expect(isProtectedPath('/en/admin/moderation')).toBe(false)
    })
  })
})

// ── Auth redirect page selection ──────────────────────────────────────────────

describe('auth redirect page for /sell/new', () => {
  it('redirects /sell/new to /auth/register', () => {
    expect(resolveAuthPage('/hy/sell/new')).toBe('register')
  })

  it('redirects /sell/new sub-paths to /auth/register', () => {
    expect(resolveAuthPage('/en/sell/new/')).toBe('register')
  })

  it('redirects dashboard to /auth/login (not register)', () => {
    expect(resolveAuthPage('/hy/dashboard')).toBe('login')
  })

  it('redirects /listing/[id]/edit to /auth/login', () => {
    // Non-sell paths redirect to login, not register
    expect(resolveAuthPage('/hy/listing/abc-123/edit')).toBe('login')
  })

  it('redirects /settings (guest) to /auth/login, not register', () => {
    expect(resolveAuthPage('/hy/settings')).toBe('login')
  })
})
