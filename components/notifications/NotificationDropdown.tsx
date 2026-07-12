'use client'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@/i18n/navigation'
import type { NotificationsResponse } from '@/lib/notifications/types'
import NotificationRow from './NotificationRow'
import StaleTargetToast from './StaleTargetToast'
import { useNotificationClick } from './useNotificationClick'

const DROPDOWN_LIMIT = 10

interface NotificationDropdownProps {
  onMarkAllRead: () => void
  onItemRead: (id: string) => void
  onClose: () => void
}

async function fetchDropdownNotifications(): Promise<NotificationsResponse> {
  const res = await fetch(`/api/notifications?filter=all&limit=${DROPDOWN_LIMIT}`)
  if (!res.ok) throw new Error(`Failed to load notifications: ${res.status}`)
  return (await res.json()) as NotificationsResponse
}

function SkeletonRow() {
  return (
    <li className="flex gap-3 px-4 py-3" aria-hidden="true">
      <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse" />
      </div>
    </li>
  )
}

/**
 * The bell dropdown panel (doc §2/§3.1): last ~10 notifications, footer with
 * Mark all read / View all / Settings. Outside click / Esc close it (handled
 * by the parent bell button, which unmounts this on `open=false`).
 */
export default function NotificationDropdown({ onMarkAllRead, onItemRead, onClose }: NotificationDropdownProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications-list', 'dropdown'],
    queryFn: fetchDropdownNotifications,
    staleTime: 10_000,
  })

  const { handleClick, staleToast, dismissStaleToast } = useNotificationClick({
    onMarkRead: (item) => onItemRead(item.id),
    onBeforeNavigate: onClose,
  })

  const items = data?.items ?? []

  return (
    <div
      role="menu"
      aria-label="Notifications"
      className="absolute right-0 mt-2 w-80 max-h-96 flex flex-col overflow-hidden bg-white rounded-xl shadow-lg border border-gray-100 z-50"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" aria-live="polite">
        {isLoading ? (
          <ul aria-label="Loading notifications">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </ul>
        ) : isError ? (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">Failed to load</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-gray-500 text-center">No new notifications</p>
        ) : (
          <ul role="list">
            {items.map((item) => (
              <NotificationRow key={item.id} item={item} variant="dropdown" onClick={() => handleClick(item)} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          View all
        </Link>
        <Link
          href="/settings/notifications"
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          ⚙ Settings
        </Link>
      </div>

      {staleToast && <StaleTargetToast onDismiss={dismissStaleToast} />}
    </div>
  )
}
