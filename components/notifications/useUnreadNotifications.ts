import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { NotificationsResponse, UnreadCountResponse } from '@/lib/notifications/types'

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch('/api/notifications/unread-count')
  if (!res.ok) throw new Error(`Failed to load unread count: ${res.status}`)
  const data = (await res.json()) as UnreadCountResponse
  return data.count
}

/**
 * Single source of truth for the header bell's unread badge (doc §3.1/§3.4).
 * Meant to be called exactly once, in `<Header>`, with `unreadCount` and the
 * mutation callbacks passed down to the desktop dropdown bell and the mobile
 * drawer bell — so there is exactly one polling query and one Realtime
 * subscription per page, no matter how many places render the bell icon.
 *
 * Guests never see the bell (doc "Roles"): `userId` resolves to `null` for
 * them and the unread-count query stays disabled.
 */
export function useUnreadNotifications() {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    // Guarded: this hook is mounted once in the global `<Header>`, so a
    // thrown/rejected auth call here (e.g. an unreachable Supabase project,
    // or a misconfigured env in a given deployment) must never bubble up as
    // an uncaught error — that would take down every page's header via
    // React's nearest error boundary instead of just leaving the guest
    // treated as signed-out.
    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch (err) {
      console.error('Failed to create Supabase client', err)
      setUserId(null)
      return
    }

    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch((err) => {
        console.error('Failed to load the current user', err)
        setUserId(null)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: fetchUnreadCount,
    enabled: Boolean(userId),
    staleTime: 15_000,
  })

  // Realtime: a new notification row → badge +1 without a reload (doc §3.1
  // "Badge is realtime" / §4 "New realtime → Badge +1").
  useEffect(() => {
    if (!userId) return
    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch (err) {
      console.error('Failed to create Supabase client for the realtime subscription', err)
      return
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.setQueryData<number>(['notifications-unread-count'], (prev) => (prev ?? 0) + 1)
          void queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  const markAllReadOptimistic = useCallback(() => {
    queryClient.setQueryData(['notifications-unread-count'], 0)
    void fetch('/api/notifications/read-all', { method: 'PATCH' }).then((res) => {
      if (!res.ok) void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    })
    void queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
  }, [queryClient])

  const markOneReadOptimistic = useCallback(
    (id: string) => {
      queryClient.setQueryData<number>(['notifications-unread-count'], (prev) => Math.max(0, (prev ?? 1) - 1))
      // Also reflect the read state in the dropdown's own list query — without
      // this, a click that doesn't navigate away (e.g. a stale-target toast,
      // which keeps the dropdown open) would leave the row looking unread
      // even though it was just marked read (doc §3.4 "Mark read — item click
      // ... optimistic"). Scoped to the dropdown's exact query key (a plain
      // `NotificationsResponse`) — NOT the generic 'notifications-list'
      // prefix, which also matches the full page's `useInfiniteQuery` cache
      // (a `{ pages, pageParams }` shape); writing the dropdown's shape into
      // that cache would corrupt its pagination state.
      queryClient.setQueryData<NotificationsResponse>(['notifications-list', 'dropdown'], (prev) =>
        prev
          ? { ...prev, items: prev.items.map((item) => (item.id === id ? { ...item, read: true } : item)) }
          : prev,
      )
      void fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      }).then((res) => {
        if (!res.ok) {
          void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
          void queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
        }
      })
    },
    [queryClient],
  )

  return {
    userId: userId ?? null,
    unreadCount,
    markAllReadOptimistic,
    markOneReadOptimistic,
  }
}
