import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// Supabase type inference with recursive Json columns resolves update
// arg types to `never` in some TS versions. Cast via `as unknown as T`.
type MediaUpdate = Database['public']['Tables']['property_media']['Update']

type RouteContext = { params: Promise<{ id: string; mediaId: string }> }

const confirmSchema = z.object({
  storagePath: z.string().min(1),
})

// Supabase type inference cannot resolve select strings, so we cast results below.
type ListingIdRow = { id: string }
type MediaUpdateRow = { id: string; url: string; sort_order: number }

/**
 * POST /api/listings/[id]/media/[mediaId]/confirm
 * Called after the client finishes the direct PUT to Supabase Storage.
 * Updates the media row URL and returns the public URL + thumb.
 */
export async function POST(
  request: NextRequest,
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

  // Verify ownership
  const ownerResult = await supabase
    .from('properties')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  const listing = ownerResult.data as unknown as ListingIdRow | null
  if (!listing) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let parsed: z.infer<typeof confirmSchema>
  try {
    parsed = confirmSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'validation' }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // Get the public URL from Supabase Storage
  const { data: publicUrlData } = supabase.storage
    .from('property-media')
    .getPublicUrl(parsed.storagePath)

  const publicUrl = publicUrlData.publicUrl

  // Update the media row with the real URL
  const mediaUpdatePayload: MediaUpdate = { url: publicUrl }
  // `as unknown as never` bypasses the recursive-Json-induced `never` param type.
  const updateResult = await supabase
    .from('property_media')
    .update(mediaUpdatePayload as unknown as never)
    .eq('id', mediaId)
    .eq('property_id', id)
    .select('id, url, sort_order')
    .single()

  const mediaRow = updateResult.data as unknown as MediaUpdateRow | null
  const { error: updateError } = updateResult

  if (updateError || !mediaRow) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // Return the URL and a thumbnail (same URL; production would use transform params)
  return NextResponse.json({
    url: mediaRow.url,
    thumb: mediaRow.url,
  })
}
