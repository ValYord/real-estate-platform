import type { AnnualScheduleRow } from '@/lib/mortgage/calculations'

interface AmortizationTableProps {
  rows: AnnualScheduleRow[]
  /** Formats a raw number into a currency-labeled string for display. */
  formatAmount: (amount: number) => string
}

/**
 * Annual amortization summary — a native `<details>/<summary>` disclosure
 * (keyboard-operable for free, no extra JS state) wrapping a table. The rows
 * are always computed regardless of open/closed state, so "live-updating as
 * inputs change" holds even while collapsed (handoff §3.3).
 */
export default function AmortizationTable({ rows, formatAmount }: AmortizationTableProps) {
  if (rows.length === 0) return null

  return (
    <details className="mt-4">
      <summary className="text-sm font-medium text-primary cursor-pointer select-none py-2">
        Amortization summary
      </summary>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th scope="col" className="text-left text-gray-500 font-medium p-2 border-b border-gray-100">
                Year
              </th>
              <th scope="col" className="text-left text-gray-500 font-medium p-2 border-b border-gray-100">
                Principal
              </th>
              <th scope="col" className="text-left text-gray-500 font-medium p-2 border-b border-gray-100">
                Interest
              </th>
              <th scope="col" className="text-left text-gray-500 font-medium p-2 border-b border-gray-100">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year}>
                <td className="p-2 border-b border-gray-100 text-gray-900">{row.year}</td>
                <td className="p-2 border-b border-gray-100 text-gray-900">{formatAmount(row.principalPaid)}</td>
                <td className="p-2 border-b border-gray-100 text-gray-900">{formatAmount(row.interestPaid)}</td>
                <td className="p-2 border-b border-gray-100 text-gray-900">{formatAmount(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
