import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MAX_COMPARE } from '@/lib/compare/schemas'

interface CompareState {
  ids: string[]
  /** Adds the id if under the cap and not already selected; removes it if already selected. No-op past MAX_COMPARE. */
  toggle: (id: string) => void
  remove: (id: string) => void
  clear: () => void
  setIds: (ids: string[]) => void
}

/**
 * Client-side comparison selection.
 *
 * Persisted to localStorage so the "Compare (n)" bar survives navigation and
 * page reloads within search. The `/compare` route itself is the source of
 * truth on direct navigation (a shared link overwrites this via `setIds`).
 */
export const useCompareStore = create<CompareState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((s) => {
          if (s.ids.includes(id)) return { ids: s.ids.filter((x) => x !== id) }
          if (s.ids.length >= MAX_COMPARE) return s
          return { ids: [...s.ids, id] }
        }),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      clear: () => set({ ids: [] }),
      setIds: (ids) => set({ ids: ids.slice(0, MAX_COMPARE) }),
    }),
    { name: 're-compare-ids' },
  ),
)
