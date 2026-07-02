import { cn } from '@/lib/utils'

export interface DetailRow {
  label: string
  value: string | number | null | undefined
}

interface PropertyDetailsTableProps {
  details: DetailRow[]
  className?: string
}

/**
 * Two-column definition list for property details.
 * Rows with null/undefined values are hidden automatically.
 */
export default function PropertyDetailsTable({ details, className }: PropertyDetailsTableProps) {
  const visible = details.filter((d) => d.value != null && d.value !== '')
  if (visible.length === 0) return null

  return (
    <div className={cn('border-t border-gray-200 pt-6 mt-6', className)}>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Details</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {visible.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-baseline gap-2">
            <dt className="text-sm text-gray-500 shrink-0">{label}</dt>
            <dd className="text-sm text-gray-900 font-medium text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
