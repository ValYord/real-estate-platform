// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import MarketActivityStats from '../components/neighborhood/MarketActivityStats'
import type { MarketSummaryResponse } from '../lib/market/types'

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

describe('MarketActivityStats', () => {
  it('renders every populated row plus the market-type chip (text, not color alone)', () => {
    render(<MarketActivityStats summary={BASE} />)
    expect(screen.getByText('Days on market')).toBeDefined()
    expect(screen.getByText('38 days')).toBeDefined()
    expect(screen.getByText('Inventory')).toBeDefined()
    expect(screen.getByText(/Seller.s market/)).toBeDefined()
    // saleToList is null in this schema — never a fabricated "—"-less row.
    expect(screen.queryByText('Sale-to-list ratio')).toBeNull()
  })

  it('omits individual rows whose metric is null', () => {
    render(<MarketActivityStats summary={{ ...BASE, daysOnMarket: null, marketType: null }} />)
    expect(screen.queryByText('Days on market')).toBeNull()
    expect(screen.queryByText(/market$/)).toBeNull()
    expect(screen.getByText('Inventory')).toBeDefined()
  })

  it('renders nothing when every metric is null (card omitted entirely)', () => {
    const { container } = render(
      <MarketActivityStats
        summary={{ ...BASE, daysOnMarket: null, saleToList: null, inventory: null, marketType: null }}
      />,
    )
    expect(container.textContent).toBe('')
  })

  it('uses distinct text + variant for each market type', () => {
    const { rerender } = render(<MarketActivityStats summary={{ ...BASE, marketType: 'buyers' }} />)
    expect(screen.getByText(/Buyer.s market/)).toBeDefined()
    rerender(<MarketActivityStats summary={{ ...BASE, marketType: 'balanced' }} />)
    expect(screen.getByText(/Balanced market/)).toBeDefined()
  })
})
