import FadeIn from '@/components/motion/FadeIn'
import type { SoldRecord } from '@/lib/market/types'
import { formatDate, formatPrice } from '@/lib/market/format'

interface RecentlySoldTableProps {
  items: SoldRecord[]
}

/**
 * Recently-sold table — omitted entirely (not an empty-state card) when
 * there are zero sold records, per the product doc's own edge rule (§3.5).
 * Every row's location is the area's `district` only — `SoldRecord` has no
 * `address` field at all (see lib/market/types.ts), so the "generalized,
 * not exact address" privacy rule is structural, not a UI-layer omission.
 */
export default function RecentlySoldTable({ items }: RecentlySoldTableProps) {
  if (items.length === 0) return null

  return (
    <FadeIn>
      <section>
        <h2 className="text-xl font-semibold text-text mb-4">Recently sold</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Area</th>
                <th className="text-right px-4 py-2">Price</th>
                <th className="text-right px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">$/m²</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-2.5 text-text">{row.district}</td>
                  <td className="px-4 py-2.5 text-right text-text font-medium">
                    {formatPrice(row.price, row.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted">{formatDate(row.soldAt)}</td>
                  <td className="px-4 py-2.5 text-right text-muted">
                    {row.pricePerM2 !== null ? formatPrice(row.pricePerM2, row.currency) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </FadeIn>
  )
}
