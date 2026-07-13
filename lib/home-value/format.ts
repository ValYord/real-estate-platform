/** AMD-only formatting helpers for the Home Value tool (MVP: no live FX conversion — see docs §5). */

export function formatAmd(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} ֏`
}

export function formatAmdCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M ֏`
  }
  if (Math.abs(amount) >= 1_000) {
    return `${Math.round(amount / 1_000)}K ֏`
  }
  return formatAmd(amount)
}

export function formatPct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded}%`
}
