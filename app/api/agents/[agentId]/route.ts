import { NextRequest, NextResponse } from 'next/server'
import { getMockAgentBySlug } from '@/lib/agent/mockData'
import type { AgentBadge, AgentProfile } from '@/lib/agent/types'

type Params = { agentId: string }

/** "Top Agent" / "Fast responder" are computed heuristics for the MVP — see
 * docs/en/pages/10-agent-profile.md §3.2. The precise "top 5% in the city"
 * ranking algorithm is out of scope for this task. */
function computeBadges(rating: number, reviewsCount: number, avgResponseHours: number | null): AgentBadge[] {
  const badges: AgentBadge[] = []
  if (rating >= 4.8 && reviewsCount >= 20) badges.push('top_agent')
  if (avgResponseHours !== null && avgResponseHours < 2) badges.push('fast_responder')
  return badges
}

interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  agency_name: string | null
  agent_slug: string | null
  agent_rating: number | null
  agent_review_count: number
  tier: string
  created_at: string
}

interface AgentRow {
  user_id: string
  bio: Record<string, string> | null
  specialties: string[] | null
  languages: string[] | null
  scope: string[] | null
  verified: boolean
  status: string
  avg_response_hours: number | null
  deals_closed_count: number | null
}

function buildProfile(profile: ProfileRow, agent: AgentRow, listingsActive: number, isOwner: boolean): AgentProfile {
  const rating = profile.agent_rating ?? 0
  const reviewsCount = profile.agent_review_count ?? 0
  const avgResponseHours = agent.avg_response_hours ?? null

  return {
    id: profile.id,
    slug: profile.agent_slug ?? '',
    name: profile.full_name ?? 'Agent',
    avatar: profile.avatar_url,
    phone: profile.phone,
    agencyName: profile.agency_name,
    agencySlug: null,
    verified: agent.verified,
    status: agent.status === 'suspended' ? 'suspended' : 'active',
    tier: (profile.tier as AgentProfile['tier']) ?? 'free',
    rating,
    reviewsCount,
    bio: agent.bio ?? {},
    specialties: agent.specialties ?? [],
    languages: agent.languages ?? [],
    scope: agent.scope ?? [],
    stats: {
      listingsActive: listingsActive > 0 ? listingsActive : listingsActive === 0 ? 0 : null,
      dealsClosed: agent.deals_closed_count,
      avgResponseHours,
      memberSince: profile.created_at ? new Date(profile.created_at).getFullYear().toString() : null,
    },
    badges: computeBadges(rating, reviewsCount, avgResponseHours),
    createdAt: profile.created_at,
    isOwner,
  }
}

/**
 * GET /api/agents/[slug]
 *
 * Public agent profile lookup. Reads through the service-role client so a
 * single query can distinguish "no such agent" (404) from "suspended" (410)
 * regardless of the caller's session — see supabase/migrations/0008.
 *
 * 200 AgentProfile · 404 { error: 'not_found' } · 410 { error: 'suspended' }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { agentId: slug } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      const { data: profileRow, error: profileError } = await admin
        .from('profiles')
        .select('id, full_name, avatar_url, phone, agency_name, agent_slug, agent_rating, agent_review_count, tier, created_at')
        .eq('agent_slug', slug)
        .single()

      if (profileError || !profileRow) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }

      const { data: agentRow, error: agentError } = await admin
        .from('agents')
        .select('user_id, bio, specialties, languages, scope, verified, status, avg_response_hours, deals_closed_count')
        .eq('user_id', profileRow.id)
        .single()

      if (agentError || !agentRow) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }

      const { count: listingsActive } = await admin
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', profileRow.id)
        .eq('status', 'active')

      // Resolve current session (cookie-scoped, respects RLS) to compute isOwner.
      let currentUserId: string | null = null
      try {
        const { createServerClient } = await import('@/lib/supabase/server')
        const supabase = await createServerClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        currentUserId = user?.id ?? null
      } catch {
        currentUserId = null
      }

      const agent = buildProfile(
        profileRow as unknown as ProfileRow,
        agentRow as unknown as AgentRow,
        listingsActive ?? 0,
        currentUserId !== null && currentUserId === profileRow.id,
      )

      if (agent.status === 'suspended' && !agent.isOwner) {
        return NextResponse.json({ error: 'suspended' }, { status: 410 })
      }

      return NextResponse.json(agent)
    } catch {
      // Fall through to mock data
    }
  }

  const mock = getMockAgentBySlug(slug)
  if (!mock) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (mock.status === 'suspended') {
    return NextResponse.json({ error: 'suspended' }, { status: 410 })
  }
  return NextResponse.json(mock)
}
