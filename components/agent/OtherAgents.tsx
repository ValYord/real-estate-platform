import Image from 'next/image'
import { CheckCircle, Star, User } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { MOCK_OTHER_AGENTS } from '@/lib/agent/mockData'
import type { OtherAgentCard } from '@/lib/agent/types'

interface OtherAgentsProps {
  city: string | null
  excludeAgentId: string
}

interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  agency_name: string | null
  agent_slug: string | null
  agent_rating: number | null
  agent_review_count: number
}

interface AgentRow {
  user_id: string
  verified: boolean
  scope: string[] | null
}

/**
 * "Other agents" carousel — same city, limit 8. The ranking algorithm beyond
 * this simple city match is out of scope for this task.
 * docs/en/pages/10-agent-profile.md §3.9. Server Component.
 */
export default async function OtherAgents({ city, excludeAgentId }: OtherAgentsProps) {
  const agents = await fetchOtherAgents(city, excludeAgentId)
  if (agents.length === 0) return null

  return (
    <section className="border-t border-gray-200 pt-6 mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Other agents</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {agents.map((a) => (
          <Link
            key={a.id}
            href={`/agent/${a.slug}`}
            className="flex-shrink-0 w-48 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
              {a.avatar ? (
                <Image src={a.avatar} alt={a.name} width={56} height={56} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-gray-400" aria-hidden="true" />
              )}
            </div>
            <p className="font-medium text-gray-900 text-sm truncate flex items-center gap-1">
              {a.name}
              {a.verified && <CheckCircle className="w-3 h-3 text-blue-600 flex-shrink-0" aria-hidden="true" />}
            </p>
            {a.agencyName && <p className="text-xs text-gray-500 truncate">{a.agencyName}</p>}
            <span className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" aria-hidden="true" />
              {a.rating.toFixed(1)} <span className="text-gray-400">({a.reviewsCount})</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

async function fetchOtherAgents(city: string | null, excludeAgentId: string): Promise<OtherAgentCard[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (city && supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      const { data: agentRows, error: agentError } = await admin
        .from('agents')
        .select('user_id, verified, scope')
        .contains('scope', [city])
        .eq('status', 'active')
        .neq('user_id', excludeAgentId)
        .limit(8)

      if (agentError || !agentRows || agentRows.length === 0) return []

      const rows = agentRows as unknown as AgentRow[]
      const ids = rows.map((r) => r.user_id)

      const { data: profileRows, error: profileError } = await admin
        .from('profiles')
        .select('id, full_name, avatar_url, agency_name, agent_slug, agent_rating, agent_review_count')
        .in('id', ids)

      if (profileError || !profileRows) return []

      const profiles = profileRows as unknown as ProfileRow[]
      const byId = new Map(rows.map((r) => [r.user_id, r]))

      return profiles
        .filter((p) => p.agent_slug)
        .map((p) => ({
          id: p.id,
          slug: p.agent_slug as string,
          name: p.full_name ?? 'Agent',
          avatar: p.avatar_url,
          agencyName: p.agency_name,
          rating: p.agent_rating ?? 0,
          reviewsCount: p.agent_review_count,
          verified: byId.get(p.id)?.verified ?? false,
        }))
    } catch {
      return []
    }
  }

  return MOCK_OTHER_AGENTS.filter((a) => a.id !== excludeAgentId)
}
