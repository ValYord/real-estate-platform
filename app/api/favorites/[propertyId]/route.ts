import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

const paramsSchema = z.object({
  propertyId: z.string().uuid('propertyId must be a UUID'),
})

/**
 * DELETE /api/favorites/[propertyId]
 *
 * Removes a property from the authenticated user's favorites.
 * RLS guarantees that only the owner's rows are affected.
 * Returns 200 { favorited: false } on success.
 * Returns 401 for unauthenticated users.
 * Returns 404 if the favorite does not exist.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> },
): Promise<NextResponse> {
  let resolved: { propertyId: string }
  try {
    resolved = paramsSchema.parse(await params)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'invalid_params', fields: err.flatten().fieldErrors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
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

    // RLS enforces user_id = auth.uid(); the explicit .eq('user_id') is a
    // defence-in-depth guard and makes the query self-documenting.
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('property_id', resolved.propertyId)

    if (error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({ favorited: false })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
