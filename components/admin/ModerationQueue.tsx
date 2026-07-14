'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import ModerationRow from './ModerationRow'
import ListingPreviewDrawer from './ListingPreviewDrawer'
import RejectReasonModal from './RejectReasonModal'
import { getListingTitle } from '@/lib/admin/format'
import type { ModerationListItem, ModerationListResponse, RejectReason } from '@/lib/admin/types'

const QUEUE_KEY = ['admin-moderation-queue']

/** Thrown by the mutationFns on a 409 so onError can branch to the neutral toast (§4.5). */
class AlreadyModeratedError extends Error {}

async function fetchQueue(): Promise<ModerationListResponse> {
  const res = await fetch('/api/admin/moderation')
  if (!res.ok) throw new Error('Failed to fetch moderation queue')
  return res.json() as Promise<ModerationListResponse>
}

async function approveListing(id: string): Promise<void> {
  const res = await fetch(`/api/admin/listings/${id}/approve`, { method: 'POST' })
  if (res.status === 409) throw new AlreadyModeratedError()
  if (!res.ok) throw new Error('Failed to approve listing')
}

async function rejectListing(id: string, reason: RejectReason, note: string): Promise<void> {
  const res = await fetch(`/api/admin/listings/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, note: note || undefined }),
  })
  if (res.status === 409) throw new AlreadyModeratedError()
  if (!res.ok) throw new Error('Failed to reject listing')
}

interface ToastState {
  message: string
  tone: 'success' | 'neutral'
}

export default function ModerationQueue({ initialItems }: { initialItems: ModerationListItem[] }) {
  const queryClient = useQueryClient()
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const showToast = (message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ message, tone })
    setTimeout(() => setToast(null), 4000)
  }

  const { data, isLoading, isError, refetch } = useQuery<ModerationListResponse>({
    queryKey: QUEUE_KEY,
    queryFn: fetchQueue,
    initialData: { items: initialItems },
  })

  const removeFromCache = (id: string) => {
    queryClient.setQueryData<ModerationListResponse>(QUEUE_KEY, (old) =>
      old ? { items: old.items.filter((item) => item.id !== id) } : old,
    )
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
  }

  const handleAlreadyModerated = (id: string) => {
    // Refetch instead of trusting the local cache — the row was moderated by
    // someone/something else, so the list may have changed in other ways too.
    queryClient.invalidateQueries({ queryKey: QUEUE_KEY })
    if (previewId === id) setPreviewId(null)
    if (rejectTargetId === id) setRejectTargetId(null)
    showToast('Already reviewed by another admin.', 'neutral')
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveListing(id),
    onMutate: (id: string) => setBusyId(id),
    onSuccess: (_result, id) => {
      removeFromCache(id)
      if (previewId === id) setPreviewId(null)
      showToast('Approved — the listing is now live.')
    },
    onError: (err: Error, id: string) => {
      if (err instanceof AlreadyModeratedError) {
        handleAlreadyModerated(id)
        return
      }
      showToast('Failed to approve, please try again', 'neutral')
    },
    onSettled: () => setBusyId(null),
  })

  type RejectVariables = { id: string; reason: RejectReason; note: string }

  const rejectMutation = useMutation<void, Error, RejectVariables>({
    mutationFn: ({ id, reason, note }) => rejectListing(id, reason, note),
    onMutate: ({ id }) => setBusyId(id),
    onSuccess: (_result, { id }) => {
      removeFromCache(id)
      if (previewId === id) setPreviewId(null)
      setRejectTargetId(null)
      showToast('Rejected — the reason was recorded.')
    },
    onError: (err, { id }) => {
      if (err instanceof AlreadyModeratedError) {
        handleAlreadyModerated(id)
        return
      }
      showToast('Failed to reject, please try again', 'neutral')
    },
    onSettled: () => setBusyId(null),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500 mb-2">Failed to load moderation queue</p>
        <button
          onClick={() => refetch()}
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Retry
        </button>
      </div>
    )
  }

  const items = data.items
  const previewListing = items.find((item) => item.id === previewId) ?? null
  const rejectListingItem = items.find((item) => item.id === rejectTargetId) ?? null

  return (
    <div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 text-center px-6 py-16">
          <span className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded-full">
            <ShieldCheck className="w-8 h-8 text-gray-300" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="text-base font-medium text-gray-900">Nothing waiting for moderation</p>
            <p className="text-sm text-gray-500">New listings will show up here for review.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th scope="col" className="text-left font-medium px-3 py-2 w-20">Cover</th>
                  <th scope="col" className="text-left font-medium px-3 py-2">Title</th>
                  <th scope="col" className="text-left font-medium px-3 py-2">Owner</th>
                  <th scope="col" className="text-left font-medium px-3 py-2">Price</th>
                  <th scope="col" className="text-left font-medium px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((listing) => (
                  <ModerationRow
                    key={listing.id}
                    listing={listing}
                    variant="row"
                    busy={busyId === listing.id}
                    onOpen={() => setPreviewId(listing.id)}
                    onApprove={() => approveMutation.mutate(listing.id)}
                    onReject={() => setRejectTargetId(listing.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="lg:hidden space-y-3">
            {items.map((listing) => (
              <ModerationRow
                key={listing.id}
                listing={listing}
                variant="card"
                busy={busyId === listing.id}
                onOpen={() => setPreviewId(listing.id)}
                onApprove={() => approveMutation.mutate(listing.id)}
                onReject={() => setRejectTargetId(listing.id)}
              />
            ))}
          </div>
        </>
      )}

      {previewListing && (
        <ListingPreviewDrawer
          listing={previewListing}
          busy={busyId === previewListing.id}
          onClose={() => setPreviewId(null)}
          onApprove={() => approveMutation.mutate(previewListing.id)}
          onReject={() => setRejectTargetId(previewListing.id)}
        />
      )}

      {rejectListingItem && (
        <RejectReasonModal
          title={getListingTitle(rejectListingItem.title)}
          isSubmitting={rejectMutation.isPending}
          onCancel={() => setRejectTargetId(null)}
          onConfirm={(reason, note) => rejectMutation.mutate({ id: rejectListingItem.id, reason, note })}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={
            toast.tone === 'success'
              ? 'fixed bottom-4 right-4 z-50 bg-green-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg'
              : 'fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg'
          }
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
