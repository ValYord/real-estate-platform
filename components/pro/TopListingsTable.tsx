import { Link } from '@/i18n/navigation'
import Card from '@/components/ui/Card'
import Tooltip from '@/components/ui/Tooltip'
import type { TopListing } from '@/lib/pro-dashboard/types'

function formatCtr(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

const HEADER_CELL = 'text-xs uppercase text-muted font-medium text-left p-3 border-b border-border'
const BODY_CELL = 'text-sm text-text p-3 border-b border-border'

interface TopListingsTableProps {
  items: TopListing[]
}

/**
 * "Top performing listings" table (page spec §3.2): listing · views ·
 * favorites · clicks · leads · CTR, row click → `/property/[id]/[slug]`.
 */
export default function TopListingsTable({ items }: TopListingsTableProps) {
  if (items.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted">No listings to rank yet.</p>
      </Card>
    )
  }

  return (
    <Card className="p-0 overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <caption className="sr-only">Top performing listings</caption>
        <thead>
          <tr>
            <th scope="col" className={HEADER_CELL}>Listing</th>
            <th scope="col" className={HEADER_CELL}>Views</th>
            <th scope="col" className={HEADER_CELL}>Favorites</th>
            <th scope="col" className={HEADER_CELL}>Clicks</th>
            <th scope="col" className={HEADER_CELL}>Leads</th>
            <th scope="col" className={HEADER_CELL}>
              <Tooltip content="Contact clicks ÷ views">
                <span className="underline decoration-dotted underline-offset-2 cursor-help">CTR</span>
              </Tooltip>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-neutral-100 transition-colors">
              <td className={BODY_CELL}>
                <Link
                  href={`/property/${item.id}/${item.slug}` as Parameters<typeof Link>[0]['href']}
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded"
                >
                  {item.title}
                </Link>
              </td>
              <td className={BODY_CELL}>{item.views.toLocaleString()}</td>
              <td className={BODY_CELL}>{item.favorites.toLocaleString()}</td>
              <td className={BODY_CELL}>{item.contactClicks.toLocaleString()}</td>
              <td className={BODY_CELL}>{item.leads.toLocaleString()}</td>
              <td className={BODY_CELL}>{formatCtr(item.ctr)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
