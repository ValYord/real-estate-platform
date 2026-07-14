import { create } from 'zustand'
import type { ProDateRange } from '@/lib/pro-dashboard/types'

interface ProDashboardState {
  range: ProDateRange
  setRange: (range: ProDateRange) => void
}

/**
 * Global date-range preference for the Pro Dashboard topbar (7d/30d/90d).
 * The topbar lives in the shared `<ProDashboardShell>` while Overview and
 * Analytics are separate routes that both need the current range — mirrors
 * `store/currencyStore.ts`'s "small global client UI state" pattern (handoff
 * D3) rather than prop-drilling or introducing React Context.
 */
export const useProDashboardStore = create<ProDashboardState>((set) => ({
  range: '30d',
  setRange: (range) => set({ range }),
}))
