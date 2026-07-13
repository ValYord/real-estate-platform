import { NOTIFICATION_ICON } from '@/lib/notifications/helpers'
import type { NotificationType } from '@/lib/notifications/types'
import { cn } from '@/lib/utils'

interface TypeIconProps {
  type: NotificationType
}

/**
 * Colored emoji icon per notification type (doc §3.3 "Icon / color").
 * `aria-hidden` — the notification text itself carries the meaning (doc §7
 * accessibility: "type icons: aria-hidden, the text carries the meaning").
 */
export default function TypeIcon({ type }: TypeIconProps) {
  const icon = NOTIFICATION_ICON[type]

  return (
    <span
      aria-hidden="true"
      className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base',
        icon.bg,
      )}
    >
      {icon.emoji}
    </span>
  )
}
