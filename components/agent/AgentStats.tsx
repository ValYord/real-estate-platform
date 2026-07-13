import type { AgentProfile } from '@/lib/agent/types'

interface AgentStatsProps {
  agent: AgentProfile
}

interface StatCard {
  value: string
  label: string
}

/**
 * KPI cards row — docs/en/pages/10-agent-profile.md §3.4.
 * Null metrics are skipped (not displayed as 0). Server Component.
 */
export default function AgentStats({ agent }: AgentStatsProps) {
  const { stats } = agent

  const cards: StatCard[] = []
  if (stats.listingsActive !== null) {
    cards.push({ value: String(stats.listingsActive), label: 'Active listings' })
  }
  if (stats.dealsClosed !== null) {
    cards.push({ value: String(stats.dealsClosed), label: 'Sold / closed' })
  }
  if (stats.avgResponseHours !== null) {
    cards.push({ value: `~${stats.avgResponseHours}h`, label: 'Average response' })
  }
  if (agent.languages.length > 0) {
    cards.push({ value: String(agent.languages.length), label: 'Languages' })
  }
  if (stats.memberSince !== null) {
    cards.push({ value: stats.memberSince, label: 'Member since' })
  }

  if (cards.length === 0) return null

  return (
    <section className="border-t border-gray-200 pt-6 mt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
