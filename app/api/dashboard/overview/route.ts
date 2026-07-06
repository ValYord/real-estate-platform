import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { DashboardOverview } from '@/lib/dashboard/types'

/**
 * GET /api/dashboard/overview
 * Returns aggregate counts for the dashboard overview cards.
 * Auth-gated: 401 when not authenticated.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Run all aggregate queries in parallel
  const [listingsResult, favoritesResult, profileResult, unreadResult] =
    await Promise.all([
      // Active listings count + total views
      supabase
        .from('properties')
        .select('status, views_count')
        .eq('owner_id', user.id)
        .in('status', ['active', 'draft', 'pending', 'archived']),

      // Favorites count (properties the user saved)
      supabase
        .from('favorites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),

      // Profile for agent data
      supabase
        .from('profiles')
        .select('role, agent_slug, agent_rating, agent_review_count')
        .eq('id', user.id)
        .single(),

      // Unread messages: conversations where user is seller + unread messages
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .not('sender_id', 'eq', user.id),
    ])

  type PropertyRow = { status: string; views_count: number }
  const properties = (listingsResult.data ?? []) as PropertyRow[]
  const activeListings = properties.filter((p) => p.status === 'active').length
  const totalViews = properties.reduce((sum, p) => sum + (p.views_count ?? 0), 0)

  const favoritesCount = favoritesResult.count ?? 0

  type ProfileRow = {
    role: string
    agent_slug: string | null
    agent_rating: number | null
    agent_review_count: number
  }
  const profile = profileResult.data as ProfileRow | null
  const unreadCount = unreadResult.count ?? 0

  const agentStats =
    profile?.role === 'agent' && profile.agent_slug
      ? {
          rating: profile.agent_rating ?? 0,
          reviews: profile.agent_review_count,
          slug: profile.agent_slug,
        }
      : null

  const overview: DashboardOverview = {
    listings: activeListings,
    views: totalViews,
    unread: unreadCount,
    favorites: favoritesCount,
    savedSearches: 0,
    agent: agentStats,
  }

  return NextResponse.json(overview)
}
