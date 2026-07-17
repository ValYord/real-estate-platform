'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import FadeIn from '@/components/motion/FadeIn'
import type { TrendMetric, TrendPeriod, TrendsResponse } from '@/lib/market/types'
import type { DealType } from '@/types/database'
import { formatCompactValue, formatMonthLabel, formatPrice } from '@/lib/market/format'

interface PriceTrendChartProps {
  areaSlug: string
  areaName: string
  /** Server-fetched trend data for the default toggle state (12m/sale/total) — avoids a loading flash on first paint. */
  initialData: TrendsResponse
}

async function fetchTrends(
  areaSlug: string,
  period: TrendPeriod,
  deal: DealType,
  metric: TrendMetric,
): Promise<TrendsResponse> {
  const params = new URLSearchParams({ period, deal, metric })
  const res = await fetch(`/api/market/${areaSlug}/trends?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch trend data')
  return res.json() as Promise<TrendsResponse>
}

function TrendTooltip({ active, payload, currency }: TooltipContentProps & { currency: string }) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]
  const value = typeof point.value === 'number' ? point.value : Number(point.value)
  const date = (point.payload as { date: string } | undefined)?.date
  return (
    <div className="bg-surface border border-border shadow-md rounded-md px-3 py-2">
      <p className="text-sm font-semibold text-text">{formatPrice(value, currency)}</p>
      {date && <p className="text-xs text-muted">{formatMonthLabel(date)}</p>}
    </div>
  )
}

/**
 * Recharts area chart with period/deal/metric toggles (product doc §3.3).
 * Renders the accessible fallback (§7: `role="img"` + `aria-label` summary +
 * an always-present `sr-only` data table) whenever there's a series to show,
 * and the documented "Not enough data" copy — never a misleadingly sparse
 * line — when the API reports `insufficient: true` (`pointCount < 6`).
 */
export default function PriceTrendChart({ areaSlug, areaName, initialData }: PriceTrendChartProps) {
  const [period, setPeriod] = useState<TrendPeriod>('12m')
  const [deal, setDeal] = useState<DealType>('sale')
  const [metric, setMetric] = useState<TrendMetric>('total')

  const isDefaultSelection = period === '12m' && deal === 'sale' && metric === 'total'

  const { data } = useQuery({
    queryKey: ['market-trends', areaSlug, period, deal, metric],
    queryFn: () => fetchTrends(areaSlug, period, deal, metric),
    initialData: isDefaultSelection ? initialData : undefined,
    staleTime: 60_000,
  })

  const trends = data ?? initialData
  const chartData = trends.series.map((p) => ({ date: p.date, value: p.value }))
  const captionText = `Median ${metric === 'total' ? 'total price' : 'price per m²'} · ${
    deal === 'sale' ? 'Sale' : 'Rent'
  } · ${period === '12m' ? 'last 12 months' : 'last 5 years'}`

  return (
    <FadeIn>
      <Card>
        <CardHeader className="space-y-3">
          <h2 className="text-xl font-semibold text-text">Median price trend</h2>
          <div className="flex flex-col gap-2 md:flex-row md:gap-4">
            <Tabs
              label="Time period"
              value={period}
              onChange={(v) => setPeriod(v as TrendPeriod)}
              options={[
                { value: '12m', label: '12 months' },
                { value: '5y', label: '5 years' },
              ]}
            />
            <Tabs
              label="Deal type"
              value={deal}
              onChange={(v) => setDeal(v as DealType)}
              options={[
                { value: 'sale', label: 'Sale' },
                { value: 'rent', label: 'Rent' },
              ]}
            />
            <Tabs
              label="Metric"
              value={metric}
              onChange={(v) => setMetric(v as TrendMetric)}
              options={[
                { value: 'total', label: 'Total price' },
                { value: 'per_m2', label: '$/m²' },
              ]}
            />
          </div>
        </CardHeader>
        <CardBody>
          {trends.insufficient || trends.series.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <BarChart3 className="w-10 h-10 text-muted" aria-hidden="true" />
              <p className="text-text font-medium">Not enough data for this area yet</p>
              <p className="text-sm text-muted max-w-sm">
                Check back as more listings and sales are recorded in {areaName}.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted mb-3">{captionText}</p>
              <div
                role="img"
                aria-label={`${captionText}: from ${formatMonthLabel(trends.series[0].date)} at ${formatPrice(trends.series[0].value, trends.currency)} to ${formatMonthLabel(trends.series.at(-1)!.date)} at ${formatPrice(trends.series.at(-1)!.value, trends.currency)}`}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v: string) => formatMonthLabel(v)}
                      tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => formatCompactValue(v)}
                      width={56}
                    />
                    <Tooltip content={(props) => <TrendTooltip {...props} currency={trends.currency} />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="var(--color-primary)"
                      fillOpacity={0.1}
                      dot={{ r: 4, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Text alternative of the chart data (product doc §7) — always in the DOM, never gated behind interaction. */}
              <table className="sr-only">
                <caption>{captionText}</caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.series.map((p) => (
                    <tr key={p.date}>
                      <td>{formatMonthLabel(p.date)}</td>
                      <td>{formatPrice(p.value, trends.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardBody>
      </Card>
    </FadeIn>
  )
}
