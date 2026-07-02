/**
 * Guards the `?next=` redirect parameter against open-redirect attacks.
 *
 * Only relative internal paths are accepted:
 *   - Must start with "/"
 *   - Must NOT start with "//" (protocol-relative URLs)
 *   - Must NOT contain "http://" or "https://"
 *
 * @example
 * safeNext("/favorites")   // → "/favorites"
 * safeNext("//evil.com")   // → "/dashboard"
 * safeNext("https://x.c") // → "/dashboard"
 * safeNext(undefined)      // → "/dashboard"
 */
export function safeNext(next?: string | null): string {
  if (!next) return '/dashboard'
  if (!next.startsWith('/')) return '/dashboard'
  if (next.startsWith('//')) return '/dashboard'
  if (/https?:/i.test(next)) return '/dashboard'
  return next
}
