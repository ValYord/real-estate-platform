import type { LandlordQuickStats } from '@/lib/landlord/types'

/** Formats a monthly-income figure with its currency, or omits it when units span multiple currencies. */
function formatIncome(stats: LandlordQuickStats): string {
  if (stats.monthlyIncomeCurrency === null) return '—'
  return `${stats.monthlyIncome.toLocaleString()} ${stats.monthlyIncomeCurrency}`
}

/**
 * Quick stats row shown on the `/landlord` hub when the user already has
 * units (§2 "3 active · 1,200,000 ֏/mo · 1 overdue", §3.1).
 */
export default function QuickStats({ stats }: { stats: LandlordQuickStats }) {
  const items = [
    { label: 'Active rentals', value: stats.activeCount.toLocaleString() },
    { label: 'Monthly income', value: formatIncome(stats) },
    { label: 'Overdue payments', value: stats.overdueCount.toLocaleString() },
  ]

  return (
    <div className="flex flex-wrap gap-6 rounded-lg border border-border bg-surface p-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="text-2xl font-bold text-text">{item.value}</div>
          <div className="text-xs text-muted">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
