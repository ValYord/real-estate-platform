'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportReviewModalProps {
  reviewId: string
  onClose: () => void
  onReported: () => void
}

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'abuse', label: 'Abuse' },
  { value: 'other', label: 'Other' },
] as const

/** ⚑ Report modal for a single review → POST /api/reports. */
export default function ReportReviewModal({ reviewId, onClose, onReported }: ReportReviewModalProps) {
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('spam')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'review', targetId: reviewId, reason, note: note || undefined }),
      })
      if (res.status === 401) {
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/auth/login?next=${next}`
        return
      }
      if (res.ok) {
        onReported()
        return
      }
      setError('Something went wrong, please try again.')
    } catch {
      setError('Something went wrong, please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-review-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="report-review-title" className="text-base font-semibold text-gray-900">
            Report review
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <fieldset className="space-y-1.5 mb-3">
          <legend className="text-xs text-gray-500 mb-1">Reason</legend>
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              {r.label}
            </label>
          ))}
        </fieldset>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Additional details (optional)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {error && <p role="alert" className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="flex gap-3 justify-end mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 min-h-[44px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
              submitting && 'opacity-60 cursor-not-allowed',
            )}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
