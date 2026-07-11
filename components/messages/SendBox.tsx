'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Paperclip, Send, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ATTACHMENT_TYPES } from '@/lib/messages/schemas'
import type { AttachmentItem } from '@/lib/messages/types'

const MAX_BODY_LENGTH = 2000
const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

interface PendingUpload {
  id: string
  file: File
  previewUrl: string
  uploading: boolean
  error: boolean
  attachment: AttachmentItem | null
}

interface SendBoxProps {
  conversationId: string
  disabled: boolean
  disabledReason?: string
  onSend: (body: string, attachments: AttachmentItem[]) => void
}

/**
 * Sticky send box: textarea (Enter = send, Shift+Enter = newline), image
 * attachment upload (Supabase Storage via a signed URL), and the [Send]
 * button. Disabled with an explanatory message when blocked.
 */
export default function SendBox({ conversationId, disabled, disabledReason, onSend }: SendBoxProps) {
  const [body, setBody] = useState('')
  const [uploads, setUploads] = useState<PendingUpload[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSend =
    !disabled &&
    (body.trim().length > 0 || uploads.some((u) => u.attachment)) &&
    !uploads.some((u) => u.uploading)

  const uploadFile = async (file: File): Promise<void> => {
    const id = crypto.randomUUID()
    const previewUrl = URL.createObjectURL(file)
    setUploads((prev) => [...prev, { id, file, previewUrl, uploading: true, error: false, attachment: null }])

    try {
      if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
        throw new Error('unsupported_type')
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        throw new Error('file_too_large')
      }

      const res = await fetch('/api/messages/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      })
      if (!res.ok) throw new Error('upload_request_failed')
      const { uploadUrl, token, path, publicUrl } = (await res.json()) as {
        uploadUrl: string
        token: string
        path: string
        publicUrl: string
      }
      void uploadUrl // returned for parity with other signed-upload flows; uploadToSignedUrl only needs path+token

      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .uploadToSignedUrl(path, token, file)
      if (uploadError) throw uploadError

      setUploads((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, uploading: false, attachment: { url: publicUrl, type: file.type as AttachmentItem['type'] } }
            : u,
        ),
      )
    } catch {
      setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, uploading: false, error: true } : u)))
      setError('Could not upload image')
    }
  }

  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList) return
    const files = Array.from(fileList).slice(0, MAX_ATTACHMENTS - uploads.length)
    files.forEach((file) => void uploadFile(file))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const target = prev.find((u) => u.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((u) => u.id !== id)
    })
  }

  const handleSend = () => {
    if (!canSend) return
    const attachments = uploads.map((u) => u.attachment).filter((a): a is AttachmentItem => a !== null)
    onSend(body.trim(), attachments)
    setBody('')
    uploads.forEach((u) => URL.revokeObjectURL(u.previewUrl))
    setUploads([])
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (disabled) {
    return (
      <div className="sticky bottom-0 bg-white border-t p-3 flex-shrink-0">
        <p role="status" className="text-sm text-gray-500 text-center">
          {disabledReason ?? 'You cannot send messages in this conversation'}
        </p>
      </div>
    )
  }

  return (
    <div className="sticky bottom-0 bg-white border-t p-3 flex-shrink-0 space-y-2">
      {error && <p className="text-xs text-red-500">{error}</p>}

      {uploads.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploads.map((u) => (
            <div key={u.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
              <Image src={u.previewUrl} alt="" fill className="object-cover" unoptimized />
              {u.uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" aria-hidden="true" />
                </div>
              )}
              {u.error && (
                <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center text-white text-xs">
                  Error
                </div>
              )}
              <button
                type="button"
                onClick={() => removeUpload(u.id)}
                aria-label="Remove attachment"
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACHMENT_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploads.length >= MAX_ATTACHMENTS}
          aria-label="Attach image"
          className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Paperclip className="w-5 h-5" aria-hidden="true" />
        </button>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY_LENGTH))}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Write a message…"
          aria-label="Write a message"
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 max-h-32 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            'h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center transition-colors',
            canSend ? 'bg-primary text-white hover:bg-primary/90' : 'bg-gray-100 text-gray-300',
          )}
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
