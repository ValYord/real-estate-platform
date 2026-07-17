import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import Card, { CardBody } from '@/components/ui/Card'
import Stagger from '@/components/motion/Stagger'
import type { MarketSummaryResponse } from '@/lib/market/types'
import { formatPrice } from '@/lib/market/format'

interface QuickStatsProps {
  summary: MarketSummaryResponse
}

interface StatCard {
  key: string
  value: ReactNode
  label: string
}

/**
 * Up to 4 stat cards (median price, active listings, avg $/m², YoY change).
 * Per the product doc's graceful-degradation rule (§3.2), a card whose
 * metric is `null`/zero is entirely omitted — never rendered blank or as a
 * "—" placeholder, since a missing quick-stat isn't the same "insufficient
 * data" signal as a missing chart/table (there's no partial-row layout to
 * preserve here).
 */
export default function QuickStats({ summary }: QuickStatsProps) {
  const cards: StatCard[] = []

  if (summary.medianPrice !== null) {
    cards.push({
      key: 'median',
      value: formatPrice(summary.medianPrice, summary.currency),
      label: 'Median price',
    })
  }

  if (summary.activeCount > 0) {
    cards.push({
      key: 'active',
      value: summary.activeCount.toLocaleString('en'),
      label: 'Active listings',
    })
  }

  if (summary.pricePerM2 !== null) {
    cards.push({
      key: 'per-m2',
      value: formatPrice(summary.pricePerM2, summary.pricePerM2Currency),
      label: 'Avg. price / m²',
    })
  }

  if (summary.yoyChange !== null) {
    const isUp = summary.yoyChange >= 0
    cards.push({
      key: 'yoy',
      // Text + icon + color together, never color alone (product doc §7).
      value: (
        <span className={`inline-flex items-center gap-1 ${isUp ? 'text-success' : 'text-danger'}`}>
          {isUp ? (
            <TrendingUp className="w-5 h-5" aria-hidden="true" />
          ) : (
            <TrendingDown className="w-5 h-5" aria-hidden="true" />
          )}
          {isUp ? '+' : ''}
          {summary.yoyChange}%
        </span>
      ),
      label: `${isUp ? 'Rise' : 'Decline'} vs. last year`,
    })
  }

  if (cards.length === 0) return null

  return (
    <Stagger gap={0.06} className="flex flex-wrap gap-3">
      {cards.map((card) => (
        <Card key={card.key} className="bg-surface/95 backdrop-blur border-none shadow-md min-w-[140px]">
          <CardBody className="p-4">
            <p className="text-2xl font-bold text-text">{card.value}</p>
            <p className="text-xs text-muted">{card.label}</p>
          </CardBody>
        </Card>
      ))}
    </Stagger>
  )
}
