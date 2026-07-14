'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePathname, Link } from '@/i18n/navigation'
import {
  LayoutDashboard, ShieldCheck, Users, Flag, Home, FileText, MapPin, Settings, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/lib/admin/types'

interface NavItemDef {
  icon: ComponentType<{ className?: string }>
  label: string
  href?: string
}

// D2: 6 of 8 sections render as disabled "Soon" items (no destination) since
// Users/Reports/Listings/Content/Locations/Settings are out of this task's
// scope — lower-effort than building 6 placeholder routes, and never 404s.
const NAV_ITEMS: NavItemDef[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: ShieldCheck, label: 'Moderation', href: '/admin/moderation' },
  { icon: Users, label: 'Users' },
  { icon: Flag, label: 'Reports' },
  { icon: Home, label: 'Listings' },
  { icon: FileText, label: 'Content' },
  { icon: MapPin, label: 'Locations' },
  { icon: Settings, label: 'Settings' },
]

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  const display = count > 9 ? '9+' : String(count)
  return (
    <span
      aria-label={`${count} pending`}
      className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center font-medium"
    >
      {display}
    </span>
  )
}

function SoonPill() {
  return (
    <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
      Soon
    </span>
  )
}

function SidebarNav({ initialPending, onNavClick }: { initialPending: number; onNavClick?: () => void }) {
  const pathname = usePathname()

  // Same query key DashboardStats.tsx uses, so both share one cached fetch
  // and both refresh together every 30s.
  const { data } = useQuery<DashboardStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json() as Promise<DashboardStats>
    },
    initialData: undefined,
    refetchInterval: 30_000,
  })

  const pending = data?.attention ?? initialPending

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <nav aria-label="Admin navigation" className="flex flex-col h-full py-3">
      <div className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon

          if (!item.href) {
            return (
              <span
                key={item.label}
                aria-disabled="true"
                className="flex items-center gap-3 px-4 h-11 rounded-lg text-sm text-gray-400 cursor-not-allowed"
              >
                <Icon aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
                <SoonPill />
              </span>
            )
          }

          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href as Parameters<typeof Link>[0]['href']}
              aria-current={active ? 'page' : undefined}
              onClick={onNavClick}
              className={cn(
                'flex items-center gap-3 px-4 h-11 rounded-lg text-sm transition-colors duration-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active
                  ? 'bg-primary/10 text-primary border-l-2 border-primary font-medium'
                  : 'text-gray-700 hover:bg-gray-50',
              )}
            >
              <Icon aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
              {item.label === 'Moderation' && <Badge count={pending} />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function AdminSidebar({ initialPending }: { initialPending: number }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  useEffect(() => {
    if (drawerOpen) closeButtonRef.current?.focus()
  }, [drawerOpen])

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-gray-200 bg-white sticky top-14 h-[calc(100vh-3.5rem)] flex-shrink-0 overflow-y-auto">
        <SidebarNav initialPending={initialPending} />
      </aside>

      {/* Mobile hamburger button */}
      <button
        className="lg:hidden fixed top-[4.5rem] left-4 z-40 p-2 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open admin navigation"
        aria-expanded={drawerOpen}
        aria-controls="admin-drawer"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        className={cn(
          'fixed inset-0 bg-black/40 z-50 lg:hidden transition-opacity duration-300',
          drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Mobile drawer */}
      <div
        id="admin-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        className={cn(
          'fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 lg:hidden',
          'flex flex-col transition-transform duration-300',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 flex-shrink-0">
          <span className="text-base font-semibold text-gray-900">Admin</span>
          <button
            ref={closeButtonRef}
            onClick={() => setDrawerOpen(false)}
            aria-label="Close admin navigation"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav initialPending={initialPending} onNavClick={() => setDrawerOpen(false)} />
        </div>
      </div>
    </>
  )
}
