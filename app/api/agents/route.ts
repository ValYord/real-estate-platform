import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { parseAgentsSearchParams } from '@/lib/agent/schemas'
import type { AgentsQueryInput } from '@/lib/agent/schemas'
import { getMockAgentsResponse } from '@/lib/agent/mockData'
import type { AgentCardData, AgentsListResponse, AgentTier } from '@/lib/agent/types'
import { AGENTS_PAGE_SIZE } from '@/lib/agent/types'

interface AgentFilterRow {
  user_id: string
  specialties: string[] | null
  languages: string[] | null
  scope: string[] | null
  verified: boolean
  avg_response_hours: number | null
}

interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  agency_name: string | null
  agent_slug: string | null
  agent_rating: number | null
  agent_review_count: number
  tier: string
  created_at: string
}

/**
 * GET /api/agents?city=&specialty=&lang=&minRating=&sort=&page=
 *
 * Public agent directory listing — Page 11 "Find an Agent" (MVP scope, see
 * docs/en/pages/11-find-agent.md §5). Reads through the service-role client
 * because `profiles` has no public SELECT policy (see
 * supabase/migrations/0002_rls_policies.sql) and enforces `agents.status =
 * 'active'` plus a published `agent_slug` at the query level, so
 * suspended/unpublished agents never reach the response regardless of the
 * caller's session — this is not just a UI-side filter.
 *
 * 200 AgentsListResponse · 400 { error: 'invalid_params', message }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  let query: AgentsQueryInput
  try {
    query = parseAgentsSearchParams(request.nextUrl.searchParams)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'invalid_params', message: err.issues[0]?.message ?? 'Invalid query parameters' },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const response = await fetchFromSupabase(query)
      return NextResponse.json(response)
    } catch {
      // Fall through to mock data
    }
  }

  return NextResponse.json(getMockAgentsResponse(query))
}

async function fetchFromSupabase(query: AgentsQueryInput): Promise<AgentsListResponse> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  /** Active-listing count per owner, restricted to the given agent ids. */
  async function fetchListingsCounts(ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map()
    const { data } = await admin
      .from('properties')
      .select('owner_id')
      .in('owner_id', ids)
      .eq('status', 'active')
    const counts = new Map<string, number>()
    for (const row of (data ?? []) as { owner_id: string }[]) {
      counts.set(row.owner_id, (counts.get(row.owner_id) ?? 0) + 1)
    }
    return counts
  }

  // Step 1 — filter the `agents` extension table. Public read of published,
  // non-suspended agents only (defense-in-depth on top of the RLS policy,
  // which is also `USING (true)` — the status check has to happen in app
  // code because the service-role client bypasses RLS entirely).
  let agentsQuery = admin
    .from('agents')
    .select('user_id, specialties, languages, scope, verified, avg_response_hours')
    .eq('status', 'active')

  if (query.specialty) agentsQuery = agentsQuery.contains('specialties', [query.specialty])
  if (query.lang) agentsQuery = agentsQuery.contains('languages', [query.lang])
  if (query.city) agentsQuery = agentsQuery.contains('scope', [query.city])

  const { data: agentData, error: agentsError } = await agentsQuery
  if (agentsError) throw agentsError

  const agentRows = (agentData ?? []) as unknown as AgentFilterRow[]
  if (agentRows.length === 0) {
    return { items: [], total: 0, page: query.page, pageSize: AGENTS_PAGE_SIZE }
  }
  const agentById = new Map(agentRows.map((r) => [r.user_id, r]))
  const candidateIds = agentRows.map((r) => r.user_id)

  // Step 2 — filter/sort/paginate on `profiles` (rating, published slug).
  // A null agent_slug means the agent hasn't published a public profile yet.
  let profilesQuery = admin
    .from('profiles')
    .select(
      'id, full_name, avatar_url, agency_name, agent_slug, agent_rating, agent_review_count, tier, created_at',
      { count: 'exact' },
    )
    .in('id', candidateIds)
    .not('agent_slug', 'is', null)

  if (query.minRating !== undefined) profilesQuery = profilesQuery.gte('agent_rating', query.minRating)

  let profileRows: ProfileRow[]
  let total: number
  let listingsCounts: Map<string, number>

  if (query.sort === 'listings') {
    // No stored "active listings" column to order by in the DB — resolved
    // with a single count query and sorted in memory. Acceptable at MVP
    // scale; see docs/en/pages/11-find-agent.md §3.4 ("a simple
    // deterministic sort is enough for this task").
    const { data, count, error } = await profilesQuery
    if (error) throw error
    const allRows = (data ?? []) as unknown as ProfileRow[]
    total = count ?? allRows.length
    listingsCounts = await fetchListingsCounts(allRows.map((r) => r.id))
    allRows.sort((a, b) => (listingsCounts.get(b.id) ?? 0) - (listingsCounts.get(a.id) ?? 0))
    const start = (query.page - 1) * AGENTS_PAGE_SIZE
    profileRows = allRows.slice(start, start + AGENTS_PAGE_SIZE)
  } else {
    if (query.sort === 'newest') {
      profilesQuery = profilesQuery.order('created_at', { ascending: false })
    } else {
      // 'rating' (default)
      profilesQuery = profilesQuery
        .order('agent_rating', { ascending: false })
        .order('agent_review_count', { ascending: false })
    }
    profilesQuery = profilesQuery.range(
      (query.page - 1) * AGENTS_PAGE_SIZE,
      query.page * AGENTS_PAGE_SIZE - 1,
    )
    const { data, count, error } = await profilesQuery
    if (error) throw error
    profileRows = (data ?? []) as unknown as ProfileRow[]
    total = count ?? profileRows.length
    listingsCounts = await fetchListingsCounts(profileRows.map((r) => r.id))
  }

  const items: AgentCardData[] = profileRows.map((p) => {
    const a = agentById.get(p.id)
    return {
      id: p.id,
      slug: p.agent_slug as string,
      name: p.full_name ?? 'Agent',
      avatar: p.avatar_url,
      agencyName: p.agency_name,
      verified: a?.verified ?? false,
      tier: (p.tier as AgentTier) ?? 'free',
      rating: p.agent_rating ?? 0,
      reviewsCount: p.agent_review_count ?? 0,
      languages: a?.languages ?? [],
      scope: a?.scope ?? [],
      specialties: a?.specialties ?? [],
      listingsActive: listingsCounts.get(p.id) ?? 0,
      avgResponseHours: a?.avg_response_hours ?? null,
      createdAt: p.created_at,
    }
  })

  return { items, total, page: query.page, pageSize: AGENTS_PAGE_SIZE }
}
