import type { ReactNode } from 'react'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { MarketSummaryResponse } from '@/lib/market/types'

interface MarketActivityStatsProps {
  summary: MarketSummaryResponse
}

function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  )
}

const MARKET_TYPE_COPY: Record<NonNullable<MarketSummaryResponse['marketType']>, { label: string; variant: 'warning' | 'primary' | 'neutral' }> = {
  sellers: { label: "📈 Seller's market", variant: 'warning' },
  buyers: { label: "📉 Buyer's market", variant: 'primary' },
  balanced: { label: '⚖️ Balanced market', variant: 'neutral' },
}

/**
 * Market-activity stat card (product doc §3.6). Each row is individually
 * omitted when its metric is `null` — "insufficient data → hidden or '—'"
 * (an omitted row rather than a literal em dash reads cleaner in a short
 * stat list). The market-type chip pairs an emoji + text label with the
 * `Badge` color, so meaning never depends on color alone (§7).
 */
export default function MarketActivityStats({ summary }: MarketActivityStatsProps) {
  const hasAnyMetric =
    summary.daysOnMarket !== null ||
    summary.saleToList !== null ||
    summary.inventory !== null ||
    summary.marketType !== null

  if (!hasAnyMetric) return null

  const marketTypeCopy = summary.marketType ? MARKET_TYPE_COPY[summary.marketType] : null

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-text">Market activity</h2>
      </CardHeader>
      <CardBody className="space-y-3">
        {summary.daysOnMarket !== null && <StatRow label="Days on market" value={`${summary.daysOnMarket} days`} />}
        {summary.saleToList !== null && (
          <StatRow label="Sale-to-list ratio" value={`${Math.round(summary.saleToList * 100)}%`} />
        )}
        {summary.inventory !== null && <StatRow label="Inventory" value={summary.inventory.toLocaleString('en')} />}
        {marketTypeCopy && (
          <div className="pt-2">
            <Badge variant={marketTypeCopy.variant}>{marketTypeCopy.label}</Badge>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
