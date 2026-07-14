'use client'

import { BarChart2, LineChart } from 'lucide-react'
import { usePathname, Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
}

// MVP scope: exactly these two sections (docs/design/18-pro-dashboard-handoff.md
// §0). Do NOT add Leads/Promoted/Bulk Upload/Team/Billing here — those ship in
// later tasks, and a nav item with no matching route is a dead link.
const NAV_ITEMS: NavItem[] = [
  { icon: BarChart2, label: 'Overview', href: '/pro/dashboard' },
  { icon: LineChart, label: 'Analytics', href: '/pro/dashboard/analytics' },
]

interface ProSidebarProps {
  onNavClick?: () => void
  /** `h-10` on desktop (mouse-only), `h-11` (44px) for the mobile drawer touch target. */
  itemHeightClassName?: string
}

/**
 * Pro dashboard nav — `aria-label="Pro dashboard"`, active item
 * `aria-current="page"` (page spec §7). Structural pattern copied from
 * `DashboardSidebar.tsx`, scoped to a 2-item `navItems` array with no badge
 * logic (handoff D8).
 */
export default function ProSidebar({ onNavClick, itemHeightClassName = 'h-10' }: ProSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/pro/dashboard' ? pathname === '/pro/dashboard' : pathname.startsWith(href)

  return (
    <nav aria-label="Pro dashboard" className="flex flex-col gap-0.5 p-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)

        return (
          <Link
            key={item.href}
            href={item.href as Parameters<typeof Link>[0]['href']}
            aria-current={active ? 'page' : undefined}
            onClick={onNavClick}
            className={cn(
              'flex items-center gap-3 px-4 rounded-md text-sm transition-colors duration-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              itemHeightClassName,
              active ? 'bg-primary/10 text-primary font-medium' : 'text-text hover:bg-neutral-100',
            )}
          >
            <Icon aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
