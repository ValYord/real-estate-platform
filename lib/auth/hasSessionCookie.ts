/**
 * Lightweight client-side "is there a Supabase session?" check.
 *
 * The Supabase session cookie is named `sb-<project-ref>-auth-token`, but
 * since the project ref isn't known at build time, this checks for ANY
 * cookie matching that pattern. This is a UX-only check (which modal to
 * show) — it is never used as an authorization boundary; every API route
 * re-verifies the session server-side regardless of what this returns.
 *
 * Mirrors the inline check already used in `lib/favorites/useFavoriteToggle.ts`.
 */
export function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((c) => c.trim().match(/^sb-.+-auth-token=/))
}
