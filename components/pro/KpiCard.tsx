import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Tooltip from '@/components/ui/Tooltip'
import Sparkline from './Sparkline'

/** Trend direction → token color (never color alone — page spec §7, icon + text carry the meaning). */
const DIRECTION_STYLE = {
  up: 'text-success',
  down: 'text-danger',
  neutral: 'text-muted',
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
  /** Optional formula/glossary hint shown via `Tooltip` on the label (e.g. Conversion rate). */
  labelHint?: string
}

/**
 * One Overview KPI card: big number + label + trend (icon + colored text,
 * never color alone — page spec §7) + an optional glance sparkline. Built on
 * the shared `Card` primitive (`variant="default"` — no per-KPI drill-down
 * route in this task's scope, so no hover affordance).
 */
export default function KpiCard({ label, value, trend, sparkline, labelHint }: KpiCardProps) {
  const hasTrend = trend !== undefined
  const direction = hasTrend ? directionFromTrend(trend) : null
  const Icon = direction ? DIRECTION_ICON[direction] : null
  const pct = hasTrend ? Math.round(Math.abs(trend) * 100) : null

  return (
    <Card className="p-4 flex flex-col gap-1">
      {labelHint ? (
        <Tooltip content={labelHint}>
          <span className="text-sm text-muted underline decoration-dotted underline-offset-2 cursor-help w-fit">
            {label}
          </span>
        </Tooltip>
      ) : (
        <span className="text-sm text-muted">{label}</span>
      )}
      <span className="text-2xl font-bold text-text leading-none">{value}</span>

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
        <span className="text-sm text-muted" aria-hidden="true">—</span>
      )}

      {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} />}
    </Card>
  )
}
