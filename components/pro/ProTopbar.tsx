'use client'

import Tabs from '@/components/ui/Tabs'
import type { PlanTier } from '@/lib/plans/types'
import { useProDashboardStore } from '@/store/proDashboardStore'
import type { ProDateRange } from '@/lib/pro-dashboard/types'
import TierBadge from './TierBadge'

const RANGE_OPTIONS: { label: string; value: ProDateRange }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
]

interface ProTopbarProps {
  tier: PlanTier
}

/**
 * Tier badge + 7d/30d/90d range control, built on the shared `Tabs`
 * primitive (docs/design/18-pro-dashboard-handoff.md §2.1 — the same
 * component `PricingFaq.tsx` uses for its category filter: a mutually
 * exclusive filter that re-fetches content, not a distinct-panels tab bar).
 * `Tabs` gives roving-tabindex keyboard nav (←/→/Home/End) for free, a
 * strict a11y upgrade over the previous hand-rolled segmented control.
 * Reads/writes the shared `useProDashboardStore` so Overview and Analytics
 * (separate routes) stay in sync on the selected range.
 */
export default function ProTopbar({ tier }: ProTopbarProps) {
  const range = useProDashboardStore((s) => s.range)
  const setRange = useProDashboardStore((s) => s.setRange)

  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-4 lg:px-6 gap-3 flex-wrap">
      <TierBadge tier={tier} />

      <Tabs
        label="Date range"
        options={RANGE_OPTIONS}
        value={range}
        onChange={(v) => setRange(v as ProDateRange)}
      />
    </div>
  )
}
