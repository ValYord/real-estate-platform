/**
 * Builds the guest pre-approval-gate redirect target: a hard navigation to
 * the login page with `?next=` pointing back to this exact page (path +
 * query string), so the visitor returns to their filtered rates view after
 * signing in. Mirrors `lib/favorites/useFavoriteToggle.ts`'s guest-gate
 * mechanism (a "redirect," not a modal — see handoff D7) and `LoginForm`'s
 * `?next=` contract (`components/auth/LoginForm.tsx`).
 *
 * Pure, unit-testable — no router/window access.
 *
 * @example
 * buildPreApprovalLoginRedirect('/mortgage/rates')
 *   // → "/auth/login?next=%2Fmortgage%2Frates"
 * buildPreApprovalLoginRedirect('/mortgage/rates', '?country=AM')
 *   // → "/auth/login?next=%2Fmortgage%2Frates%3Fcountry%3DAM"
 */
export function buildPreApprovalLoginRedirect(pathname: string, search = ''): string {
  const normalizedSearch = search && !search.startsWith('?') ? `?${search}` : search
  const next = `${pathname}${normalizedSearch}`
  return `/auth/login?next=${encodeURIComponent(next)}`
}
