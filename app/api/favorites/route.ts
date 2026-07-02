import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { favoritesSchema } from '@/lib/property/schemas'

/**
 * POST /api/favorites
 *
 * Toggles a favorite for the authenticated user.
 * Returns 401 when not authenticated.
 * Returns 200 { favorited: boolean } on success.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof favoritesSchema.parse>
  try {
    input = favoritesSchema.parse(body)
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

  if (supabaseUrl && anonKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createServerClient } = await import('@/lib/supabase/server')
      const supabase = await createServerClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'auth_required' }, { status: 401 })
      }

      // Check whether the user already favorited this property
      type FavRow = { id: string }
      const existingResult = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('property_id', input.propertyId)
        .maybeSingle()

      const existing = existingResult.data as FavRow | null

      if (existing) {
        // Remove favorite
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', input.propertyId)
        return NextResponse.json({ favorited: false })
      } else {
        // Add favorite — use unknown cast to satisfy strict generic inference
        const favInsertBuilder = supabase.from('favorites') as unknown as {
          insert: (row: { user_id: string; property_id: string }) => Promise<unknown>
        }
        await favInsertBuilder.insert({
          user_id: user.id,
          property_id: input.propertyId,
        })
        return NextResponse.json({ favorited: true })
      }
    } catch {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
  }

  // Development mock: no auth available, return 401
  return NextResponse.json({ error: 'auth_required' }, { status: 401 })
}
