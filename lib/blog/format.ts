/** Formats an ISO date string as e.g. "May 12, 2026" — used across article cards, headers and related lists. */
export function formatArticleDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
