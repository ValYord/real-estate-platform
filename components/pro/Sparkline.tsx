import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]
  className?: string
}

/**
 * Dependency-free inline-SVG sparkline, extracted from
 * `StatsModal.tsx`'s `LineChart` and stripped of the tooltip/axis-label text
 * — a KPI card sparkline is a glance-only trend shape, not a full chart
 * (handoff D6). Decorative only: the KPI number + trend text already convey
 * the same information accessibly, so this is `aria-hidden`.
 */
export default function Sparkline({ data, className }: SparklineProps) {
  if (data.length < 2) return null

  const width = 100
  const height = 32
  const max = Math.max(...data, 1)

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - (value / max) * height
    return `${x},${y}`
  })

  const areaPath = `M ${points[0]} L ${points.join(' L ')} L ${width},${height} L 0,${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('w-full h-8', className)}
      aria-hidden="true"
    >
      <path d={areaPath} fill="currentColor" className="text-primary/10" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
    </svg>
  )
}
