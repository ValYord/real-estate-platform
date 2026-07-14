import type { ProDateRange } from './types'

/** '7d' | '30d' | '90d' → number of days, matching `StatsModal.tsx`'s range set. */
export function rangeToDays(range: ProDateRange): number {
  return range === '7d' ? 7 : range === '30d' ? 30 : 90
}

/**
 * Period-over-period trend as a fraction (e.g. 0.12 = +12%). When the
 * previous period was zero, any current activity counts as a full "up" trend
 * (1 = +100%) rather than dividing by zero; zero-vs-zero is a flat 0 trend.
 */
export function computeTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 1 : 0
  return (current - previous) / previous
}

/**
 * Phase-1 approximation for a metric that is only tracked as a lifetime
 * running total (`properties.views_count`) with no per-event timestamp —
 * mirrors the distribution approach already shipped in
 * `/api/listings/[id]/stats` (see that route's "Phase 1" comment). Spreads
 * `total` across `days` days, weighting recent days slightly higher, so the
 * dashboard has a plausible day-by-day shape to chart. This is an
 * approximation, not a substitute for real per-view event tracking — revisit
 * once view events are logged with timestamps.
 */
export function synthesizeDailySeries(total: number, days: number): number[] {
  if (days <= 0) return []
  const avgPerDay = total / days
  const series: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    const weight = 0.5 + (1 - i / days) * 1.0
    series.push(Math.max(0, Math.round(avgPerDay * weight)))
  }
  return series
}

/**
 * Synthesizes a 2×days series from `synthesizeDailySeries` and splits it into
 * a "previous period" / "current period" pair, so a lifetime-total-only
 * metric (views) can still produce a period-over-period trend and a
 * current-period daily series. See `synthesizeDailySeries` for the caveat.
 */
export function synthesizeTrendFromTotal(
  total: number,
  days: number,
): { current: number; previous: number; currentSeries: number[] } {
  const fullSeries = synthesizeDailySeries(total, days * 2)
  const previousSeries = fullSeries.slice(0, days)
  const currentSeries = fullSeries.slice(days)
  const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0)
  return { current: sum(currentSeries), previous: sum(previousSeries), currentSeries }
}

/** Returns the epoch-ms start of "days ago" relative to `now`. */
function daysAgoMs(now: Date, days: number): number {
  return now.getTime() - days * 24 * 60 * 60 * 1000
}

/**
 * Buckets ISO timestamps into { current, previous } period counts, where
 * "current" is [now - days, now] and "previous" is the equal-length window
 * immediately before that.
 */
export function bucketPeriodCounts(
  timestamps: string[],
  now: Date,
  days: number,
): { current: number; previous: number } {
  const currentStart = daysAgoMs(now, days)
  const previousStart = daysAgoMs(now, days * 2)
  let current = 0
  let previous = 0
  for (const ts of timestamps) {
    const t = new Date(ts).getTime()
    if (t >= currentStart && t <= now.getTime()) current++
    else if (t >= previousStart && t < currentStart) previous++
  }
  return { current, previous }
}

/** Calendar-day date labels (`YYYY-MM-DD`) for the last `days` days, oldest → newest. */
export function dailyDateLabels(now: Date, days: number): string[] {
  const labels: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    labels.push(d.toISOString().slice(0, 10))
  }
  return labels
}

/**
 * Zips a numeric series (e.g. from `synthesizeDailySeries`) with the last
 * `days` calendar-day labels, so a lifetime-total-only metric can be charted
 * alongside the real, timestamp-derived series from `bucketDailySeries`.
 */
export function toDatedSeries(
  values: number[],
  now: Date,
  days: number,
): { date: string; value: number }[] {
  const labels = dailyDateLabels(now, days)
  return labels.map((date, i) => ({ date, value: values[i] ?? 0 }))
}

/**
 * Buckets ISO timestamps into a daily count series covering the last `days`
 * days (oldest → newest), one entry per calendar day, missing days filled
 * with 0.
 */
export function bucketDailySeries(
  timestamps: string[],
  now: Date,
  days: number,
): { date: string; value: number }[] {
  const series: { date: string; value: number }[] = []
  const indexByDate = new Map<string, number>()

  for (const date of dailyDateLabels(now, days)) {
    indexByDate.set(date, series.length)
    series.push({ date, value: 0 })
  }

  const startMs = daysAgoMs(now, days)
  for (const ts of timestamps) {
    const t = new Date(ts)
    if (t.getTime() < startMs || t.getTime() > now.getTime()) continue
    const key = t.toISOString().slice(0, 10)
    const idx = indexByDate.get(key)
    if (idx !== undefined) series[idx].value += 1
  }

  return series
}

/**
 * Groups rows by a key (e.g. `property_id`) and counts how many fall within
 * the current period ([now - days, now]), ignoring rows with a null key.
 * Used to compute per-listing counts for the "Top performing listings" table.
 */
export function groupCountInRange<T>(
  rows: T[],
  getKey: (row: T) => string | null,
  getTimestamp: (row: T) => string,
  now: Date,
  days: number,
): Map<string, number> {
  const startMs = daysAgoMs(now, days)
  const nowMs = now.getTime()
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = getKey(row)
    if (!key) continue
    const t = new Date(getTimestamp(row)).getTime()
    if (t < startMs || t > nowMs) continue
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

/** Picks a display title out of the `{ hy, ru, en }` JSONB title column. */
export function pickTitle(title: Record<string, string> | null | undefined): string {
  if (!title) return 'Untitled listing'
  return title.en ?? title.hy ?? title.ru ?? Object.values(title)[0] ?? 'Untitled listing'
}
