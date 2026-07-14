'use client'

import { useQuery } from '@tanstack/react-query'
import { useProDashboardStore } from '@/store/proDashboardStore'
import { fetchProOverview, ProApiError } from '@/lib/pro-dashboard/client'
import type { OverviewResponse } from '@/lib/pro-dashboard/types'
import Skeleton from '@/components/ui/Skeleton'
import Card from '@/components/ui/Card'
import Stagger from '@/components/motion/Stagger'
import KpiCard from './KpiCard'
import UpgradeOverlay from './UpgradeOverlay'
import EmptyProStats from './EmptyProStats'

interface CardData {
  label: string
  value: string
  trend?: number
  sparkline?: number[]
  labelHint?: string
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
    {
      label: 'Conversion rate',
      value: formatPercent(data.conversionRate.value),
      labelHint: 'Contact clicks ÷ views for the selected period',
    },
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
    <Card className="p-4 h-24 flex flex-col gap-2 justify-center">
      <Skeleton className="h-6 w-12 rounded-lg" />
      <Skeleton className="h-4 w-20" />
    </Card>
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
      <Card className="p-4 text-center">
        <p className="text-sm text-muted mb-2">Couldn&apos;t load overview stats</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Try again
        </button>
      </Card>
    )
  }

  if (data.isEmpty) {
    return <EmptyProStats />
  }

  const cards = buildCards(data)

  return (
    <Stagger>
      <div className={GRID_CLASSNAME}>
        {cards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            trend={card.trend}
            sparkline={card.sparkline}
            labelHint={card.labelHint}
          />
        ))}
      </div>
    </Stagger>
  )
}
