import { create } from 'zustand'

export type Currency = 'AMD' | 'RUB' | 'USD' | 'EUR'

interface CurrencyState {
  currency: Currency
  setCurrency: (currency: Currency) => void
}

/**
 * Global currency preference.
 * UI-only in this iteration — no live exchange-rate conversion.
 * Persists within the browser session (in-memory Zustand store).
 */
export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: 'AMD',
  setCurrency: (currency) => set({ currency }),
}))
