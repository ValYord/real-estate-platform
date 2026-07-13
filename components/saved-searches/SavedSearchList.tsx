'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from '@/i18n/navigation'
import { filtersToParams } from '@/lib/search/filtersSchema'
import type { Filters } from '@/lib/search/filtersSchema'
import SavedSearchCard from './SavedSearchCard'
import EmptySavedSearches from './EmptySavedSearches'
import type { AlertFrequency, SavedSearchItem, SavedSearchesResponse } from '@/lib/saved-searches/types'

interface ToastState {
  type: 'success' | 'error'
  message: string
  undoId?: string
}

async function fetchSavedSearches(): Promise<SavedSearchesResponse> {
  const res = await fetch('/api/saved-searches')
  if (!res.ok) throw new Error(`Saved searches fetch failed: ${res.status}`)
  return res.json() as Promise<SavedSearchesResponse>
}

function SkeletonCard() {
  return <li className="bg-gray-100 animate-pulse rounded-xl h-32 list-none" aria-hidden="true" />
}

/**
 * Client-side saved-searches list. Mirrors `components/favorites/FavoritesGrid.tsx`'s
 * architecture: React Query fetch, local `localItems` state for optimistic
 * frequency-changes and deletes, 5-second undo toast on delete.
 */
export default function SavedSearchList() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [localItems, setLocalItems] = useState<SavedSearchItem[]>([])
  const [fadingId, setFadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(5)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const undoCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const removedItemRef = useRef<{ item: SavedSearchItem; position: number } | null>(null)
  const previousFrequencyRef = useRef<Map<string, AlertFrequency>>(new Map())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: fetchSavedSearches,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!data) return
    setLocalItems(data.items)
  }, [data])

  // ── Undo countdown helpers ─────────────────────────────────────────────────
  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    if (undoCountdownRef.current) clearInterval(undoCountdownRef.current)
    undoTimerRef.current = null
    undoCountdownRef.current = null
  }, [])

  const startUndoTimer = useCallback(
    (id: string) => {
      clearUndo()
      setUndoSecondsLeft(5)

      undoCountdownRef.current = setInterval(() => {
        setUndoSecondsLeft((s) => {
          const next = s - 1
          if (next <= 0) clearUndo()
          return next
        })
      }, 1000)

      undoTimerRef.current = setTimeout(() => {
        clearUndo()
        setToast(null)
        removedItemRef.current = null
      }, 5000)

      setToast({ type: 'success', message: 'Saved search deleted', undoId: id })
    },
    [clearUndo],
  )

  useEffect(() => () => clearUndo(), [clearUndo])

  // ── Frequency change (optimistic, rollback on failure) ─────────────────────
  const handleFrequencyChange = useCallback(
    (id: string, next: AlertFrequency) => {
      const current = localItems.find((i) => i.id === id)
      if (!current || current.alertFrequency === next) return

      previousFrequencyRef.current.set(id, current.alertFrequency)
      setLocalItems((prev) => prev.map((i) => (i.id === id ? { ...i, alertFrequency: next } : i)))

      fetch(`/api/saved-searches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertFrequency: next }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Frequency update failed: ${res.status}`)
          setToast({ type: 'success', message: 'Notification updated' })
        })
        .catch(() => {
          const prev = previousFrequencyRef.current.get(id)
          setLocalItems((items) =>
            items.map((i) => (i.id === id ? { ...i, alertFrequency: prev ?? i.alertFrequency } : i)),
          )
          setToast({ type: 'error', message: 'Something went wrong, please try again' })
        })
        .finally(() => {
          previousFrequencyRef.current.delete(id)
        })
    },
    [localItems],
  )

  // ── Open search (navigate + reset new_match_count) ─────────────────────────
  const handleOpen = useCallback(
    (search: SavedSearchItem) => {
      const params = filtersToParams(search.filters)
      router.push(`/search?${params.toString()}` as Parameters<typeof router.push>[0])

      setLocalItems((prev) => prev.map((i) => (i.id === search.id ? { ...i, newMatchCount: 0 } : i)))

      // Fire-and-forget — no loading UI needed, matches the design spec.
      void fetch(`/api/saved-searches/${search.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newMatchCount: 0 }),
      })
    },
    [router],
  )

  // ── Rename / Edit filters ────────────────────────────────────────────────
  const persistPatch = useCallback(
    async (id: string, patch: Record<string, unknown>, optimistic: Partial<SavedSearchItem>) => {
      setLocalItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...optimistic } : i)))
      try {
        const res = await fetch(`/api/saved-searches/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (!res.ok) throw new Error(`Update failed: ${res.status}`)
      } catch {
        setToast({ type: 'error', message: 'Something went wrong, please try again' })
        void refetch()
      }
    },
    [refetch],
  )

  const handleRenameSave = useCallback(
    (id: string, name: string) => {
      void persistPatch(id, { name }, { name })
    },
    [persistPatch],
  )

  const handleEditSave = useCallback(
    (id: string, filters: Filters) => {
      void persistPatch(id, { filters }, { filters })
    },
    [persistPatch],
  )

  // ── Delete + undo ────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => {
      const position = localItems.findIndex((i) => i.id === id)
      const item = localItems[position]
      if (!item) return

      setFadingId(id)
      const fadeTimeout = setTimeout(() => {
        setFadingId(null)
        setLocalItems((prev) => prev.filter((i) => i.id !== id))
      }, 200)

      removedItemRef.current = { item, position }
      startUndoTimer(id)

      try {
        const res = await fetch(`/api/saved-searches/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      } catch {
        clearTimeout(fadeTimeout)
        clearUndo()
        setFadingId(null)
        setToast({ type: 'error', message: 'Something went wrong, please try again' })
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
    [localItems, startUndoTimer, clearUndo],
  )

  const handleUndo = useCallback(async () => {
    if (!removedItemRef.current) return

    const { item, position } = removedItemRef.current
    removedItemRef.current = null

    clearUndo()
    setToast(null)

    setLocalItems((prev) => {
      const updated = [...prev]
      const idx = Math.min(position, updated.length)
      updated.splice(idx, 0, item)
      return updated
    })

    // The original row was already hard-deleted — undo re-POSTs to create a
    // new row/id. This is acceptable (matches the Favorites undo pattern);
    // there is no longer a row with that filters hash for this user, so the
    // dedupe unique index does not block the recreate.
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          filters: item.filters,
          alertFrequency: item.alertFrequency,
        }),
      })
      if (!res.ok) throw new Error(`Restore failed: ${res.status}`)
      const restored = (await res.json()) as { id: string }
      setLocalItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, id: restored.id } : i)))
      await queryClient.invalidateQueries({ queryKey: ['saved-searches'] })
    } catch {
      setLocalItems((prev) => prev.filter((i) => i.id !== item.id))
    }
  }, [queryClient, clearUndo])

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <ul aria-label="Loading saved searches" className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
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

  if (localItems.length === 0) {
    return <EmptySavedSearches />
  }

  return (
    <>
      <ul aria-label={`Saved searches — ${localItems.length}`} className="space-y-4">
        {localItems.map((item) => (
          <SavedSearchCard
            key={item.id}
            search={item}
            isFading={fadingId === item.id}
            onFrequencyChange={handleFrequencyChange}
            onOpen={handleOpen}
            onEditSave={handleEditSave}
            onRenameSave={handleRenameSave}
            onDelete={(id) => void handleDelete(id)}
          />
        ))}
      </ul>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
            'max-w-sm w-full mx-4',
            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white',
          )}
        >
          <span className="flex-1">{toast.message}</span>

          {toast.type === 'success' && toast.undoId && (
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
