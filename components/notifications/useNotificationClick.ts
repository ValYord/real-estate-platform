import { useCallback, useMemo, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveNotificationTarget } from '@/lib/notifications/navigation'
import type { NotificationItem } from '@/lib/notifications/types'

interface UseNotificationClickOptions {
  /** Called (only for a currently-unread item) so the caller can optimistically mark it read + persist it. */
  onMarkRead: (item: NotificationItem) => void
  /** Called right before navigating to a resolved (non-stale) target — e.g. to close a dropdown. */
  onBeforeNavigate?: () => void
}

/**
 * Shared "click a notification" behavior (doc §3.4 "Click → target — always
 * navigates to the related page + marks read"), used by both the header
 * dropdown and the full `/notifications` list.
 */
export function useNotificationClick({ onMarkRead, onBeforeNavigate }: UseNotificationClickOptions) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [staleToast, setStaleToast] = useState(false)

  const handleClick = useCallback(
    (item: NotificationItem) => {
      if (!item.read) onMarkRead(item)

      void resolveNotificationTarget(supabase, item).then((target) => {
        if (target.stale) {
          setStaleToast(true)
          return
        }
        onBeforeNavigate?.()
        router.push(target.href as Parameters<typeof router.push>[0])
      })
    },
    [onMarkRead, onBeforeNavigate, router, supabase],
  )

  const dismissStaleToast = useCallback(() => setStaleToast(false), [])

  return { handleClick, staleToast, dismissStaleToast }
}
