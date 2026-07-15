'use client'

import { useEffect, useRef, useState } from 'react'
import { Star, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { agentReviewSchema } from '@/lib/agent/schemas'

interface WriteReviewModalProps {
  agentId: string
  onClose: () => void
  onPublished: () => void
}

const TEXT_MIN = 10
const TEXT_MAX = 1000

/**
 * "Write a review" modal — star rating (radiogroup) + textarea → POST
 * /api/agents/[slug]/reviews. docs/en/pages/10-agent-profile.md §3.6.
 */
export default function WriteReviewModal({ agentId, onClose, onPublished }: WriteReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const parsed = agentReviewSchema.safeParse({ rating, text })
  const canSubmit = parsed.success && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, text }),
      })

      if (res.status === 401) {
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/auth/login?next=${next}`
        return
      }
      if (res.status === 201) {
        onPublished()
        return
      }
      if (res.status === 409) {
        setError("You've already written a review for this agent.")
        return
      }
      if (res.status === 422) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setError(
          body.error === 'self_review_forbidden'
            ? 'You cannot review your own profile.'
            : 'Please check your review and try again.',
        )
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
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="write-review-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="write-review-title" className="text-base font-semibold text-gray-900">
            Write a review
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} stars`}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
                className="p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                <Star
                  className="w-7 h-7 text-amber-500"
                  fill={n <= (hoverRating || rating) ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>

          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={TEXT_MAX}
              placeholder="Share details of your experience with this agent"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {text.length}/{TEXT_MAX} (min {TEXT_MIN})
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors flex items-center justify-center gap-2',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]',
              !canSubmit && 'opacity-60 cursor-not-allowed',
            )}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Publish
          </button>
        </div>
      </div>
    </div>
  )
}
