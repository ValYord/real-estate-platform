import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { step1Schema } from '@/lib/listings/schemas'
import type { Database } from '@/types/database'

// Supabase type inference with recursive Json columns resolves insert/update
// arg types to `never` in some TS versions. We cast via `as unknown as T`
// (same pattern used for query results throughout this codebase).
type PropertyInsert = Database['public']['Tables']['properties']['Insert']
type InsertResultRow = { id: string; status: string }

/** Maximum active listings for a free-tier user */
const FREE_LIMIT = 5

/**
 * POST /api/listings
 * Creates a new draft listing on the first wizard change.
 * - Validates step 1 fields (dealType, propertyType).
 * - Checks the user's active-listing limit.
 * - Inserts a draft row and returns { id, status }.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Parse + validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let parsed: ReturnType<typeof step1Schema.parse>
  try {
    parsed = step1Schema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {}
      for (const issue of err.issues) {
        fields[issue.path.join('.')] = issue.message
      }
      return NextResponse.json({ error: 'validation', fields }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // Check active listing limit
  const { count, error: countError } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('status', 'active')

  if (countError) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const activeCount = count ?? 0
  if (activeCount >= FREE_LIMIT) {
    return NextResponse.json(
      { error: 'limit_reached', limit: FREE_LIMIT, active: activeCount },
      { status: 403 },
    )
  }

  // Generate a unique slug (placeholder; full slug computed on publish)
  const draftSlug = `draft-${user.id.slice(0, 8)}-${Date.now()}`

  const insertPayload: PropertyInsert = {
    owner_id: user.id,
    slug: draftSlug,
    deal_type: parsed.dealType,
    property_type: parsed.propertyType,
    status: 'draft',
    // Required columns with placeholder values (filled in later steps)
    price: 0,
    city: '',
  }

  // The Supabase client with the Database generic resolves insert arg types to
  // `never`/`never[]` when the schema has recursive Json columns.
  // `as unknown as never` is valid: `never` is assignable to every type including
  // `never[]`, so this satisfies the param type without bypassing runtime safety.
  const insertResult = await supabase
    .from('properties')
    .insert(insertPayload as unknown as never)
    .select('id, status')
    .single()

  const row = insertResult.data as unknown as InsertResultRow | null
  const { error: insertError } = insertResult

  if (insertError || !row) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ id: row.id, status: row.status }, { status: 201 })
}
