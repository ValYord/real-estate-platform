import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { overviewQuerySchema } from '@/lib/pro-dashboard/schemas'
import {
  bucketPeriodCounts,
  bucketDailySeries,
  computeTrend,
  rangeToDays,
  synthesizeTrendFromTotal,
} from '@/lib/pro-dashboard/analytics'
import type { OverviewResponse } from '@/lib/pro-dashboard/types'
import type { PlanTier } from '@/lib/plans/types'

type PropertyRow = { id: string; views_count: number; status: string }
type ProfileRow = { tier: PlanTier }
type TimestampRow = { created_at: string }
type ConversationRow = { id: string; created_at: string }

/**
 * GET /api/pro/overview?range=7d|30d|90d
 *
 * KPI overview for the caller's own listings only (page spec §3.1 / §5 "API
 * contracts"). Auth-gated (401), tier-gated (403 `tier_insufficient` for
 * `free` — checked *before* any data query runs), zod-validates `range`
 * (422 on an invalid value).
 *
 * `views` has no per-event timestamp yet (`properties.views_count` is a
 * lifetime running total) — see `synthesizeTrendFromTotal`'s doc comment for
 * the Phase-1 approximation this reuses from `/api/listings/[id]/stats`.
 * `favorites` / `contactClicks` / `newLeads` are computed from real,
 * timestamped rows scoped to `owner_id` / `seller_id` = the caller.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .maybeSingle()

  const tier = (profileData as ProfileRow | null)?.tier ?? 'free'

  if (tier === 'free') {
    return NextResponse.json({ error: 'tier_insufficient' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = overviewQuerySchema.safeParse({
    range: searchParams.get('range') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_params', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { range } = parsed.data
  const days = rangeToDays(range)
  const now = new Date()

  const { data: propsData } = await supabase
    .from('properties')
    .select('id, views_count, status')
    .eq('owner_id', user.id)
    .in('status', ['active', 'draft', 'pending', 'archived'])

  const properties = (propsData ?? []) as PropertyRow[]
  const propIds = properties.map((p) => p.id)
  const totalViews = properties.reduce((sum, p) => sum + (p.views_count ?? 0), 0)
  const activeListings = properties.filter((p) => p.status === 'active').length

  let favoritesTimestamps: string[] = []
  let conversations: ConversationRow[] = []
  let contactClickTimestamps: string[] = []

  if (propIds.length > 0) {
    const [favoritesResult, conversationsResult] = await Promise.all([
      supabase.from('favorites').select('created_at').in('property_id', propIds),
      supabase
        .from('conversations')
        .select('id, created_at')
        .eq('seller_id', user.id)
        .in('property_id', propIds),
    ])

    favoritesTimestamps = ((favoritesResult.data ?? []) as TimestampRow[]).map((r) => r.created_at)
    conversations = (conversationsResult.data ?? []) as ConversationRow[]

    const conversationIds = conversations.map((c) => c.id)
    if (conversationIds.length > 0) {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('created_at')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)

      contactClickTimestamps = ((messagesData ?? []) as TimestampRow[]).map((r) => r.created_at)
    }
  }

  const favoritesCounts = bucketPeriodCounts(favoritesTimestamps, now, days)
  const leadsCounts = bucketPeriodCounts(
    conversations.map((c) => c.created_at),
    now,
    days,
  )
  const contactClicksCounts = bucketPeriodCounts(contactClickTimestamps, now, days)
  const viewsTrend = synthesizeTrendFromTotal(totalViews, days)

  const conversionRate =
    viewsTrend.current > 0 ? leadsCounts.current / viewsTrend.current : 0

  const leadsSeries = bucketDailySeries(
    conversations.map((c) => c.created_at),
    now,
    days,
  ).map((point) => point.value)

  const isEmpty =
    properties.length === 0 ||
    (totalViews === 0 && favoritesTimestamps.length === 0 && conversations.length === 0)

  const response: OverviewResponse = {
    views: {
      value: viewsTrend.current,
      trend: computeTrend(viewsTrend.current, viewsTrend.previous),
    },
    favorites: {
      value: favoritesCounts.current,
      trend: computeTrend(favoritesCounts.current, favoritesCounts.previous),
    },
    contactClicks: {
      value: contactClicksCounts.current,
      trend: computeTrend(contactClicksCounts.current, contactClicksCounts.previous),
    },
    newLeads: {
      value: leadsCounts.current,
      trend: computeTrend(leadsCounts.current, leadsCounts.previous),
    },
    activeListings: { value: activeListings },
    conversionRate: { value: conversionRate },
    sparklines: {
      views: viewsTrend.currentSeries,
      leads: leadsSeries,
    },
    isEmpty,
  }

  return NextResponse.json(response)
}
