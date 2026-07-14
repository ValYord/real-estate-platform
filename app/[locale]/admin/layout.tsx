import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { requireAdmin } from '@/lib/admin/guard'
import AdminTopBar from '@/components/admin/AdminTopBar'
import AdminSidebar from '@/components/admin/AdminSidebar'

// Inherited by every /admin/* page — do not override per-page (§8 of the
// design handoff). Next.js renders this as
// <meta name="robots" content="noindex, nofollow">.
export const metadata: Metadata = {
  title: 'Admin | RE Platform',
  robots: { index: false, follow: false },
}

function AccessDenied() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
      <span className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full">
        <ShieldAlert className="w-8 h-8 text-red-400" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-gray-900">Access denied</h1>
        <p className="text-sm text-gray-500 max-w-sm">This section is available to admins only.</p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        ← Back to home
      </Link>
    </div>
  )
}

/**
 * Server Component auth guard (§4.1 of docs/design/24-admin-handoff.md).
 *
 * `requireAdmin()` resolves the session + profile role server-side and, for
 * anyone who isn't `role === 'admin'` (including guests), this function
 * returns the 403 content directly instead of calling `redirect()` — a
 * client-side redirect would still momentarily mount this layout's children,
 * which is exactly the "flash of protected content" the acceptance criteria
 * rule out. Rendering in place guarantees a non-admin's response body is
 * never anything but the 403 card.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const guard = await requireAdmin()

  if (!guard) {
    return <AccessDenied />
  }

  const { supabase, admin } = guard

  const { count: pendingCount } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <div className="flex flex-col min-h-screen">
      <AdminTopBar adminName={admin.fullName} />
      <div className="flex flex-1 min-h-0">
        <AdminSidebar initialPending={pendingCount ?? 0} />
        <main className="flex-1 min-w-0 bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
