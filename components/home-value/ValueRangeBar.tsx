import { formatAmdCompact } from '@/lib/home-value/format'

interface ValueRangeBarProps {
  low: number
  estimate: number
  high: number
}

/**
 * Low—estimate—high range bar. Accessible per docs §7: `role="img"` with a
 * full-text `aria-label` (never color-only), plus the low/high numbers
 * rendered as visible text either side of the track.
 */
export function ValueRangeBar({ low, estimate, high }: ValueRangeBarProps) {
  const span = high - low
  const markerPct = span > 0 ? ((estimate - low) / span) * 100 : 50

  return (
    <div className="mt-3">
      <div
        role="img"
        aria-label={`Estimated range from ${formatAmdCompact(low)} to ${formatAmdCompact(high)}`}
        className="relative h-2 rounded-full bg-gray-200"
      >
        <div className="absolute inset-y-0 left-0 h-2 rounded-full bg-primary/30" style={{ width: '100%' }} />
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full bg-primary -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${markerPct}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="flex justify-between mt-1.5 text-sm text-gray-600">
        <span>{formatAmdCompact(low)}</span>
        <span>{formatAmdCompact(high)}</span>
      </div>
    </div>
  )
}
