'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UnsavedChangesModalProps {
  onSave: () => void
  onDontSave: () => void
  onStay: () => void
}

/**
 * "You have unsaved changes. Save?" confirm dialog (§3.1 / §4 "Unsaved leave"
 * state). Shown when navigating away from a dirty Profile/Account form.
 */
export default function UnsavedChangesModal({
  onSave,
  onDontSave,
  onStay,
}: UnsavedChangesModalProps) {
  const stayRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    stayRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onStay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStay])

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-modal-title"
        aria-describedby="unsaved-modal-desc"
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle aria-hidden="true" className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h2 id="unsaved-modal-title" className="text-base font-semibold text-gray-900">
              You have unsaved changes
            </h2>
            <p id="unsaved-modal-desc" className="text-sm text-gray-600 mt-0.5">
              Save your changes before leaving this page?
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onSave}
            className="bg-primary text-white h-11 rounded-lg px-4 font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Save
          </button>
          <button
            onClick={onDontSave}
            className="border border-gray-300 h-11 rounded-lg px-4 font-medium text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Don&apos;t save
          </button>
          <button
            ref={stayRef}
            onClick={onStay}
            className={cn(
              'h-11 rounded-lg px-4 font-medium text-gray-500 hover:bg-gray-50 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            Stay
          </button>
        </div>
      </div>
    </div>
  )
}
