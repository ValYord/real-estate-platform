import { NextRequest, NextResponse } from 'next/server'
import { verifyUnsubscribeToken } from '@/lib/saved-searches/unsubscribeToken'

/**
 * GET /api/saved-searches/unsubscribe?token=<signed>
 *
 * Auth-free, one-click "turn off notifications" link for alert emails
 * (§5.3/§5.4 of docs/design/saved-searches-page.md). No session required —
 * deliverability depends on the link working straight from the inbox.
 *
 * The token is verified (HMAC, `lib/saved-searches/unsubscribeToken.ts`)
 * before the database is touched. On success the referenced row's
 * `alert_frequency` is set to 'off' using the service-role client, scoped
 * strictly to the single row identified by the verified payload — never a
 * broad query — since there is no `auth.uid()` to satisfy RLS here.
 *
 * 200 { success: true } · 400 { error: 'invalid_token' } (invalid, tampered,
 * or unknown token — the response never says which, to avoid leaking which
 * part failed).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
  }

  const payload = verifyUnsubscribeToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('saved_searches')
      .update({ alert_frequency: 'off' } as unknown as never)
      .eq('id', payload.savedSearchId)
      .select('id')

    if (error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    if (!data || (data as unknown[]).length === 0) {
      // Token was validly signed but the row no longer exists — treat the
      // same as an invalid token rather than leaking existence info.
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications turned off for this search.',
    })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
