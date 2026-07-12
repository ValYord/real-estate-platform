'use client'

import type { NotificationFilter } from '@/lib/notifications/types'
import { cn } from '@/lib/utils'

const TABS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'messages', label: 'Messages' },
  { key: 'property', label: 'Property' },
  { key: 'alerts', label: 'Alerts' },
]

interface FilterTabsProps {
  active: NotificationFilter
  onChange: (filter: NotificationFilter) => void
}

/**
 * `[All][Unread][Messages][Property][Alerts]` filter tabs (doc §3.2).
 * On mobile these scroll horizontally as chips (doc §6) via `overflow-x-auto`.
 */
export default function FilterTabs({ active, onChange }: FilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Notification filters"
      className="flex gap-1 overflow-x-auto"
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-3 h-9 text-sm whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t',
            active === tab.key
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-gray-500 hover:text-gray-700',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
