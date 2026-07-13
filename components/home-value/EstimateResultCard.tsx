import { formatAmd, formatPct } from '@/lib/home-value/format'
import type { EstimateDisplayData } from '@/lib/home-value/types'
import { ValueRangeBar } from './ValueRangeBar'
import { ConfidenceBadge } from './ConfidenceBadge'
import { ValueFactorsList } from './ValueFactorsList'
import { HomeValueDisclaimer } from './HomeValueDisclaimer'

interface EstimateResultCardProps {
  data: EstimateDisplayData
  addressLabel?: string | null
}

/**
 * The conversion core of the page (docs §3.3): the big number, the
 * low—estimate—high range, confidence, price/m² vs the district median, the
 * factor breakdown, and the disclaimer. Plain presentational component (no
 * hooks) so it renders identically from the live client flow and the SSR
 * read-only snapshot page.
 */
export function EstimateResultCard({ data, addressLabel }: EstimateResultCardProps) {
  const vsMedianPct = data.medianPricePerM2 > 0
    ? ((data.pricePerM2 - data.medianPricePerM2) / data.medianPricePerM2) * 100
    : 0

  return (
    <div className="shadow-sm border border-gray-200 rounded-xl p-6 space-y-5">
      {addressLabel && <p className="text-sm text-gray-500">{addressLabel}</p>}

      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-4xl font-bold text-gray-900">{formatAmd(data.estimate)}</span>
          <ConfidenceBadge confidence={data.confidence} />
        </div>
        <ValueRangeBar low={data.low} estimate={data.estimate} high={data.high} />
      </div>

      <div className="text-sm text-gray-600 border-t border-gray-100 pt-4">
        <span className="font-medium text-gray-900">{formatAmd(data.pricePerM2)}/m²</span>{' '}
        {data.medianPricePerM2 > 0 && (
          <span>
            — {formatPct(vsMedianPct)} vs. the{' '}
            {data.fallbackLevel === 'district' ? 'district' : data.fallbackLevel === 'city' ? 'city' : 'area'} median
          </span>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">What affected this estimate</h3>
        <ValueFactorsList factors={data.factors} />
      </div>

      <HomeValueDisclaimer className="border-t border-gray-100 pt-4" />
    </div>
  )
}
