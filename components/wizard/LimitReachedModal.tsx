'use client'

import { X } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useEffect, useRef } from 'react'

interface LimitReachedModalProps {
  limit: number
  active: number
  onClose: () => void
}

/**
 * Modal shown when the user has hit the active-listing limit.
 */
export default function LimitReachedModal({
  limit,
  active,
  onClose,
}: LimitReachedModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap: move focus to close button on mount
  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-modal-title"
        aria-describedby="limit-modal-desc"
      >
        <div className="flex items-start justify-between mb-4">
          <h2
            id="limit-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            Listing limit reached
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p id="limit-modal-desc" className="text-sm text-gray-600 mb-6">
          You have reached the free-tier limit of{' '}
          <strong>{limit}</strong> active listings ({active}/{limit}).
          Deactivate an existing listing or upgrade to Pro to add more.
        </p>

        <div className="flex flex-col gap-2.5">
          <Link
            href="/dashboard"
            className="w-full h-11 flex items-center justify-center rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Manage listings
          </Link>
          <Link
            href="/pricing"
            className="w-full h-11 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            View Pro
          </Link>
        </div>
      </div>
    </div>
  )
}
