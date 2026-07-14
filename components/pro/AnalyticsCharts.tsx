'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import type { ReactElement } from 'react'
import { useProDashboardStore } from '@/store/proDashboardStore'
import { fetchProAnalytics, ProApiError } from '@/lib/pro-dashboard/client'
import type {
  AnalyticsResponse,
  AnalyticsSeriesPoint,
  ProAnalyticsMetric,
  ProDateRange,
} from '@/lib/pro-dashboard/types'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Stagger from '@/components/motion/Stagger'
import UpgradeOverlay from './UpgradeOverlay'
import EmptyProStats from './EmptyProStats'
import TopListingsTable from './TopListingsTable'

// Free-tier placeholder series shown blurred behind <UpgradeOverlay> — a
// plausible, gently rising shape, never real caller data (mirrors
// OverviewKpis's PLACEHOLDER_CARDS, handoff D7/§6).
const PLACEHOLDER_SERIES: AnalyticsSeriesPoint[] = [4, 6, 5, 8, 7, 10, 9].map((value, i) => ({
  date: `placeholder-${i}`,
  value,
}))

interface ChartConfig {
  metric: ProAnalyticsMetric
  title: string
  ariaLabel: string
}

const CHART_CONFIGS: ChartConfig[] = [
  { metric: 'views', title: 'Views over time', ariaLabel: 'Views over time chart' },
  { metric: 'favorites', title: 'Favorites over time', ariaLabel: 'Favorites over time chart' },
  { metric: 'contactClicks', title: 'Contact clicks', ariaLabel: 'Contact clicks chart' },
  { metric: 'leads', title: 'Leads over time', ariaLabel: 'Leads over time chart' },
]

function useAnalyticsQuery(
  range: ProDateRange,
  metric: ProAnalyticsMetric,
): UseQueryResult<AnalyticsResponse> {
  return useQuery<AnalyticsResponse>({
    queryKey: ['pro-analytics', range, metric],
    queryFn: () => fetchProAnalytics(range, metric),
    retry: false,
  })
}

function SkeletonPanel() {
  return <Skeleton className="h-72 w-full rounded-lg" />
}

/** sr-only data table fallback + `role="img"` `aria-label` — Recharts renders
 * an SVG with no inherent text alternative (page spec §7). */
function ChartPanel({
  title,
  ariaLabel,
  data,
  chart,
}: {
  title: string
  ariaLabel: string
  data: AnalyticsSeriesPoint[]
  chart: ReactElement
}) {
  return (
    <Card className="p-4 h-72">
      <p className="text-sm font-medium text-text mb-2">{title}</p>
      <div role="img" aria-label={ariaLabel} className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
        <table className="sr-only">
          <caption>{title} — daily data</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.date}>
                <td>{point.date}</td>
                <td>{point.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ChartRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="p-4 h-72 flex flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm text-muted">Couldn&apos;t load this chart</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        Try again
      </button>
    </Card>
  )
}

function renderChart(metric: ProAnalyticsMetric, data: AnalyticsSeriesPoint[]) {
  const commonAxes = (
    <>
      {/* `stroke` is an SVG prop, not a className, so it can't take a Tailwind
       * utility directly — read the `--color-border` token's CSS variable
       * instead of a hard-coded hex (docs/design/18-pro-dashboard-handoff.md §2.3). */}
      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
      <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
      <Tooltip />
    </>
  )

  if (metric === 'contactClicks') {
    return (
      <BarChart data={data}>
        {commonAxes}
        <Bar dataKey="value" className="fill-primary" radius={[4, 4, 0, 0]} />
      </BarChart>
    )
  }

  if (metric === 'favorites') {
    return (
      <AreaChart data={data}>
        {commonAxes}
        <Area
          type="monotone"
          dataKey="value"
          className="stroke-primary fill-primary/10"
          strokeWidth={2}
        />
      </AreaChart>
    )
  }

  return (
    <LineChart data={data}>
      {commonAxes}
      <Line type="monotone" dataKey="value" className="stroke-primary" strokeWidth={2} dot={false} />
    </LineChart>
  )
}

/**
 * Analytics (page spec §3.2), MVP scope: 4 Recharts time-series panels
 * (views/favorites/contact-clicks/leads) + the "Top performing listings"
 * table. Traffic-sources pie chart, property selector, funnel widget and
 * CSV export (Premium-only extras / later-task scope) are intentionally not
 * built here (handoff §0/§11).
 */
export default function AnalyticsCharts() {
  const range = useProDashboardStore((s) => s.range)

  const viewsQuery = useAnalyticsQuery(range, 'views')
  const favoritesQuery = useAnalyticsQuery(range, 'favorites')
  const contactClicksQuery = useAnalyticsQuery(range, 'contactClicks')
  const leadsQuery = useAnalyticsQuery(range, 'leads')

  const queries: Record<ProAnalyticsMetric, UseQueryResult<AnalyticsResponse>> = {
    views: viewsQuery,
    favorites: favoritesQuery,
    contactClicks: contactClicksQuery,
    leads: leadsQuery,
  }

  const anyLoading = Object.values(queries).some((q) => q.isLoading)
  const locked = Object.values(queries).some(
    (q) => q.error instanceof ProApiError && q.error.status === 403,
  )

  if (anyLoading) {
    return (
      <div className="space-y-4">
        {CHART_CONFIGS.map((c) => (
          <SkeletonPanel key={c.metric} />
        ))}
        <SkeletonPanel />
      </div>
    )
  }

  if (locked) {
    return (
      <div className="space-y-4">
        {CHART_CONFIGS.map((config) => (
          <UpgradeOverlay key={config.metric} locked>
            <ChartPanel
              title={config.title}
              ariaLabel={config.ariaLabel}
              data={PLACEHOLDER_SERIES}
              chart={renderChart(config.metric, PLACEHOLDER_SERIES)}
            />
          </UpgradeOverlay>
        ))}
        <UpgradeOverlay locked message="Upgrade to Pro to see which of your listings perform best.">
          <TopListingsTable items={[]} />
        </UpgradeOverlay>
      </div>
    )
  }

  // `views` is the default/primary metric — its `topListings`/`isEmpty` are
  // identical regardless of which metric query supplied them (every
  // /api/pro/analytics response carries the same funnel/topListings), so we
  // don't need a 5th request just for the table.
  const primary = viewsQuery.data
  const isEmpty = primary?.isEmpty ?? false

  if (isEmpty) {
    return <EmptyProStats />
  }

  return (
    <Stagger>
      <div className="space-y-4">
        {CHART_CONFIGS.map((config) => {
          const query = queries[config.metric]

          if (query.isError || !query.data) {
            return <ChartRetry key={config.metric} onRetry={() => void query.refetch()} />
          }

          return (
            <ChartPanel
              key={config.metric}
              title={config.title}
              ariaLabel={config.ariaLabel}
              data={query.data.series}
              chart={renderChart(config.metric, query.data.series)}
            />
          )
        })}

        <TopListingsTable items={primary?.topListings ?? []} />
      </div>
    </Stagger>
  )
}
