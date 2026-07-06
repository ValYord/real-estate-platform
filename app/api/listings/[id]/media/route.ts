import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// Supabase type inference with recursive Json columns resolves insert
// arg types to `never` in some TS versions. Cast via `as unknown as T`.
type MediaInsert = Database['public']['Tables']['property_media']['Insert']

type RouteContext = { params: Promise<{ id: string }> }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const initiateUploadSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_TYPES, {
    errorMap: () => ({ message: 'Only JPG, PNG, or WebP files are allowed' }),
  }),
  size: z.number().int().positive().max(MAX_SIZE_BYTES, 'File is too large, max 10 MB'),
})

// Supabase type inference cannot resolve complex select strings, so we
// define the expected shapes explicitly and cast query results below.
type ListingOwnerRow = { id: string; owner_id: string }
type MediaInsertRow = { id: string }

/**
 * POST /api/listings/[id]/media
 * Issues a Supabase Storage signed upload URL.
 * Returns { uploadUrl, mediaId, order }.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { id } = await params
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
    .select('id, owner_id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  const listing = ownerResult.data as unknown as ListingOwnerRow | null
  if (ownerResult.error || !listing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let parsed: z.infer<typeof initiateUploadSchema>
  try {
    parsed = initiateUploadSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      const issue = err.issues[0]
      if (issue?.message?.includes('too large') || issue?.path[0] === 'size') {
        return NextResponse.json({ error: 'file_too_large', max: MAX_SIZE_BYTES }, { status: 413 })
      }
      if (issue?.path[0] === 'contentType') {
        return NextResponse.json({ error: 'unsupported_type' }, { status: 415 })
      }
      return NextResponse.json({ error: 'validation', message: issue?.message }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // Count existing media for sort_order
  const { count: existingCount } = await supabase
    .from('property_media')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', id)

  const nextOrder = existingCount ?? 0

  // Check max photos limit
  if (nextOrder >= 30) {
    return NextResponse.json({ error: 'media_limit_reached', max: 30 }, { status: 422 })
  }

  // Insert a placeholder media row to get the mediaId
  const mediaInsertPayload: MediaInsert = {
    property_id: id,
    url: 'pending', // will be updated on confirm
    media_type: 'image',
    sort_order: nextOrder,
  }
  // `as unknown as never` bypasses the recursive-Json-induced `never[]` param type.
  const insertResult = await supabase
    .from('property_media')
    .insert(mediaInsertPayload as unknown as never)
    .select('id')
    .single()

  const mediaRow = insertResult.data as unknown as MediaInsertRow | null
  if (insertResult.error || !mediaRow) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // Generate storage path
  const ext = parsed.fileName.split('.').pop() ?? 'jpg'
  const storagePath = `listings/${id}/${mediaRow.id}.${ext}`

  // Create a signed upload URL via Supabase Storage
  const { data: signedData, error: signedError } = await supabase.storage
    .from('property-media')
    .createSignedUploadUrl(storagePath)

  if (signedError || !signedData) {
    // Clean up the placeholder row
    await supabase.from('property_media').delete().eq('id', mediaRow.id)
    return NextResponse.json({ error: 'storage_error' }, { status: 500 })
  }

  return NextResponse.json({
    uploadUrl: signedData.signedUrl,
    mediaId: mediaRow.id,
    order: nextOrder,
    storagePath,
  })
}
