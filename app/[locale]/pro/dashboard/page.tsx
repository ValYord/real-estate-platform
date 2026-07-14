import OverviewKpis from '@/components/pro/OverviewKpis'

/**
 * `/pro/dashboard` — Overview (page spec §3.1). Thin Server Component; all
 * data fetching/state lives in the client `<OverviewKpis>` (React Query,
 * date-range-aware via `useProDashboardStore`).
 */
export default function ProDashboardOverviewPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Overview</h1>
      <OverviewKpis />
    </div>
  )
}
