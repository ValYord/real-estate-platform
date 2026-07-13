'use client'

import type { ReactNode } from 'react'
import { formatRelativeTime, notificationText } from '@/lib/notifications/helpers'
import type { NotificationItem } from '@/lib/notifications/types'
import { cn } from '@/lib/utils'
import TypeIcon from './TypeIcon'

interface NotificationRowProps {
  item: NotificationItem
  /** `dropdown` — header panel item (doc §3.1); `page` — `/notifications` row (doc §3.2). */
  variant: 'dropdown' | 'page'
  onClick: () => void
  /** `<RowMenu>` — page rows only (doc §3.2 "[•••] menu"). */
  menu?: ReactNode
  now?: Date
}

/**
 * Shared row used by both the header dropdown and the full `/notifications`
 * list (doc §2 design tokens: `flex gap-3 px-4 py-3 hover:bg-gray-50
 * cursor-pointer`; unread → `bg-primary/5 font-medium` + dot).
 */
export default function NotificationRow({ item, variant, onClick, menu, now }: NotificationRowProps) {
  return (
    <li
      className={cn(
        'flex items-stretch gap-1',
        !item.read && 'bg-primary/5',
      )}
    >
      <button
        type="button"
        role={variant === 'dropdown' ? 'menuitem' : undefined}
        onClick={onClick}
        className="flex flex-1 min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <TypeIcon type={item.type} />
        <span
          className={cn(
            'flex-1 min-w-0 text-sm truncate',
            item.read ? 'text-gray-700 font-normal' : 'text-gray-900 font-medium',
          )}
        >
          {notificationText(item)}
        </span>
        <span className="flex items-center gap-2 flex-shrink-0">
          {!item.read && (
            <span className="w-2 h-2 rounded-full bg-primary" role="img" aria-label="unread" />
          )}
          <span className="text-xs text-gray-400">{formatRelativeTime(item.createdAt, now)}</span>
        </span>
      </button>
      {menu && <span className="flex items-center pr-2">{menu}</span>}
    </li>
  )
}
