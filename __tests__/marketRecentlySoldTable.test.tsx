// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import RecentlySoldTable from '../components/neighborhood/RecentlySoldTable'
import type { SoldRecord } from '../lib/market/types'

// jsdom has no IntersectionObserver; `RecentlySoldTable` wraps its content in
// `FadeIn`, whose `whileInView` needs one (see `__tests__/motion.test.tsx`
// for the same mock).
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

const RECORD: SoldRecord = {
  id: '1',
  district: 'Arabkir',
  price: 48_000_000,
  currency: 'AMD',
  soldAt: '2026-06-01T00:00:00.000Z',
  pricePerM2: 640_000,
}

describe('RecentlySoldTable', () => {
  it('renders nothing (section omitted) when there are zero sold records', () => {
    const { container } = render(<RecentlySoldTable items={[]} />)
    expect(container.textContent).toBe('')
  })

  it('renders the district (generalized), never a street address', () => {
    render(<RecentlySoldTable items={[RECORD]} />)
    expect(screen.getByText('Arabkir')).toBeDefined()
    expect(screen.getByText('Recently sold')).toBeDefined()
  })

  it('shows "—" for a row with no computable $/m²', () => {
    render(<RecentlySoldTable items={[{ ...RECORD, pricePerM2: null }]} />)
    expect(screen.getByText('—')).toBeDefined()
  })
})
