'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RenameModalProps {
  currentName: string
  onSave: (name: string) => void
  onCancel: () => void
  isSaving?: boolean
}

const NAME_MAX_LENGTH = 60

/**
 * "Aa Rename" modal — same chrome as `DeleteConfirmModal` (overlay,
 * role="dialog", focus-trap-lite, Escape/backdrop-click closes).
 */
export default function RenameModal({ currentName, onSave, onCancel, isSaving = false }: RenameModalProps) {
  const [name, setName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel()
  }

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= NAME_MAX_LENGTH && !isSaving

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-modal-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="rename-modal-title" className="text-base font-semibold text-gray-900">
            Rename saved search
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <label htmlFor="rename-input" className="text-xs text-gray-500 mb-1 block">
          Name
        </label>
        <input
          ref={inputRef}
          id="rename-input"
          type="text"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSave) onSave(trimmed)
          }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-4"
        />

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(trimmed)}
            disabled={!canSave}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]',
              !canSave && 'opacity-60 cursor-not-allowed',
            )}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
