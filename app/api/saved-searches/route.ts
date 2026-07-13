import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { savedSearchSchema } from '@/lib/saved-searches/schemas'
import type { AlertFrequency, SavedSearchItem, SavedSearchesResponse } from '@/lib/saved-searches/types'
import type { Filters } from '@/lib/search/filtersSchema'

/** Per-user cap — keeps abuse/cron load bounded (see docs/en/pages/08-saved-searches.md §5). */
const SAVED_SEARCHES_LIMIT = 10

/** Postgres unique-violation error code, raised on `UNIQUE (user_id, filters_hash)`. */
const UNIQUE_VIOLATION = '23505'

interface SavedSearchRow {
  id: string
  name: string
  filters: Filters
  alert_frequency: string
  last_alerted_at: string | null
  new_match_count: number
  created_at: string
}

function rowToItem(row: SavedSearchRow): SavedSearchItem {
  return {
    id: row.id,
    name: row.name,
    filters: row.filters,
    alertFrequency: row.alert_frequency as AlertFrequency,
    newMatchCount: row.new_match_count,
    lastAlertedAt: row.last_alerted_at,
    createdAt: row.created_at,
  }
}

// ── GET /api/saved-searches ────────────────────────────────────────────────

/**
 * GET /api/saved-searches
 *
 * Returns the authenticated user's saved searches (max 10 — no pagination
 * needed). Returns 401 for unauthenticated users.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .select('id, name, filters, alert_frequency, last_alerted_at, new_match_count, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const items = ((data ?? []) as unknown as SavedSearchRow[]).map(rowToItem)
    const response: SavedSearchesResponse = { items, total: items.length }

    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// ── POST /api/saved-searches ───────────────────────────────────────────────

/**
 * POST /api/saved-searches
 *
 * Body: { name, filters, alertFrequency } — validated by `savedSearchSchema`
 * (reuses the `/search` filters schema).
 * 201 { id } · 401 auth_required · 409 duplicate (unique-violation on
 * (user_id, filters_hash)) · 422 limit_reached | validation_error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof savedSearchSchema.parse>
  try {
    input = savedSearchSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    // Enforce the per-user limit before inserting (same technique as the
    // favorites-count check in app/[locale]/favorites/page.tsx).
    const { count, error: countError } = await supabase
      .from('saved_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    if ((count ?? 0) >= SAVED_SEARCHES_LIMIT) {
      return NextResponse.json({ error: 'limit_reached' }, { status: 422 })
    }

    const insertResult = await supabase
      .from('saved_searches')
      .insert({
        user_id: user.id,
        name: input.name,
        filters: input.filters,
        alert_frequency: input.alertFrequency,
      } as unknown as never)
      .select('id')
      .single()

    if (insertResult.error) {
      if (insertResult.error.code === UNIQUE_VIOLATION) {
        return NextResponse.json({ error: 'duplicate' }, { status: 409 })
      }
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const row = insertResult.data as unknown as { id: string } | null
    if (!row) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({ id: row.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
