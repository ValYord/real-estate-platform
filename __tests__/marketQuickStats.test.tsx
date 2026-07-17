// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import QuickStats from '../components/neighborhood/QuickStats'
import type { MarketSummaryResponse } from '../lib/market/types'

// jsdom has no IntersectionObserver; framer-motion's `whileInView` (used by <Stagger>) needs one.
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

afterEach(cleanup)

const BASE: MarketSummaryResponse = {
  area: 'yerevan-arabkir',
  name: 'Arabkir',
  city: 'Yerevan',
  country: 'AM',
  medianPrice: 52_000_000,
  currency: 'AMD',
  activeCount: 184,
  pricePerM2: 690,
  pricePerM2Currency: 'AMD',
  yoyChange: 4.2,
  marketType: 'sellers',
  daysOnMarket: 38,
  saleToList: null,
  inventory: 184,
  dateModified: '2026-07-17T00:00:00.000Z',
}

describe('QuickStats', () => {
  it('renders all four stat cards when every metric is present', () => {
    render(<QuickStats summary={BASE} />)
    expect(screen.getByText('Median price')).toBeDefined()
    expect(screen.getByText('Active listings')).toBeDefined()
    expect(screen.getByText('Avg. price / m²')).toBeDefined()
    expect(screen.getByText('Rise vs. last year')).toBeDefined()
  })

  it('omits the median price card when medianPrice is null', () => {
    render(<QuickStats summary={{ ...BASE, medianPrice: null }} />)
    expect(screen.queryByText('Median price')).toBeNull()
    expect(screen.getByText('Active listings')).toBeDefined()
  })

  it('omits the active listings card when activeCount is 0', () => {
    render(<QuickStats summary={{ ...BASE, activeCount: 0 }} />)
    expect(screen.queryByText('Active listings')).toBeNull()
  })

  it('labels a negative YoY change as a decline, not just a red number', () => {
    render(<QuickStats summary={{ ...BASE, yoyChange: -3.1 }} />)
    expect(screen.getByText('Decline vs. last year')).toBeDefined()
  })

  it('renders nothing when every metric is absent', () => {
    const { container } = render(
      <QuickStats
        summary={{
          ...BASE,
          medianPrice: null,
          activeCount: 0,
          pricePerM2: null,
          yoyChange: null,
        }}
      />,
    )
    expect(container.textContent).toBe('')
  })
})
