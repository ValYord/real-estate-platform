import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { AVATAR_ALLOWED_TYPES, AVATAR_MAX_BYTES } from '@/lib/settings/schemas'

const BUCKET = 'avatars'

/**
 * POST /api/upload/avatar
 * Profile tab avatar uploader (§3.2). Multipart form-data with a single
 * `file` field. Uploads to the `avatars` Supabase Storage bucket under
 * `avatars/<user-id>/<timestamp>.<ext>` using the session-scoped client (so
 * Storage RLS policies restricting writes to the caller's own folder apply),
 * then persists the public URL on the profile row.
 *
 * 201 { url } · 413 { error: 'too_large' } · 415 { error: 'unsupported_type' }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 })
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 })
  }

  if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 415 })
  }

  const ext = file.type.split('/')[1] ?? 'jpg'
  const path = `avatars/${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: 'storage_error' }, { status: 500 })
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = publicUrlData.publicUrl

  const { error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: url, updated_at: new Date().toISOString() } as unknown as never)
    .eq('id', user.id)

  if (dbError) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ url }, { status: 201 })
}

/**
 * DELETE /api/upload/avatar
 * "Remove" action (§3.2) — resets the avatar to the default (initials).
 */
export async function DELETE(): Promise<NextResponse> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() } as unknown as never)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
