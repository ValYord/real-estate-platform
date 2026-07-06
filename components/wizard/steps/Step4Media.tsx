'use client'

import { useCallback, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { X, MoveUp, MoveDown, ImageIcon, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WizardFormData, UploadFile } from '@/lib/listings/types'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024
const MAX_PHOTOS = 30

interface Step4MediaProps {
  listingId: string | null
}

export default function Step4Media({ listingId }: Step4MediaProps) {
  const { watch, setValue, formState: { errors } } = useFormContext<WizardFormData>()
  const [uploads, setUploads] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const media = watch('media') ?? []

  const updateUpload = (tempId: string, patch: Partial<UploadFile>) => {
    setUploads((prev) => prev.map((u) => (u.tempId === tempId ? { ...u, ...patch } : u)))
  }

  const uploadFile = useCallback(
    async (file: File) => {
      if (!listingId) return

      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const currentMedia = media
      const order = currentMedia.length + uploads.filter((u) => u.status === 'success').length

      const newUpload: UploadFile = {
        tempId,
        file,
        status: 'uploading',
        progress: 0,
        order,
      }
      setUploads((prev) => [...prev, newUpload])

      try {
        // Step 1: Get signed upload URL
        const initRes = await fetch(`/api/listings/${listingId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            size: file.size,
          }),
        })

        if (!initRes.ok) {
          const err = (await initRes.json()) as { error: string }
          let errorMessage = 'Upload failed'
          if (err.error === 'file_too_large') errorMessage = 'File is too large, max 10 MB'
          if (err.error === 'unsupported_type') errorMessage = 'Only JPG, PNG, or WebP'
          if (err.error === 'media_limit_reached') errorMessage = 'Maximum 30 photos reached'
          updateUpload(tempId, { status: 'error', errorMessage })
          return
        }

        const { uploadUrl, mediaId, storagePath } = (await initRes.json()) as {
          uploadUrl: string
          mediaId: string
          storagePath: string
          order: number
        }

        updateUpload(tempId, { mediaId })

        // Step 2: PUT to Supabase Storage signed URL
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!uploadRes.ok) {
          updateUpload(tempId, { status: 'error', errorMessage: 'Storage upload failed' })
          return
        }

        updateUpload(tempId, { progress: 90 })

        // Step 3: Confirm upload
        const confirmRes = await fetch(`/api/listings/${listingId}/media/${mediaId}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath }),
        })

        if (!confirmRes.ok) {
          updateUpload(tempId, { status: 'error', errorMessage: 'Failed to confirm upload' })
          return
        }

        const { url, thumb } = (await confirmRes.json()) as { url: string; thumb: string }

        updateUpload(tempId, { status: 'success', progress: 100, url, thumb })

        // Add to form media list
        const currentFormMedia = watch('media') ?? []
        setValue(
          'media',
          [
            ...currentFormMedia,
            { mediaId, url, thumb, order: currentFormMedia.length },
          ],
          { shouldValidate: true },
        )
      } catch {
        updateUpload(tempId, { status: 'error', errorMessage: 'Network error — try again' })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listingId, uploads],
  )

  const handleFiles = (files: File[]) => {
    const currentTotal = media.length + uploads.filter((u) => u.status !== 'error').length
    const remaining = MAX_PHOTOS - currentTotal

    files.slice(0, remaining).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) return
      if (file.size > MAX_SIZE_BYTES) return
      void uploadFile(file)
    })
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handleRemove = async (mediaId: string) => {
    if (!listingId) return
    await fetch(`/api/listings/${listingId}/media/${mediaId}`, { method: 'DELETE' })
    const updated = media.filter((m) => m.mediaId !== mediaId).map((m, i) => ({ ...m, order: i }))
    setValue('media', updated, { shouldValidate: true })
    setUploads((prev) => prev.filter((u) => u.mediaId !== mediaId))
  }

  const handleRetry = (upload: UploadFile) => {
    setUploads((prev) => prev.filter((u) => u.tempId !== upload.tempId))
    void uploadFile(upload.file)
  }

  const moveMedia = (index: number, direction: 'up' | 'down') => {
    const newMedia = [...media]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newMedia.length) return
    ;[newMedia[index], newMedia[targetIndex]] = [newMedia[targetIndex], newMedia[index]]
    setValue(
      'media',
      newMedia.map((m, i) => ({ ...m, order: i })),
      { shouldValidate: true },
    )
  }

  // Drag-and-drop reorder
  const dragIndexRef = useRef<number | null>(null)

  const handleThumbDragStart = (index: number) => {
    dragIndexRef.current = index
  }

  const handleThumbDrop = (index: number) => {
    if (dragIndexRef.current == null || dragIndexRef.current === index) return
    const newMedia = [...media]
    const [moved] = newMedia.splice(dragIndexRef.current, 1)
    newMedia.splice(index, 0, moved)
    setValue(
      'media',
      newMedia.map((m, i) => ({ ...m, order: i })),
      { shouldValidate: true },
    )
    dragIndexRef.current = null
  }

  const pendingUploads = uploads.filter((u) => u.status === 'uploading' || u.status === 'pending')
  const errorUploads = uploads.filter((u) => u.status === 'error')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900" tabIndex={-1}>
          Add photos
        </h2>
        <p className="text-gray-500 mt-1">
          The first photo will be the cover. Drag to reorder.
        </p>
      </div>

      {/* Dropzone */}
      {!listingId ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
          <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-gray-500">Complete step 1 to enable photo upload</p>
        </div>
      ) : (
        <div
          role="region"
          aria-label="Photo upload drop zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-primary bg-white',
            errors.media ? 'border-red-400' : '',
          )}
        >
          <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-gray-700 mb-1">
            Drag photos here or click to choose
          </p>
          <p className="text-xs text-gray-400">
            JPG, PNG or WebP · max 10 MB per file · up to {MAX_PHOTOS} photos
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handleFileInput}
            aria-label="Choose photos"
          />
        </div>
      )}

      {errors.media && (
        <p role="alert" className="text-sm text-red-600">
          {errors.media.message ?? 'Please add at least 1 photo'}
        </p>
      )}

      {/* In-progress uploads */}
      {pendingUploads.length > 0 && (
        <div className="space-y-2">
          {pendingUploads.map((upload) => (
            <div key={upload.tempId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-gray-700 truncate flex-1">{upload.file.name}</span>
              <div
                className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={upload.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Uploading ${upload.file.name}`}
              >
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error uploads */}
      {errorUploads.length > 0 && (
        <div className="space-y-2">
          {errorUploads.map((upload) => (
            <div
              key={upload.tempId}
              className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-red-700 flex-1 truncate">
                {upload.file.name} — {upload.errorMessage ?? 'Failed'}
              </span>
              <button
                type="button"
                onClick={() => handleRetry(upload)}
                className="text-xs text-primary underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                Retry
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Photo grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {media.map((item, index) => (
            <div
              key={item.mediaId}
              draggable
              onDragStart={() => handleThumbDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleThumbDrop(index)}
              className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 group cursor-grab active:cursor-grabbing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumb ?? item.url}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Cover badge */}
              {index === 0 && (
                <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-0.5 rounded font-medium">
                  Cover
                </span>
              )}

              {/* Controls overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => moveMedia(index, 'up')}
                  disabled={index === 0}
                  aria-label={`Move photo ${index + 1} up`}
                  className="p-1.5 bg-white/90 rounded-full text-gray-800 disabled:opacity-40 hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <MoveUp className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => moveMedia(index, 'down')}
                  disabled={index === media.length - 1}
                  aria-label={`Move photo ${index + 1} down`}
                  className="p-1.5 bg-white/90 rounded-full text-gray-800 disabled:opacity-40 hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <MoveDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemove(item.mediaId)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="p-1.5 bg-white/90 rounded-full text-red-600 hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Optional links */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">Optional media</h3>
        <div>
          <label htmlFor="videoUrl" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Video URL <span className="text-gray-400 font-normal">(YouTube / Vimeo)</span>
          </label>
          <input
            id="videoUrl"
            type="url"
            {...useFormContext<WizardFormData>().register('videoUrl')}
            placeholder="https://youtube.com/watch?v=..."
            className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="tour360Url" className="text-sm font-medium text-gray-700 mb-1.5 block">
            360° tour URL
          </label>
          <input
            id="tour360Url"
            type="url"
            {...useFormContext<WizardFormData>().register('tour360Url')}
            placeholder="https://..."
            className="h-11 w-full border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  )
}
