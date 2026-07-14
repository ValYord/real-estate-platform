import FadeIn from '@/components/motion/FadeIn'
import AnalyticsCharts from '@/components/pro/AnalyticsCharts'

/**
 * `/pro/dashboard/analytics` — Listing performance charts (page spec §3.2),
 * MVP scope: views/favorites/contact-clicks/leads over time + "Top
 * performing listings" table. Traffic-sources pie chart and CSV export
 * (Premium-only extras in the generic spec) are explicitly out of scope for
 * this task (handoff §0).
 */
export default function ProDashboardAnalyticsPage() {
  return (
    <div>
      <FadeIn>
        <h1 className="text-lg font-semibold text-text mb-4">Analytics</h1>
      </FadeIn>
      <AnalyticsCharts />
    </div>
  )
}
