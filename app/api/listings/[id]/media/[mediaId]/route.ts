import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string; mediaId: string }> }

/**
 * DELETE /api/listings/[id]/media/[mediaId]
 * Removes a media item from the listing.
 * Ownership is enforced via the property join.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { id, mediaId } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Verify ownership by checking the property
  const { data: listing } = await supabase
    .from('properties')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('property_media')
    .delete()
    .eq('id', mediaId)
    .eq('property_id', id)

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
