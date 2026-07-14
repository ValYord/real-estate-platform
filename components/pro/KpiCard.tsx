import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Sparkline from './Sparkline'

/** Verbatim reuse of `ValueFactorsList.tsx`'s direction convention (handoff D4). */
const DIRECTION_STYLE = {
  up: 'text-green-600',
  down: 'text-red-500',
  neutral: 'text-gray-400',
} as const

const DIRECTION_ICON = {
  up: ArrowUp,
  down: ArrowDown,
  neutral: Minus,
} as const

const DIRECTION_WORD = {
  up: 'Up',
  down: 'Down',
  neutral: 'No change',
} as const

type Direction = keyof typeof DIRECTION_STYLE

function directionFromTrend(trend: number): Direction {
  if (trend > 0) return 'up'
  if (trend < 0) return 'down'
  return 'neutral'
}

interface KpiCardProps {
  label: string
  value: string
  /** Fraction, e.g. 0.12 = +12%. Omit entirely for KPIs with no period comparison
   *  (Active listings, Conversion rate) — a real 0 trend still renders as "No change". */
  trend?: number
  sparkline?: number[]
}

/**
 * One Overview KPI card: big number + label + trend (icon + colored text,
 * never color alone — page spec §7) + an optional glance sparkline.
 */
export default function KpiCard({ label, value, trend, sparkline }: KpiCardProps) {
  const hasTrend = trend !== undefined
  const direction = hasTrend ? directionFromTrend(trend) : null
  const Icon = direction ? DIRECTION_ICON[direction] : null
  const pct = hasTrend ? Math.round(Math.abs(trend) * 100) : null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>

      {direction && Icon ? (
        <span
          className={cn('flex items-center gap-1 text-sm', DIRECTION_STYLE[direction])}
          aria-label={
            direction === 'neutral'
              ? 'No change versus previous period'
              : `${DIRECTION_WORD[direction]} ${pct}% versus previous period`
          }
        >
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
          {direction === 'neutral' ? '—' : `${direction === 'up' ? '+' : '-'}${pct}%`}
        </span>
      ) : (
        // No trend data at all for this KPI (Active listings, Conversion rate) — a
        // decorative dash keeps the grid rows aligned; nothing to announce here.
        <span className="text-sm text-gray-400" aria-hidden="true">—</span>
      )}

      {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} />}
    </div>
  )
}
