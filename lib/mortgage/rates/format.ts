/** "01 Jun 2026" style date, or an em dash when there's no data yet (empty result set). */
export function formatRateDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
