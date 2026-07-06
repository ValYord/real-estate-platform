'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import FavoriteCard from './FavoriteCard'
import EmptyFavorites from './EmptyFavorites'
import type { FavoriteItem, FavoritesResponse, FavoriteSort } from '@/lib/favorites/types'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <li
      className="bg-gray-100 animate-pulse rounded-xl h-72"
      aria-hidden="true"
    />
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState {
  type: 'success' | 'error'
  message: string
  undoPropertyId?: string
}

// FavoritesGrid reads the sort from the URL via useSearchParams() directly.
// The component has no required props — sort is URL-driven.

async function fetchFavoritesPage(
  sort: FavoriteSort,
  page: number,
): Promise<FavoritesResponse> {
  const params = new URLSearchParams({ sort, page: String(page) })
  const res = await fetch(`/api/favorites?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Favorites fetch failed: ${res.status}`)
  }
  return res.json() as Promise<FavoritesResponse>
}

/**
 * Client-side favorites grid.
 *
 * - React Query infinite query keyed by sort param (URL-driven).
 * - Optimistic remove with 5-second undo toast.
 * - IntersectionObserver sentinel for infinite scroll.
 */
export default function FavoritesGrid() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const sort: FavoriteSort = (() => {
    const s = searchParams.get('sort')
    if (s === 'price_asc' || s === 'price_desc' || s === 'price_drop') return s
    return 'recent'
  })()

  // ── Local display state (optimistic remove + undo) ───────────────────────
  const [localItems, setLocalItems] = useState<FavoriteItem[]>([])
  const [fadingId, setFadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(5)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const undoCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const removedItemRef = useRef<{ item: FavoriteItem; position: number } | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ── React Query ───────────────────────────────────────────────────────────
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['favorites', sort],
    queryFn: ({ pageParam }) => fetchFavoritesPage(sort, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage: FavoritesResponse) => {
      const loaded = (lastPage.page - 1) * lastPage.pageSize + lastPage.items.length
      return loaded < lastPage.total ? lastPage.page + 1 : undefined
    },
    staleTime: 30_000,
  })

  // Sync React Query data into local display state (preserves optimistic removes)
  useEffect(() => {
    if (!data) return
    const allItems = data.pages.flatMap((p) => p.items)
    setLocalItems(allItems)
  }, [data])

  // ── IntersectionObserver sentinel ─────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // ── Undo countdown helpers ─────────────────────────────────────────────────
  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    if (undoCountdownRef.current) clearInterval(undoCountdownRef.current)
    undoTimerRef.current = null
    undoCountdownRef.current = null
  }, [])

  const startUndoTimer = useCallback(
    (propertyId: string) => {
      clearUndo()
      setUndoSecondsLeft(5)

      undoCountdownRef.current = setInterval(() => {
        setUndoSecondsLeft((s) => {
          const next = s - 1
          if (next <= 0) {
            clearUndo()
          }
          return next
        })
      }, 1000)

      undoTimerRef.current = setTimeout(() => {
        clearUndo()
        setToast(null)
        removedItemRef.current = null
      }, 5000)

      setToast({ type: 'success', message: 'Removed from favorites', undoPropertyId: propertyId })
    },
    [clearUndo],
  )

  // ── Remove handler ─────────────────────────────────────────────────────────
  const handleRemove = useCallback(
    async (propertyId: string) => {
      const position = localItems.findIndex((i) => i.propertyId === propertyId)
      const item = localItems[position]
      if (!item) return

      // Step 1: Optimistic fade-out
      setFadingId(propertyId)

      // After animation, remove from list
      const fadeTimeout = setTimeout(() => {
        setFadingId(null)
        setLocalItems((prev) => prev.filter((i) => i.propertyId !== propertyId))
      }, 200)

      // Save for undo
      removedItemRef.current = { item, position }

      // Step 2: Start undo countdown
      startUndoTimer(propertyId)

      // Step 3: Fire DELETE
      try {
        const res = await fetch(`/api/favorites/${propertyId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`)

        // Invalidate shared caches
        await queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
        await queryClient.invalidateQueries({ queryKey: ['favorites-count'] })
      } catch {
        // Rollback
        clearTimeout(fadeTimeout)
        clearUndo()
        setFadingId(null)
        setToast({ type: 'error', message: 'Something went wrong, please try again' })
        // Restore item to its original position
        setLocalItems((prev) => {
          const updated = [...prev]
          if (removedItemRef.current) {
            const idx = Math.min(removedItemRef.current.position, updated.length)
            updated.splice(idx, 0, removedItemRef.current.item)
          }
          removedItemRef.current = null
          return updated
        })
      }
    },
    [localItems, queryClient, startUndoTimer, clearUndo],
  )

  // ── Undo handler ──────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (!removedItemRef.current) return

    const { item, position } = removedItemRef.current
    removedItemRef.current = null

    clearUndo()
    setToast(null)

    // Restore item to original position
    setLocalItems((prev) => {
      const updated = [...prev]
      const idx = Math.min(position, updated.length)
      updated.splice(idx, 0, item)
      return updated
    })

    // Persist the restore via POST
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: item.propertyId }),
      })
      if (!res.ok) throw new Error(`Restore failed: ${res.status}`)

      await queryClient.invalidateQueries({ queryKey: ['favorites-count'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
    } catch {
      // Silently re-remove if POST fails
      setLocalItems((prev) => prev.filter((i) => i.propertyId !== item.propertyId))
    }
  }, [queryClient, clearUndo])

  // Cleanup on unmount
  useEffect(() => () => clearUndo(), [clearUndo])

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ul
        aria-label="Favorites grid loading"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </ul>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <p className="text-gray-500 text-sm">Something went wrong</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Try again
        </button>
      </div>
    )
  }

  const totalCount = data?.pages[0]?.total ?? 0

  if (localItems.length === 0 && !isFetchingNextPage) {
    return <EmptyFavorites />
  }

  return (
    <>
      {/* Grid */}
      <ul
        aria-label={`Favorites grid — ${totalCount} ${totalCount === 1 ? 'property' : 'properties'}`}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {localItems.map((item) => (
          <FavoriteCard
            key={item.propertyId}
            item={item}
            isFading={fadingId === item.propertyId}
            onRemove={handleRemove}
          />
        ))}
      </ul>

      {/* Infinite scroll sentinel */}
      {hasNextPage && (
        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
      )}

      {/* Loading more spinner */}
      {isFetchingNextPage && (
        <div
          role="status"
          aria-label="Loading more favorites"
          className="flex justify-center py-6"
        >
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
            'max-w-sm w-full mx-4',
            toast.type === 'success'
              ? 'bg-gray-900 text-white'
              : 'bg-red-600 text-white',
          )}
        >
          <span className="flex-1">{toast.message}</span>

          {toast.type === 'success' && toast.undoPropertyId && (
            <button
              type="button"
              onClick={() => void handleUndo()}
              className="text-xs font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded shrink-0"
            >
              Undo ({undoSecondsLeft}s)
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              clearUndo()
              setToast(null)
              removedItemRef.current = null
            }}
            aria-label="Dismiss notification"
            className="shrink-0 text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  )
}
