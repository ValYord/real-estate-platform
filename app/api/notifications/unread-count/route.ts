import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { UnreadCountResponse } from '@/lib/notifications/types'

/**
 * GET /api/notifications/unread-count
 *
 * Returns the caller's unread notification count for the header bell badge.
 * Auth: required (401). RLS scopes the count to the caller's own rows.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const response: UnreadCountResponse = { count: count ?? 0 }
  return NextResponse.json(response)
}
