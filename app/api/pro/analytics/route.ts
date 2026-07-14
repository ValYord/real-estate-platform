import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { analyticsQuerySchema } from '@/lib/pro-dashboard/schemas'
import {
  bucketDailySeries,
  groupCountInRange,
  pickTitle,
  rangeToDays,
  synthesizeDailySeries,
  toDatedSeries,
} from '@/lib/pro-dashboard/analytics'
import type { AnalyticsResponse, TopListing } from '@/lib/pro-dashboard/types'
import type { PlanTier } from '@/lib/plans/types'

type PropertyRow = {
  id: string
  slug: string
  title: Record<string, string> | null
  views_count: number
  status: string
}
type ProfileRow = { tier: PlanTier }
type FavoriteRow = { property_id: string; created_at: string }
type ConversationRow = { id: string; property_id: string | null; created_at: string }
type MessageRow = { conversation_id: string; created_at: string }

const TOP_LISTINGS_LIMIT = 5

/**
 * GET /api/pro/analytics?range=7d|30d|90d&metric=views|favorites|contactClicks|leads
 *
 * Listing performance charts + "Top performing listings" table (page spec
 * §3.2 / §5 "API contracts" — `topListings` is an additive extension of the
 * spec's sample JSON, needed for that table). Auth-gated (401), tier-gated
 * (403 `tier_insufficient` for `free`, before any data query), zod-validates
 * `range`/`metric` (422 on an invalid value).
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
  const parsed = analyticsQuerySchema.safeParse({
    range: searchParams.get('range') ?? undefined,
    metric: searchParams.get('metric') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_params', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { range, metric } = parsed.data
  const days = rangeToDays(range)
  const now = new Date()

  const { data: propsData } = await supabase
    .from('properties')
    .select('id, slug, title, views_count, status')
    .eq('owner_id', user.id)
    .in('status', ['active', 'draft', 'pending', 'archived'])

  const properties = (propsData ?? []) as PropertyRow[]
  const propIds = properties.map((p) => p.id)
  const totalViews = properties.reduce((sum, p) => sum + (p.views_count ?? 0), 0)

  if (propIds.length === 0) {
    const empty: AnalyticsResponse = {
      series: [],
      funnel: { views: 0, contacts: 0, leads: 0 },
      topListings: [],
      isEmpty: true,
    }
    return NextResponse.json(empty)
  }

  const [favoritesResult, conversationsResult] = await Promise.all([
    supabase.from('favorites').select('property_id, created_at').in('property_id', propIds),
    supabase
      .from('conversations')
      .select('id, property_id, created_at')
      .eq('seller_id', user.id)
      .in('property_id', propIds),
  ])

  const favorites = (favoritesResult.data ?? []) as FavoriteRow[]
  const conversations = (conversationsResult.data ?? []) as ConversationRow[]
  const conversationIds = conversations.map((c) => c.id)
  const conversationToProperty = new Map(conversations.map((c) => [c.id, c.property_id]))

  let messages: MessageRow[] = []
  if (conversationIds.length > 0) {
    const { data: messagesData } = await supabase
      .from('messages')
      .select('conversation_id, created_at')
      .in('conversation_id', conversationIds)
      .neq('sender_id', user.id)
    messages = (messagesData ?? []) as MessageRow[]
  }

  // ── Requested metric's time series (for the selected chart panel) ─────────
  let series: { date: string; value: number }[]
  switch (metric) {
    case 'favorites':
      series = bucketDailySeries(favorites.map((f) => f.created_at), now, days)
      break
    case 'contactClicks':
      series = bucketDailySeries(messages.map((m) => m.created_at), now, days)
      break
    case 'leads':
      series = bucketDailySeries(conversations.map((c) => c.created_at), now, days)
      break
    case 'views':
    default:
      series = toDatedSeries(synthesizeDailySeries(totalViews, days), now, days)
      break
  }

  // ── Funnel: period totals for all three stages, independent of `metric` ───
  const contactsSeries = bucketDailySeries(messages.map((m) => m.created_at), now, days)
  const leadsSeries = bucketDailySeries(conversations.map((c) => c.created_at), now, days)
  const viewsSeries = synthesizeDailySeries(totalViews, days)
  const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0)

  const funnel = {
    views: sum(viewsSeries),
    contacts: sum(contactsSeries.map((p) => p.value)),
    leads: sum(leadsSeries.map((p) => p.value)),
  }

  // ── Top performing listings (ranked by lifetime views, metrics period-scoped) ─
  const favoritesByProperty = groupCountInRange(
    favorites,
    (f) => f.property_id,
    (f) => f.created_at,
    now,
    days,
  )
  const leadsByProperty = groupCountInRange(
    conversations,
    (c) => c.property_id,
    (c) => c.created_at,
    now,
    days,
  )
  const contactClicksByProperty = groupCountInRange(
    messages,
    (m) => conversationToProperty.get(m.conversation_id) ?? null,
    (m) => m.created_at,
    now,
    days,
  )

  const topListings: TopListing[] = [...properties]
    .sort((a, b) => b.views_count - a.views_count)
    .slice(0, TOP_LISTINGS_LIMIT)
    .map((p) => {
      const views = p.views_count ?? 0
      const leads = leadsByProperty.get(p.id) ?? 0
      return {
        id: p.id,
        slug: p.slug,
        title: pickTitle(p.title),
        views,
        favorites: favoritesByProperty.get(p.id) ?? 0,
        contactClicks: contactClicksByProperty.get(p.id) ?? 0,
        leads,
        ctr: views > 0 ? leads / views : 0,
      }
    })

  const isEmpty = totalViews === 0 && favorites.length === 0 && conversations.length === 0

  const response: AnalyticsResponse = { series, funnel, topListings, isEmpty }

  return NextResponse.json(response)
}
