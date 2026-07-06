'use client'

import { useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@/i18n/navigation'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import ListingRow from './ListingRow'
import DeleteConfirmModal from './DeleteConfirmModal'
import StatsModal from './StatsModal'
import type { ListingSummary, MyListingStatus, MyListingsResponse } from '@/lib/dashboard/types'

const TABS: { label: string; value: MyListingStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Archived', value: 'archived' },
]

const EMPTY_MESSAGES: Record<MyListingStatus, { text: string; showCTA: boolean }> = {
  active: { text: "You don't have any active listings yet", showCTA: true },
  draft: { text: 'No drafts', showCTA: false },
  pending: { text: 'No pending listings', showCTA: false },
  archived: { text: 'Archive is empty', showCTA: false },
}

interface DeleteState {
  listingId: string
  listingTitle: string
}

interface StatsState {
  listingId: string
  listingTitle: string
}

async function toggleStatus(listingId: string, newStatus: 'active' | 'archived'): Promise<{ id: string; status: string }> {
  const res = await fetch(`/api/listings/${listingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  })
  if (!res.ok) throw new Error('Failed to update status')
  return res.json() as Promise<{ id: string; status: string }>
}

async function deleteListing(listingId: string): Promise<void> {
  const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete listing')
}

export default function MyListings() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()

  const activeTab = (searchParams.get('tab') as MyListingStatus) ?? 'active'
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null)
  const [statsState, setStatsState] = useState<StatsState | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }

  const queryKey = ['my-listings', activeTab]

  const { data, isLoading, isError, refetch } = useQuery<MyListingsResponse>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/listings/mine?status=${activeTab}`)
      if (!res.ok) throw new Error('Failed to fetch listings')
      return res.json() as Promise<MyListingsResponse>
    },
  })

  // Optimistic status toggle
  const toggleMutation = useMutation({
    mutationFn: ({ listingId, newStatus }: { listingId: string; newStatus: 'active' | 'archived' }) =>
      toggleStatus(listingId, newStatus),
    onMutate: async ({ listingId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<MyListingsResponse>(queryKey)
      queryClient.setQueryData<MyListingsResponse>(queryKey, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === listingId ? { ...item, status: newStatus } : item,
          ),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      showToast('Failed to update status, please try again')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (listingId: string) => deleteListing(listingId),
    onSuccess: () => {
      setDeleteState(null)
      queryClient.invalidateQueries({ queryKey: ['my-listings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
      showToast('Listing deleted')
    },
    onError: () => {
      showToast('Failed to delete listing, please try again')
    },
  })

  const handleTabChange = (tab: MyListingStatus) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/dashboard/listings?${params.toString()}`)
  }

  const handleEdit = useCallback((listingId: string) => {
    router.push(`/listing/${listingId}/edit` as Parameters<typeof router.push>[0])
  }, [router])

  const handleToggleStatus = useCallback((listing: ListingSummary) => {
    const newStatus = listing.status === 'active' ? 'archived' : 'active'
    toggleMutation.mutate({ listingId: listing.id, newStatus })
  }, [toggleMutation])

  const handleStats = useCallback((listing: ListingSummary) => {
    const title = listing.title.en ?? listing.title.hy ?? listing.title.ru ?? 'Listing'
    setStatsState({ listingId: listing.id, listingTitle: title })
  }, [])

  const handleDelete = useCallback((listing: ListingSummary) => {
    const title = listing.title.en ?? listing.title.hy ?? listing.title.ru ?? 'Listing'
    setDeleteState({ listingId: listing.id, listingTitle: title })
  }, [])

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg"
        >
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200 mb-4 overflow-x-auto" role="tablist" aria-label="Listing status filter">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-lg',
              activeTab === tab.value
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 mb-2">Failed to load listings</p>
          <button
            onClick={() => refetch()}
            className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Retry
          </button>
        </div>
      )}

      {/* Listing rows */}
      {!isLoading && !isError && data && (
        <>
          {data.items.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500 mb-3">{EMPTY_MESSAGES[activeTab].text}</p>
              {EMPTY_MESSAGES[activeTab].showCTA && (
                <Link
                  href="/sell/new"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Plus aria-hidden="true" className="w-4 h-4" />
                  Add listing
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {data.items.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  onEdit={() => handleEdit(listing.id)}
                  onToggleStatus={() => handleToggleStatus(listing)}
                  onStats={() => handleStats(listing)}
                  onDelete={() => handleDelete(listing)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete confirm modal */}
      {deleteState && (
        <DeleteConfirmModal
          title={deleteState.listingTitle}
          onConfirm={() => deleteMutation.mutate(deleteState.listingId)}
          onCancel={() => setDeleteState(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* Stats modal */}
      {statsState && (
        <StatsModal
          listingId={statsState.listingId}
          listingTitle={statsState.listingTitle}
          onClose={() => setStatsState(null)}
        />
      )}
    </div>
  )
}
