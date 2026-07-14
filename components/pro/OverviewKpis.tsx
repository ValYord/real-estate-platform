'use client'

import { useQuery } from '@tanstack/react-query'
import { useProDashboardStore } from '@/store/proDashboardStore'
import { fetchProOverview, ProApiError } from '@/lib/pro-dashboard/client'
import type { OverviewResponse } from '@/lib/pro-dashboard/types'
import KpiCard from './KpiCard'
import UpgradeOverlay from './UpgradeOverlay'
import EmptyProStats from './EmptyProStats'
import FadeIn from './FadeIn'

interface CardData {
  label: string
  value: string
  trend?: number
  sparkline?: number[]
}

function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function buildCards(data: OverviewResponse): CardData[] {
  return [
    {
      label: 'Total views',
      value: formatCount(data.views.value),
      trend: data.views.trend,
      sparkline: data.sparklines.views,
    },
    { label: 'Favorites', value: formatCount(data.favorites.value), trend: data.favorites.trend },
    {
      label: 'Contact clicks',
      value: formatCount(data.contactClicks.value),
      trend: data.contactClicks.trend,
    },
    {
      label: 'New leads',
      value: formatCount(data.newLeads.value),
      trend: data.newLeads.trend,
      sparkline: data.sparklines.leads,
    },
    { label: 'Active listings', value: formatCount(data.activeListings.value) },
    { label: 'Conversion rate', value: formatPercent(data.conversionRate.value) },
  ]
}

// Free-tier placeholder content — the exact example numbers from the page
// spec's own desktop wireframe (docs/en/pages/18-pro-dashboard.md §2), shown
// blurred behind `<UpgradeOverlay>` so the locked grid still reads as "a real
// dashboard", per that wireframe's intent — never real caller data.
const PLACEHOLDER_CARDS: CardData[] = [
  { label: 'Total views', value: '1,240' },
  { label: 'Favorites', value: '86' },
  { label: 'Contact clicks', value: '54' },
  { label: 'New leads', value: '18' },
  { label: 'Active listings', value: '24' },
  { label: 'Conversion rate', value: '1.4%' },
]

const GRID_CLASSNAME = 'grid grid-cols-2 lg:grid-cols-6 gap-3'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 h-24">
      <div className="bg-gray-100 animate-pulse rounded-lg h-6 w-12 mb-2" />
      <div className="bg-gray-100 animate-pulse rounded h-4 w-20" />
    </div>
  )
}

/**
 * Overview (page spec §3.1): 6-card KPI grid, React Query-driven and
 * date-range-aware via `useProDashboardStore`. The "See leads" / "Promote
 * listing" quick-links row from the generic spec is intentionally omitted —
 * both would point at not-yet-built routes (handoff §3.1, "omit — cleanest,
 * zero dead links").
 */
export default function OverviewKpis() {
  const range = useProDashboardStore((s) => s.range)

  const { data, isLoading, isError, error, refetch } = useQuery<OverviewResponse>({
    queryKey: ['pro-overview', range],
    queryFn: () => fetchProOverview(range),
    retry: false,
  })

  const locked = error instanceof ProApiError && error.status === 403

  if (isLoading) {
    return (
      <div className={GRID_CLASSNAME} aria-label="Loading Overview stats">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (locked) {
    return (
      <div className={GRID_CLASSNAME}>
        {PLACEHOLDER_CARDS.map((card) => (
          <UpgradeOverlay key={card.label} locked>
            <KpiCard label={card.label} value={card.value} />
          </UpgradeOverlay>
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-gray-200 p-4 text-center">
        <p className="text-sm text-gray-500 mb-2">Couldn&apos;t load overview stats</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Try again
        </button>
      </div>
    )
  }

  if (data.isEmpty) {
    return <EmptyProStats />
  }

  const cards = buildCards(data)

  return (
    <div className={GRID_CLASSNAME}>
      {cards.map((card, i) => (
        <FadeIn key={card.label} delayMs={Math.min(i, 5) * 40}>
          <KpiCard label={card.label} value={card.value} trend={card.trend} sparkline={card.sparkline} />
        </FadeIn>
      ))}
    </div>
  )
}
