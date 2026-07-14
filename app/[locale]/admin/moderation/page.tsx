import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin/guard'
import { getPendingModerationQueue } from '@/lib/admin/queries'
import ModerationQueue from '@/components/admin/ModerationQueue'

export const metadata: Metadata = {
  title: 'Moderation · Admin | RE Platform',
}

/**
 * /admin/moderation — the queue of `status=pending` listings, oldest first
 * (§4.4 of docs/design/24-admin-handoff.md). Auth already guarded by the
 * parent layout; this Server Component only does the initial SSR fetch so
 * the table isn't empty on first paint, then hands off to the client
 * ModerationQueue for React Query refetching + the approve/reject flow.
 */
export default async function AdminModerationPage() {
  const guard = await requireAdmin()
  if (!guard) return null

  const items = await getPendingModerationQueue(guard.supabase)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Moderation queue</h1>
        {items.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {items.length} listing{items.length === 1 ? '' : 's'} waiting
          </p>
        )}
      </div>
      <ModerationQueue initialItems={items} />
    </div>
  )
}
