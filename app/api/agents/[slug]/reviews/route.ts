import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { agentReviewSchema, agentReviewsQuerySchema } from '@/lib/agent/schemas'
import { MOCK_AGENT_REVIEWS, getMockReviewSummary } from '@/lib/agent/mockData'
import type { AgentReview, AgentReviewsResponse, ReviewBreakdown } from '@/lib/agent/types'

type Params = { slug: string }

const PAGE_SIZE = 10

/** Postgres unique-violation error code, raised on UNIQUE (agent_id, author_id). */
const UNIQUE_VIOLATION = '23505'
/** Postgres check-violation error code, raised on CHECK (agent_id <> author_id). */
const CHECK_VIOLATION = '23514'

interface ReviewRow {
  id: string
  agent_id: string
  author_id: string
  rating: number
  text: string
  reply: string | null
  replied_at: string | null
  created_at: string
  author: { id: string; full_name: string | null; avatar_url: string | null } | { id: string; full_name: string | null; avatar_url: string | null }[] | null
}

function firstOf<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v
}

function mapRow(row: ReviewRow): AgentReview {
  const author = firstOf(row.author)
  return {
    id: row.id,
    agentId: row.agent_id,
    authorId: row.author_id,
    authorName: author?.full_name ?? 'User',
    authorAvatar: author?.avatar_url ?? null,
    rating: row.rating,
    text: row.text,
    reply: row.reply,
    repliedAt: row.replied_at,
    createdAt: row.created_at,
  }
}

function buildBreakdown(rows: Array<{ rating: number }>): ReviewBreakdown {
  const breakdown: ReviewBreakdown = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  for (const r of rows) {
    const key = String(Math.min(5, Math.max(1, Math.round(r.rating)))) as keyof ReviewBreakdown
    breakdown[key] += 1
  }
  return breakdown
}

function sortItems(items: AgentReview[], sort: 'newest' | 'highest' | 'lowest'): AgentReview[] {
  const copy = items.slice()
  if (sort === 'highest') return copy.sort((a, b) => b.rating - a.rating)
  if (sort === 'lowest') return copy.sort((a, b) => a.rating - b.rating)
  return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * GET /api/agents/[slug]/reviews?sort=newest|highest|lowest&page=1
 *
 * Public — no auth required to read reviews. `viewerHasReviewed` reflects the
 * current session (null/false for guests).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  // The route segment carries the agent's id (the caller passes agent.id).
  const { slug: agentId } = await params
  const { searchParams } = new URL(request.url)

  let query: ReturnType<typeof agentReviewsQuerySchema.parse>
  try {
    query = agentReviewsQuerySchema.parse({
      sort: searchParams.get('sort') ?? undefined,
      page: searchParams.get('page') ?? undefined,
    })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_params' }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      const { data, error } = await admin
        .from('agent_reviews')
        .select('id, agent_id, author_id, rating, text, reply, replied_at, created_at, author:profiles!agent_reviews_author_id_fkey(id, full_name, avatar_url)')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        const rows = data as unknown as ReviewRow[]
        const allItems = rows.map(mapRow)
        const sorted = sortItems(allItems, query.sort)
        const start = (query.page - 1) * PAGE_SIZE
        const paged = sorted.slice(start, start + PAGE_SIZE)

        const total = allItems.length
        const average = total > 0 ? allItems.reduce((s, r) => s + r.rating, 0) / total : 0

        let viewerHasReviewed = false
        try {
          const { createServerClient } = await import('@/lib/supabase/server')
          const supabase = await createServerClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) viewerHasReviewed = allItems.some((r) => r.authorId === user.id)
        } catch {
          viewerHasReviewed = false
        }

        const response: AgentReviewsResponse = {
          items: paged,
          summary: {
            average: Math.round(average * 10) / 10,
            count: total,
            breakdown: buildBreakdown(allItems),
          },
          page: query.page,
          pageSize: PAGE_SIZE,
          total,
          viewerHasReviewed,
        }
        return NextResponse.json(response)
      }
    } catch {
      // Fall through to mock data
    }
  }

  const sorted = sortItems(MOCK_AGENT_REVIEWS, query.sort)
  const start = (query.page - 1) * PAGE_SIZE
  const response: AgentReviewsResponse = {
    items: sorted.slice(start, start + PAGE_SIZE),
    summary: getMockReviewSummary(),
    page: query.page,
    pageSize: PAGE_SIZE,
    total: MOCK_AGENT_REVIEWS.length,
    viewerHasReviewed: false,
  }
  return NextResponse.json(response)
}

/**
 * POST /api/agents/[slug]/reviews
 *
 * Body: { rating: 1-5, text: 10-1000 chars }.
 * Auth: required (401). Self-review blocked (422). One review per
 * author/agent — a second attempt returns 409.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  // The route segment carries the agent's id (the caller passes agent.id).
  const { slug: agentId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof agentReviewSchema.parse>
  try {
    input = agentReviewSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey || supabaseUrl.includes('your-project-id')) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  try {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    if (user.id === agentId) {
      return NextResponse.json({ error: 'self_review_forbidden' }, { status: 422 })
    }

    const insertResult = await supabase
      .from('agent_reviews')
      .insert({
        agent_id: agentId,
        author_id: user.id,
        rating: input.rating,
        text: input.text,
      } as unknown as never)
      .select('id')
      .single()

    if (insertResult.error) {
      if (insertResult.error.code === UNIQUE_VIOLATION) {
        return NextResponse.json({ error: 'already_reviewed' }, { status: 409 })
      }
      if (insertResult.error.code === CHECK_VIOLATION) {
        return NextResponse.json({ error: 'self_review_forbidden' }, { status: 422 })
      }
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const row = insertResult.data as unknown as { id: string } | null
    if (!row) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({ reviewId: row.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
