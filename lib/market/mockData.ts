/**
 * Deterministic mock fallback for `lib/market/fetchAreaRows.ts`, mirroring
 * the same "real Supabase query when configured, seeded dataset otherwise"
 * convention used by every other route in this codebase (see
 * `lib/search/mockData.ts`, `lib/agent/mockData.ts`). Rows are generated
 * relative to a `referenceDate` (defaulting to `new Date()`) rather than
 * hardcoded calendar dates, so the trend/YoY math always lines up with
 * "now" instead of silently going stale.
 *
 * Only Arabkir and Kentron carry seed rows — deliberately, to exercise both
 * the "full data" and "sparse/zero data" branches of the page without extra
 * fixtures:
 *   - Arabkir: 10 populated sale months (≥ MIN_TREND_POINTS) + sold rows
 *     (days-on-market, recently-sold, YoY all computable) + only 2 rent
 *     months (rent trend hits the `insufficient` branch on the same area).
 *   - Kentron: exactly 6 populated sale months (right at the
 *     MIN_TREND_POINTS boundary) and zero sold rows (recently-sold section
 *     hidden).
 *   - Every other registered area: zero rows — zero active listings, no
 *     trend data, no sold records (the fully-sparse page state).
 */
import type { Currency, DealType } from '@/types/database'
import type { AreaDefinition } from './areaRegistry'
import type { MarketPropertyRow } from './types'

interface RowSpec {
  /** Whole months before the reference date the listing went live. */
  monthsAgo: number
  dayOfMonth?: number
  price: number
  currency: Currency
  dealType: DealType
  areaM2: number | null
  status: 'active' | 'sold'
  /** For sold rows: whole months before the reference date the sale closed (≤ monthsAgo). */
  soldMonthsAgo?: number
}

function dateMonthsAgo(reference: Date, monthsAgo: number, day: number): Date {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - monthsAgo, day))
}

function buildRow(id: string, reference: Date, spec: RowSpec): MarketPropertyRow {
  const listedAt = dateMonthsAgo(reference, spec.monthsAgo, spec.dayOfMonth ?? 10)
  const updatedAt =
    spec.status === 'sold'
      ? dateMonthsAgo(reference, spec.soldMonthsAgo ?? Math.max(spec.monthsAgo - 1, 0), 20)
      : listedAt

  return {
    id,
    price: spec.price,
    currency: spec.currency,
    dealType: spec.dealType,
    areaM2: spec.areaM2,
    status: spec.status,
    listedAt: listedAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  }
}

const ARABKIR_SPECS: RowSpec[] = [
  // Sale, active — 8 consecutive populated months (0..7), gently rising
  // month-over-month so the chart reads as a real trend, not a flat line.
  { monthsAgo: 0, price: 54_000_000, currency: 'AMD', dealType: 'sale', areaM2: 76, status: 'active' },
  { monthsAgo: 1, price: 53_500_000, currency: 'AMD', dealType: 'sale', areaM2: 74, status: 'active' },
  { monthsAgo: 2, price: 52_800_000, currency: 'AMD', dealType: 'sale', areaM2: 75, status: 'active' },
  { monthsAgo: 3, price: 52_000_000, currency: 'AMD', dealType: 'sale', areaM2: 73, status: 'active' },
  { monthsAgo: 4, price: 51_500_000, currency: 'AMD', dealType: 'sale', areaM2: 72, status: 'active' },
  { monthsAgo: 5, price: 50_800_000, currency: 'AMD', dealType: 'sale', areaM2: 78, status: 'active' },
  { monthsAgo: 6, price: 50_200_000, currency: 'AMD', dealType: 'sale', areaM2: 70, status: 'active' },
  { monthsAgo: 7, price: 49_800_000, currency: 'AMD', dealType: 'sale', areaM2: 71, status: 'active' },
  // Sale, sold — fills months 9 and 11, plus a "12 months ago" bucket used
  // for the YoY comparison against the current month's bucket above.
  { monthsAgo: 10, soldMonthsAgo: 9, price: 48_500_000, currency: 'AMD', dealType: 'sale', areaM2: 69, status: 'sold' },
  { monthsAgo: 12, soldMonthsAgo: 11, price: 47_500_000, currency: 'AMD', dealType: 'sale', areaM2: 80, status: 'sold' },
  { monthsAgo: 13, soldMonthsAgo: 12, price: 47_800_000, currency: 'AMD', dealType: 'sale', areaM2: 72, status: 'sold' },
  // Rent, active — only 2 populated months: deliberately sparse so
  // ?deal=rent on this same, otherwise-rich area hits the "insufficient"
  // trend fallback (exercises both branches without a second fixture area).
  { monthsAgo: 0, price: 280_000, currency: 'AMD', dealType: 'rent', areaM2: 65, status: 'active' },
  { monthsAgo: 1, price: 270_000, currency: 'AMD', dealType: 'rent', areaM2: 60, status: 'active' },
]

const KENTRON_SPECS: RowSpec[] = [
  // Exactly 6 populated sale months — right at the MIN_TREND_POINTS
  // boundary (sufficient, not sparse), and zero sold rows (recently-sold
  // section hidden, days-on-market/market-type both null).
  { monthsAgo: 0, price: 86_000_000, currency: 'AMD', dealType: 'sale', areaM2: 112, status: 'active' },
  { monthsAgo: 1, price: 85_500_000, currency: 'AMD', dealType: 'sale', areaM2: 108, status: 'active' },
  { monthsAgo: 2, price: 85_000_000, currency: 'AMD', dealType: 'sale', areaM2: 110, status: 'active' },
  { monthsAgo: 3, price: 84_200_000, currency: 'AMD', dealType: 'sale', areaM2: 105, status: 'active' },
  { monthsAgo: 4, price: 83_800_000, currency: 'AMD', dealType: 'sale', areaM2: 109, status: 'active' },
  { monthsAgo: 5, price: 83_000_000, currency: 'AMD', dealType: 'sale', areaM2: 107, status: 'active' },
]

const AREA_SPECS: Record<string, RowSpec[]> = {
  'yerevan-arabkir': ARABKIR_SPECS,
  'yerevan-kentron': KENTRON_SPECS,
}

export function generateMockRows(area: AreaDefinition, referenceDate: Date = new Date()): MarketPropertyRow[] {
  const specs = AREA_SPECS[area.slug] ?? []
  return specs.map((spec, i) => buildRow(`${area.slug}-mock-${i}`, referenceDate, spec))
}
