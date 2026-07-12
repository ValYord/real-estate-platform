'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Star, Flag } from 'lucide-react'
import WriteReviewModal from './WriteReviewModal'
import ReportReviewModal from './ReportReviewModal'
import type { AgentReviewsResponse, AgentReviewsSort } from '@/lib/agent/types'

interface AgentReviewsProps {
  agentId: string
  isOwner: boolean
}

const SORT_OPTIONS: { value: AgentReviewsSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'highest', label: 'Highest rating' },
  { value: 'lowest', label: 'Lowest rating' },
]

async function fetchReviews(agentId: string, sort: AgentReviewsSort, page: number): Promise<AgentReviewsResponse> {
  const params = new URLSearchParams({ sort, page: String(page) })
  const res = await fetch(`/api/agents/${agentId}/reviews?${params.toString()}`)
  if (!res.ok) throw new Error(`Reviews fetch failed: ${res.status}`)
  return res.json() as Promise<AgentReviewsResponse>
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Reviews section — summary + rating breakdown, review list, "Write a
 * review" modal, ⚑ Report. docs/en/pages/10-agent-profile.md §3.6.
 */
export default function AgentReviews({ agentId, isOwner }: AgentReviewsProps) {
  const [sort, setSort] = useState<AgentReviewsSort>('newest')
  const [page, setPage] = useState(1)
  const [showWriteModal, setShowWriteModal] = useState(false)
  const [reportTarget, setReportTarget] = useState<string | null>(null)
  const [justPublished, setJustPublished] = useState(false)
  const [justReported, setJustReported] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['agent-reviews', agentId, sort, page],
    queryFn: () => fetchReviews(agentId, sort, page),
  })

  const summary = data?.summary
  const maxCount = summary ? Math.max(1, ...Object.values(summary.breakdown)) : 1

  return (
    <section id="reviews" className="border-t border-gray-200 pt-6 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
        {!isOwner && (
          <button
            type="button"
            onClick={() => setShowWriteModal(true)}
            disabled={data?.viewerHasReviewed}
            className="text-sm font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {data?.viewerHasReviewed ? "You've reviewed this agent" : '✍️ Write a review'}
          </button>
        )}
      </div>

      {justPublished && (
        <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4">
          Thanks — your review was published.
        </p>
      )}
      {justReported && (
        <p role="status" className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 mb-4">
          Report received — our team will take a look.
        </p>
      )}

      {isLoading && <div className="bg-gray-100 animate-pulse rounded-lg h-24" />}
      {isError && <p className="text-sm text-gray-500">Failed to load reviews.</p>}

      {summary && summary.count === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm mb-3">No reviews yet — be the first</p>
        </div>
      )}

      {summary && summary.count > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          <div className="flex-shrink-0 text-center sm:text-left">
            <p className="text-3xl font-bold text-gray-900">{summary.average.toFixed(1)}</p>
            <p className="text-sm text-gray-500">{summary.count} reviews</p>
          </div>
          <div className="flex-1 space-y-1">
            {(['5', '4', '3', '2', '1'] as const).map((star) => {
              const count = summary.breakdown[star]
              const pct = Math.round((count / maxCount) * 100)
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3 flex items-center gap-0.5">
                    {star}
                    <Star className="w-3 h-3 text-amber-400" aria-hidden="true" />
                  </span>
                  <div
                    className="flex-1 bg-gray-200 h-2 rounded"
                    role="img"
                    aria-label={`${star} stars — ${count} reviews`}
                  >
                    <div className="bg-amber-400 h-2 rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sort */}
      {data && data.items.length > 0 && (
        <div className="flex justify-end mb-3">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as AgentReviewsSort)
              setPage(1)
            }}
            aria-label="Sort reviews"
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* List */}
      <ul className="space-y-5">
        {(data?.items ?? []).map((review) => (
          <li key={review.id} className="border-b border-gray-100 pb-5 last:border-0">
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500 flex-shrink-0"
                aria-hidden="true"
              >
                {review.authorName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="font-medium text-gray-900">{review.authorName}</span>
                    <span className="flex items-center gap-1 text-sm mt-0.5">
                      <span className="flex items-center gap-0.5" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className="w-3.5 h-3.5 text-amber-500"
                            fill={n <= review.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </span>
                      <span className="text-gray-400">{formatDate(review.createdAt)}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportTarget(review.id)}
                    aria-label="Report review"
                    className="text-gray-300 hover:text-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    <Flag className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-sm text-gray-700 mt-1.5">{review.text}</p>
                {review.reply && (
                  <div className="mt-3 bg-gray-50 border-l-2 border-primary pl-3 py-2 rounded-r">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Agent reply</p>
                    <p className="text-sm text-gray-700">{review.reply}</p>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {data && data.items.length > 0 && data.total > page * data.pageSize && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Show more
          </button>
        </div>
      )}

      {showWriteModal && (
        <WriteReviewModal
          agentId={agentId}
          onClose={() => setShowWriteModal(false)}
          onPublished={() => {
            setShowWriteModal(false)
            setJustPublished(true)
            setPage(1)
            void refetch()
          }}
        />
      )}

      {reportTarget && (
        <ReportReviewModal
          reviewId={reportTarget}
          onClose={() => setReportTarget(null)}
          onReported={() => {
            setReportTarget(null)
            setJustReported(true)
          }}
        />
      )}
    </section>
  )
}
