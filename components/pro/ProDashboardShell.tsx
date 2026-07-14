'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanTier } from '@/lib/plans/types'
import ProSidebar from './ProSidebar'
import ProTopbar from './ProTopbar'

interface ProDashboardShellProps {
  tier: PlanTier
  children: ReactNode
}

/**
 * Responsive shell: desktop sticky `w-60` sidebar + mobile hamburger drawer
 * (drawer open/close/focus-trap/Escape/scroll-lock mechanics copied from
 * `DashboardSidebar.tsx`, handoff §2) + `<ProTopbar>` + the content pane.
 * Free-tier callers still see this shell — only the widgets inside
 * `{children}` are individually locked (`<UpgradeOverlay>`), per page spec §4.
 */
export default function ProDashboardShell({ tier, children }: ProDashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Close drawer on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  // Focus close button when drawer opens
  useEffect(() => {
    if (drawerOpen) closeButtonRef.current?.focus()
  }, [drawerOpen])

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-surface sticky top-16 h-[calc(100vh-4rem)] flex-shrink-0">
        <ProSidebar />
      </aside>

      {/* Mobile hamburger button */}
      <button
        className="lg:hidden fixed top-[4.5rem] left-4 z-40 p-2 rounded-lg bg-surface border border-border shadow-sm text-text hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open Pro dashboard navigation"
        aria-expanded={drawerOpen}
        aria-controls="pro-dashboard-drawer"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        className={cn(
          'fixed inset-0 bg-text/50 z-50 lg:hidden transition-opacity duration-300',
          drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Mobile drawer */}
      <div
        id="pro-dashboard-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Pro dashboard navigation"
        className={cn(
          'fixed top-0 left-0 h-full w-72 bg-surface shadow-lg z-50 lg:hidden',
          'flex flex-col transition-transform duration-300',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-border flex-shrink-0">
          <span className="text-base font-semibold text-text">Pro dashboard</span>
          <button
            ref={closeButtonRef}
            onClick={() => setDrawerOpen(false)}
            aria-label="Close Pro dashboard navigation"
            className="p-2 rounded-lg text-muted hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ProSidebar onNavClick={() => setDrawerOpen(false)} itemHeightClassName="h-11" />
        </div>
      </div>

      {/* Content pane */}
      <div className="flex-1 min-w-0 flex flex-col">
        <ProTopbar tier={tier} />
        <main className="flex-1 p-4 lg:p-6 space-y-4">
          {children}
        </main>
      </div>
    </div>
  )
}
