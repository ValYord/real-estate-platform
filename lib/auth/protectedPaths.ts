/**
 * Paths that require an authenticated session (without locale prefix).
 * The middleware strips the locale and checks against this list.
 */
// NOTE: /favorites is intentionally excluded — the page shows a login-wall
// card for guests instead of redirecting. Auth is handled inside the page.
const PROTECTED_PATHS = [
  '/dashboard',
  '/messages',
  '/sell',
  '/listing',
  '/settings',
  '/notifications',
  // /landlord (the hub) is a public marketing landing page — only its
  // login-gated sub-tools are protected (docs/en/pages/19-landlord.md §0).
  // /apply/[token] (the public tenant application form) is intentionally
  // NOT listed here — it must stay reachable by unauthenticated applicants.
  '/landlord/rentals',
  '/landlord/screening',
  '/landlord/lease',
] as const

/**
 * Returns the pathname without the leading locale segment.
 * e.g. "/hy/dashboard/settings" → "/dashboard/settings"
 */
export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(hy|ru|en)/, '') || '/'
}

/**
 * Returns true if the given full pathname (with locale) is a protected route
 * that requires an authenticated user.
 */
export function isProtectedPath(pathname: string): boolean {
  const p = stripLocale(pathname)
  return PROTECTED_PATHS.some(
    (pp) => p === pp || p.startsWith(pp + '/')
  )
}
