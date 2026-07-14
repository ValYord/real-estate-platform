import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'

interface UpgradeOverlayProps {
  locked: boolean
  message?: string
  children: ReactNode
}

/**
 * Free-tier locked/blurred overlay (page spec §2 token table + §7
 * accessibility: `aria-disabled` on the content, plus a real, focusable
 * upgrade link — never blur-only). Wraps a single widget so the underlying
 * grid/panel shape stays identical between the Free and Pro views (handoff
 * §6 "Free tier" — one overlay per widget, not one page-level overlay).
 *
 * `GET /api/pro/overview` / `GET /api/pro/analytics` return
 * `403 { error: "tier_insufficient" }` for free-tier callers; the caller
 * renders this overlay from that response — it never fetches real data and
 * hides it client-side.
 */
export default function UpgradeOverlay({ locked, message, children }: UpgradeOverlayProps) {
  if (!locked) return <>{children}</>

  return (
    <div className="relative">
      <div aria-disabled="true" className="pointer-events-none select-none" inert>
        {children}
      </div>
      <div className="absolute inset-0 backdrop-blur-sm bg-surface/60 rounded-lg flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-sm text-muted max-w-xs">
          {message ?? 'Upgrade to Pro to unlock live analytics for your listings.'}
        </p>
        {/* A real, focusable <Link> — must stay a genuine anchor (crawlable,
         * right-click-openable), not a `Button` `onClick`, per page spec §7.
         * `Button` has no polymorphic element-swap prop, so this replicates
         * its `variant="primary" size="md"` cva output by hand
         * (docs/design/18-pro-dashboard-handoff.md §2.4). */}
        <Link
          href="/pro"
          className="inline-flex items-center justify-center gap-2 rounded-md font-medium bg-primary text-primary-fg hover:bg-primary/90 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 h-11 px-4 text-sm"
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  )
}
