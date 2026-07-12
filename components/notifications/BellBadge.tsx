import { formatBadgeCount } from '@/lib/notifications/helpers'

interface BellBadgeProps {
  count: number
  max?: number
}

/**
 * Unread-count badge for the header bell (doc §2 design tokens).
 * `aria-hidden` — the parent bell button/link already carries the count in
 * its `aria-label` ("Notifications, {n} unread"), so this is decorative.
 */
export default function BellBadge({ count, max = 9 }: BellBadgeProps) {
  if (count <= 0) return null

  return (
    <span
      aria-hidden="true"
      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-5 text-center leading-tight"
    >
      {formatBadgeCount(count, max)}
    </span>
  )
}
