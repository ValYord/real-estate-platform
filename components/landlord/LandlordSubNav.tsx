import { Link } from '@/i18n/navigation'
import Badge from '@/components/ui/Badge'
import { LANDLORD_TOOLS, type LandlordToolId } from '@/lib/landlord/tools'
import { cn } from '@/lib/utils'

/**
 * Sub-tool sidebar nav (§2 "SUB-NAV (w-56)" desktop, top tabs/dropdown on
 * mobile per §6). Lists the same 5 tools as the hub grid, with the same
 * disabled-state convention (§3.1) — reuses `LANDLORD_TOOLS` so the two
 * never drift.
 */
export default function LandlordSubNav({ active }: { active: LandlordToolId }) {
  return (
    <nav aria-label="Landlord tools" className="lg:w-56 flex-shrink-0">
      <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
        {LANDLORD_TOOLS.filter((tool) => tool.id !== 'list').map((tool) => {
          const isActive = tool.id === active
          const isLive = tool.state === 'live'

          return (
            <li key={tool.id} className="flex-shrink-0">
              {isLive ? (
                <Link
                  href={tool.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md px-3 h-10 text-sm font-medium whitespace-nowrap',
                    isActive ? 'bg-primary/10 text-primary' : 'text-text hover:bg-neutral-100',
                  )}
                >
                  {tool.name}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex items-center justify-between gap-2 rounded-md px-3 h-10 text-sm font-medium text-muted whitespace-nowrap cursor-not-allowed"
                >
                  {tool.name}
                  <Badge variant="neutral" className="text-muted">
                    {tool.comingSoonLabel ?? 'Coming soon'}
                  </Badge>
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
