// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PriceTrendChart from '../components/neighborhood/PriceTrendChart'
import type { TrendsResponse } from '../lib/market/types'

// jsdom has no IntersectionObserver; framer-motion's `whileInView` (used by <FadeIn>) needs one.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

// jsdom has no ResizeObserver either; Recharts' <ResponsiveContainer> needs one.
class MockResizeObserver implements ResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

afterEach(cleanup)

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const SUFFICIENT: TrendsResponse = {
  currency: 'AMD',
  series: [
    { date: '2026-01', value: 50_000_000 },
    { date: '2026-02', value: 50_500_000 },
    { date: '2026-03', value: 51_000_000 },
    { date: '2026-04', value: 51_200_000 },
    { date: '2026-05', value: 51_800_000 },
    { date: '2026-06', value: 52_000_000 },
  ],
  pointCount: 6,
  insufficient: false,
}

const INSUFFICIENT: TrendsResponse = {
  currency: 'AMD',
  series: [],
  pointCount: 2,
  insufficient: true,
}

describe('PriceTrendChart', () => {
  beforeEach(() => {
    // Guard against an unexpected network call — `initialData` + a fresh
    // `staleTime` should make react-query skip the background refetch, but
    // fail loudly (rather than hang) if that assumption is ever wrong.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('unexpected fetch in test'))),
    )
  })

  it('shows the "Not enough data" fallback — no chart in the tree — when insufficient', () => {
    renderWithClient(<PriceTrendChart areaSlug="yerevan-erebuni" areaName="Erebuni" initialData={INSUFFICIENT} />)
    expect(screen.getByText('Not enough data for this area yet')).toBeDefined()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('renders the accessible chart summary + sr-only data table when sufficient', () => {
    renderWithClient(<PriceTrendChart areaSlug="yerevan-arabkir" areaName="Arabkir" initialData={SUFFICIENT} />)
    expect(screen.queryByText('Not enough data for this area yet')).toBeNull()
    const chart = screen.getByRole('img')
    expect(chart.getAttribute('aria-label')).toMatch(/Median total price/)
    // sr-only text alternative table — always present, not gated behind interaction.
    expect(screen.getByText('Jan 2026')).toBeDefined()
  })
})
