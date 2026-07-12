'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  applyFilter,
  countUnread,
  markAllRead as markAllReadPure,
  mergeIncomingNotification,
  removeNotification,
  rowToNotificationItem,
  setReadState,
  type NotificationRow as NotificationRowShape,
} from '@/lib/notifications/helpers'
import type { NotificationFilter, NotificationItem, NotificationsResponse } from '@/lib/notifications/types'
import FilterTabs from './FilterTabs'
import NotificationRow from './NotificationRow'
import RowMenu from './RowMenu'
import StaleTargetToast from './StaleTargetToast'
import { useNotificationClick } from './useNotificationClick'

interface NotificationsViewProps {
  initialItems: NotificationItem[]
  initialNextCursor: string | null
}

async function fetchNotificationsPage(filter: NotificationFilter, cursor?: string): Promise<NotificationsResponse> {
  const params = new URLSearchParams({ filter })
  if (cursor) params.set('cursor', cursor)
  const res = await fetch(`/api/notifications?${params.toString()}`)
  if (!res.ok) throw new Error(`Failed to load notifications: ${res.status}`)
  return (await res.json()) as NotificationsResponse
}

function SkeletonRow() {
  return (
    <li className="flex gap-3 px-4 py-3" aria-hidden="true">
      <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-1/4 bg-gray-100 rounded animate-pulse" />
      </div>
    </li>
  )
}

/**
 * `/notifications` — Page 22 full-page client component: heading + "Mark
 * all read", filter tabs, infinite-scroll list, Realtime updates, and the
 * per-row `[•••]` menu (doc §3.2). `initialItems`/`initialNextCursor` come
 * from the SSR shell (app/[locale]/notifications/page.tsx) for the default
 * "All" filter so the first paint doesn't wait on a client fetch.
 */
export default function NotificationsView({ initialItems, initialNextCursor }: NotificationsViewProps) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [items, setItems] = useState<NotificationItem[]>(initialItems)
  const [userId, setUserId] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteQuery({
    queryKey: ['notifications-list', filter],
    queryFn: ({ pageParam }) => fetchNotificationsPage(filter, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData:
      filter === 'all'
        ? { pages: [{ items: initialItems, nextCursor: initialNextCursor }], pageParams: [undefined] }
        : undefined,
    staleTime: 15_000,
  })

  useEffect(() => {
    if (data) setItems(data.pages.flatMap((p) => p.items))
  }, [data])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: userData }) => setUserId(userData.user?.id ?? null))
  }, [])

  // Realtime: prepend newly created notifications that match the active
  // filter (doc §4 "New realtime → badge +1 + list prepend").
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`notifications-page:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as NotificationRowShape
          const item = rowToNotificationItem(row)
          if (!item) return
          setItems((prev) => (applyFilter([item], filter).length > 0 ? mergeIncomingNotification(prev, item) : prev))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, filter])

  // Infinite scroll sentinel (doc §3.2 "infinite scroll, limit 20/page").
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const unreadCount = useMemo(() => countUnread(items), [items])

  const patchRead = useCallback(
    (id: string, read: boolean) => {
      setItems((prev) => setReadState(prev, id, read))
      void fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read }),
      }).then((res) => {
        if (!res.ok) setItems((prev) => setReadState(prev, id, !read))
      })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
    [queryClient],
  )

  const handleDelete = useCallback(
    (id: string) => {
      const removedIndex = items.findIndex((i) => i.id === id)
      const removed = items[removedIndex]
      setItems((prev) => removeNotification(prev, id))
      void fetch(`/api/notifications/${id}`, { method: 'DELETE' }).then((res) => {
        if (!res.ok && removed) {
          setItems((prev) => {
            const next = [...prev]
            next.splice(Math.min(removedIndex, next.length), 0, removed)
            return next
          })
        }
      })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
    [items, queryClient],
  )

  const handleMarkAllRead = useCallback(() => {
    setItems((prev) => markAllReadPure(prev))
    void fetch('/api/notifications/read-all', { method: 'PATCH' })
    queryClient.setQueryData(['notifications-unread-count'], 0)
  }, [queryClient])

  const { handleClick, staleToast, dismissStaleToast } = useNotificationClick({
    onMarkRead: (item) => patchRead(item.id, true),
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        <button
          type="button"
          disabled={unreadCount === 0}
          onClick={handleMarkAllRead}
          className="text-sm text-primary hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Mark all read
        </button>
      </div>

      <div className="border-b border-gray-100 mb-2">
        <FilterTabs active={filter} onChange={setFilter} />
      </div>

      {isLoading ? (
        <ul aria-label="Loading notifications">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </ul>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <p className="text-sm text-gray-500">Failed to load</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        filter === 'all' ? (
          <div className="text-center text-gray-500 py-12">
            <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" aria-hidden="true" />
            <p>
              You don&apos;t have any notifications yet. When something happens (a message, a
              price change, a match), it will appear here.
            </p>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-12">No notifications in this category</p>
        )
      ) : (
        <ul role="list">
          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              variant="page"
              onClick={() => handleClick(item)}
              menu={
                <RowMenu
                  read={item.read}
                  onMarkRead={() => patchRead(item.id, true)}
                  onMarkUnread={() => patchRead(item.id, false)}
                  onDelete={() => handleDelete(item.id)}
                />
              }
            />
          ))}
        </ul>
      )}

      {hasNextPage && <div ref={sentinelRef} aria-hidden="true" className="h-1" />}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4" role="status" aria-label="Loading more notifications">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!isLoading && !hasNextPage && items.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-4">No older notifications</p>
      )}

      {staleToast && <StaleTargetToast onDismiss={dismissStaleToast} />}
    </div>
  )
}
