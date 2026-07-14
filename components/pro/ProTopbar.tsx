'use client'

import { cn } from '@/lib/utils'
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
 * Tier badge + 7d/30d/90d segmented range control (handoff D3 — the
 * `StatsModal.tsx` segmented-control pattern, not the generic spec's bordered
 * `▾` dropdown). Reads/writes the shared `useProDashboardStore` so Overview
 * and Analytics (separate routes) stay in sync on the selected range.
 */
export default function ProTopbar({ tier }: ProTopbarProps) {
  const range = useProDashboardStore((s) => s.range)
  const setRange = useProDashboardStore((s) => s.setRange)

  return (
    <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 gap-3 flex-wrap">
      <TierBadge tier={tier} />

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={range === opt.value}
            onClick={() => setRange(opt.value)}
            className={cn(
              'px-3 h-7 text-sm rounded-md transition-colors font-medium',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              range === opt.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
