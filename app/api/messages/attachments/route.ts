import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { attachmentUploadRequestSchema } from '@/lib/messages/schemas'

const BUCKET = 'message-attachments'

interface ConversationRow {
  buyer_id: string
  seller_id: string
}

/**
 * POST /api/messages/attachments
 *
 * Body: { conversationId, fileName, contentType, size } (image/jpeg|png|webp, max 5 MB).
 * Issues a Supabase Storage signed upload URL under `conversations/<id>/<uuid>.<ext>`.
 * The client then uploads the file bytes directly to Storage and includes the
 * returned `publicUrl` in the attachments[] array of `POST /api/messages`.
 *
 * Auth: required; the caller must be a participant in the conversation.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof attachmentUploadRequestSchema.parse>
  try {
    input = attachmentUploadRequestSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      const issue = err.issues[0]
      if (issue?.path[0] === 'size') {
        return NextResponse.json({ error: 'file_too_large' }, { status: 413 })
      }
      if (issue?.path[0] === 'contentType') {
        return NextResponse.json({ error: 'unsupported_type' }, { status: 415 })
      }
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  const convResult = await supabase
    .from('conversations')
    .select('buyer_id, seller_id')
    .eq('id', input.conversationId)
    .single()

  const conversation = convResult.data as unknown as ConversationRow | null
  if (convResult.error || !conversation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const ext = input.contentType.split('/')[1] ?? 'jpg'
  const path = `conversations/${input.conversationId}/${crypto.randomUUID()}.${ext}`

  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (signedError || !signedData) {
    return NextResponse.json({ error: 'storage_error' }, { status: 500 })
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({
    uploadUrl: signedData.signedUrl,
    token: signedData.token,
    path,
    publicUrl: publicUrlData.publicUrl,
  })
}
