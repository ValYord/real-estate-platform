'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface AvatarUploaderProps {
  name: string
  avatarUrl: string | null
  onUpload: (url: string) => void
  onRemove: () => void
}

/** Initials fallback avatar (default avatar per §3.2 "Remove → default avatar"). */
function Initials({ name }: { name: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  return (
    <div
      aria-hidden="true"
      className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold"
    >
      {initials}
    </div>
  )
}

/**
 * Avatar click/drag-drop uploader (§3.2). Uploads to Supabase Storage via
 * POST /api/upload/avatar (multipart); client-side pre-validates size/type
 * so the user gets instant feedback before the network round-trip.
 */
export default function AvatarUploader({ name, avatarUrl, onUpload, onRemove }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)

    if (file.size > MAX_BYTES) {
      setError('The image is too large (max 5MB)')
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, or WebP images are allowed')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: formData })
      if (!res.ok) {
        if (res.status === 413) setError('The image is too large (max 5MB)')
        else setError('Upload failed. Try again.')
        return
      }
      const body = (await res.json()) as { url: string }
      onUpload(body.url)
    } catch {
      setError('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    setError(null)
    try {
      const res = await fetch('/api/upload/avatar', { method: 'DELETE' })
      if (res.ok) onRemove()
    } catch {
      setError('Could not remove the avatar. Try again.')
    }
  }

  return (
    <div className="flex items-center gap-4 mb-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Change avatar"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void handleFile(file)
        }}
        className={cn(
          'relative w-20 h-20 rounded-full cursor-pointer flex-shrink-0',
          dragOver && 'ring-2 ring-primary ring-offset-2',
        )}
      >
        {avatarUrl ? (
          // Avatar URL is a dynamic Supabase Storage public URL; next/image would
          // need a wildcard host allowlist for arbitrary user uploads (out of scope).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <Initials name={name} />
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="border border-gray-300 h-9 rounded-lg px-3 text-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Change
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => void handleRemove()}
              className="border border-gray-300 h-9 rounded-lg px-3 text-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Remove
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
