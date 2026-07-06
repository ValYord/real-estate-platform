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
