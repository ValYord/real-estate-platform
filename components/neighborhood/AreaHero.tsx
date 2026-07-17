import SlideIn from '@/components/motion/SlideIn'
import QuickStats from './QuickStats'
import type { MarketSummaryResponse } from '@/lib/market/types'
import { formatPrice } from '@/lib/market/format'

interface AreaHeroProps {
  areaName: string
  city: string
  summary: MarketSummaryResponse
}

function buildSubtitle(areaName: string, summary: MarketSummaryResponse): string {
  const hasActive = summary.activeCount > 0
  const hasMedian = summary.medianPrice !== null

  if (hasActive && hasMedian) {
    return `${summary.activeCount} active listings in ${areaName}, with a median price of ${formatPrice(summary.medianPrice as number, summary.currency)}.`
  }
  if (hasActive) {
    return `${summary.activeCount} active listings in ${areaName}.`
  }
  if (hasMedian) {
    return `Median price in ${areaName}: ${formatPrice(summary.medianPrice as number, summary.currency)}.`
  }
  return `Market data for ${areaName} is still being gathered.`
}

/**
 * Solid gradient hero (no Mapbox — the POI map section is explicitly out of
 * scope for this task; see docs/design/20-neighborhood-handoff.md D2).
 */
export default function AreaHero({ areaName, city, summary }: AreaHeroProps) {
  const subtitle = buildSubtitle(areaName, summary)

  return (
    <div className="relative h-[220px] md:h-[320px] rounded-xl overflow-hidden bg-gradient-to-br from-primary to-neutral-900 px-6 py-8 md:p-10 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,theme(colors.accent/15),transparent_60%)]"
        aria-hidden="true"
      />
      <div className="relative">
        <SlideIn direction="up">
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            {areaName}, {city} — real estate market
          </h1>
          <p className="text-white/80 text-base max-w-2xl mt-2">{subtitle}</p>
        </SlideIn>

        <div className="mt-6">
          <QuickStats summary={summary} />
        </div>
      </div>
    </div>
  )
}
