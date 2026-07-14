import 'server-only'
import type { createServerClient } from '@/lib/supabase/server'
import type { DashboardStats, ListingTitle, ModerationListItem } from './types'

type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>

/**
 * Shared by app/api/admin/stats/route.ts (client refetch) and
 * app/[locale]/admin/page.tsx (initial SSR render) so the counting logic
 * lives in exactly one place.
 */
export async function getDashboardStats(supabase: SupabaseServerClient): Promise<DashboardStats> {
  const [usersCount, totalCount, activeCount, pendingCount, soldCount, archivedCount] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('properties').select('id', { count: 'exact', head: true }),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
  ])

  const pending = pendingCount.count ?? 0

  return {
    users: usersCount.count ?? 0,
    listings: {
      total: totalCount.count ?? 0,
      active: activeCount.count ?? 0,
      pending,
      sold: soldCount.count ?? 0,
      archived: archivedCount.count ?? 0,
    },
    attention: pending,
  }
}

// Supabase type inference cannot resolve nested-join select strings, so the
// expected shape is declared explicitly and the query result cast below
// (same convention as app/api/properties/[id]/route.ts).
type MediaRow = { url: string; media_type: string; sort_order: number }
type OwnerRow = { full_name: string | null } | null
type PendingRow = {
  id: string
  title: ListingTitle | null
  price: number
  currency: string
  created_at: string
  profiles: OwnerRow
  property_media: MediaRow[] | null
}

/**
 * Shared by app/api/admin/moderation/route.ts (client refetch) and
 * app/[locale]/admin/moderation/page.tsx (initial SSR render). Pending
 * listings, oldest first.
 */
export async function getPendingModerationQueue(supabase: SupabaseServerClient): Promise<ModerationListItem[]> {
  const { data, error } = await supabase
    .from('properties')
    .select(
      `id, title, price, currency, created_at,
       profiles!properties_owner_id_fkey(full_name),
       property_media(url, media_type, sort_order)`,
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as unknown as PendingRow[]

  return rows.map((row) => {
    const cover = (row.property_media ?? [])
      .filter((m) => m.media_type === 'image')
      .sort((a, b) => a.sort_order - b.sort_order)[0]

    return {
      id: row.id,
      title: row.title ?? {},
      ownerName: row.profiles?.full_name ?? 'Unknown',
      price: row.price,
      currency: row.currency,
      thumbnail: cover?.url ?? null,
      createdAt: row.created_at,
    }
  })
}
