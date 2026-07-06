'use client'

import { useEffect, useRef } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeleteConfirmModalProps {
  title: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting?: boolean
}

export default function DeleteConfirmModal({
  title,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Focus cancel button (not the destructive button) on mount
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  // Close on backdrop click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      aria-hidden="false"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle aria-hidden="true" className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2
              id="delete-modal-title"
              className="text-base font-semibold text-gray-900"
            >
              Delete listing?
            </h2>
            <p id="delete-modal-desc" className="text-sm text-gray-600 mt-0.5">
              Are you sure you want to delete &ldquo;{title}&rdquo;? This is irreversible.
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="ml-auto p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700',
              'hover:bg-gray-50 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'min-h-[44px]',
            )}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg text-white',
              'bg-red-600 hover:bg-red-700 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600',
              'min-h-[44px]',
              isDeleting && 'opacity-60 cursor-not-allowed',
            )}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
