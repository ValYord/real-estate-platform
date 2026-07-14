'use client'

import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { rejectSchema } from '@/lib/admin/schemas'
import type { RejectReason } from '@/lib/admin/types'

const REASON_OPTIONS: { value: RejectReason; label: string }[] = [
  { value: 'bad_photos', label: 'Bad photos' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'suspicious_price', label: 'Suspicious price' },
  { value: 'rule_violation', label: 'Rule violation' },
  { value: 'other', label: 'Other' },
]

interface RejectReasonModalProps {
  title: string
  onConfirm: (reason: RejectReason, note: string) => void
  onCancel: () => void
  isSubmitting?: boolean
}

/**
 * Forked from DeleteConfirmModal.tsx's shell (D8 in the design handoff):
 * overlay + centered role="dialog" card, Cancel is focused (not Confirm),
 * Escape/backdrop-close — with the body swapped for a required reason
 * <select> (rejectSchema enum) + optional note <textarea>, and the icon
 * tint swapped from red to amber (rejecting is corrective, not a delete).
 */
export default function RejectReasonModal({ title, onConfirm, onCancel, isSubmitting = false }: RejectReasonModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [reason, setReason] = useState<RejectReason | ''>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === overlayRef.current) onCancel()
  }

  const handleSubmit = () => {
    const parsed = rejectSchema.safeParse({ reason: reason || undefined, note: note || undefined })
    if (!parsed.success) {
      setError('Select a reason')
      return
    }
    setError(null)
    onConfirm(parsed.data.reason, parsed.data.note ?? '')
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
        aria-describedby="reject-modal-desc"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle aria-hidden="true" className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 id="reject-modal-title" className="text-base font-semibold text-gray-900">
              Reject listing?
            </h2>
            <p id="reject-modal-desc" className="text-sm text-gray-600 mt-0.5">
              &ldquo;{title}&rdquo; will be rejected. Select a reason for the record.
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

        <div className="space-y-3 mb-5">
          <div>
            <label htmlFor="reject-reason" className="block text-xs font-medium text-gray-700 mb-1">
              Reason
            </label>
            <select
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as RejectReason)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">Select a reason</option>
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>
          <div>
            <label htmlFor="reject-note" className="block text-xs font-medium text-gray-700 mb-1">
              Note (optional)
            </label>
            <textarea
              id="reject-note"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
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
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg text-white',
              'bg-red-600 hover:bg-red-700 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600',
              'min-h-[44px]',
              (isSubmitting || !reason) && 'opacity-60 cursor-not-allowed',
            )}
          >
            {isSubmitting ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}
