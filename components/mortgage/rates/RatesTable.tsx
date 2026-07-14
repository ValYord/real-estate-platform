import { Landmark } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import RateRow from './RateRow'
import type { RateOffer } from '@/lib/mortgage/rates/types'
import type { RatesFilter } from '@/lib/mortgage/rates/schemas'

interface RatesTableProps {
  items: RateOffer[]
  filters: Pick<RatesFilter, 'amount' | 'term'>
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 border border-gray-200 rounded-xl bg-white">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
        <Landmark className="w-8 h-8 text-gray-300" aria-hidden="true" />
      </div>
      <p className="mt-4 text-base font-medium text-gray-900">No offers with these parameters</p>
      <p className="mt-1 text-sm text-gray-500">Try a different country, currency, or term.</p>
      <Link
        href="/mortgage/rates"
        className="mt-4 h-10 px-4 inline-flex items-center rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        Clear filters
      </Link>
    </div>
  )
}

/**
 * Renders the comparison table (`<table>`, `hidden md:block`) plus the
 * mobile card list (`md:hidden`) from the same `items` — same data, two
 * layouts switched by the Tailwind `md:` breakpoint, no JS matchMedia
 * (handoff D5). Defensively re-sorts rate-ascending even though the API
 * already orders it (cheap insurance, not a required feature).
 */
export default function RatesTable({ items, filters }: RatesTableProps) {
  if (items.length === 0) {
    return <EmptyState />
  }

  const sorted = [...items].sort((a, b) => a.ratePct - b.ratePct)

  return (
    <>
      {/* Desktop / tablet — table */}
      <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-sm border-collapse">
          <caption className="sr-only">Mortgage rate offers, sorted by rate ascending</caption>
          <thead>
            <tr className="text-left font-medium text-gray-500 bg-gray-50 text-xs uppercase tracking-wide">
              <th scope="col" className="px-3 py-2">Bank</th>
              <th scope="col" className="px-3 py-2" aria-sort="ascending">Rate</th>
              <th scope="col" className="px-3 py-2">Loan type</th>
              <th scope="col" className="px-3 py-2">Term</th>
              <th scope="col" className="px-3 py-2">Down / LTV</th>
              <th scope="col" className="px-3 py-2">Approx. monthly</th>
              <th scope="col" className="px-3 py-2">Updated</th>
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">Apply</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((offer, i) => (
              <RateRow key={`${offer.bankId}-${i}`} offer={offer} filters={filters} variant="row" />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — card list */}
      <div className="md:hidden space-y-3">
        {sorted.map((offer, i) => (
          <RateRow key={`${offer.bankId}-${i}`} offer={offer} filters={filters} variant="card" />
        ))}
      </div>
    </>
  )
}
