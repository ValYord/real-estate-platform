'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Inbox } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  applyIncomingMessageToList,
  filterConversations,
  sortConversationsByLastMessage,
} from '@/lib/messages/helpers'
import type { ConversationListItem, ConversationTab, MessageItem } from '@/lib/messages/types'
import ConversationRow from './ConversationRow'

interface RawMessageRow {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  attachments: unknown
  is_read: boolean
  created_at: string
}

const TABS: { key: ConversationTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'archived', label: 'Archive' },
]

async function fetchConversations(): Promise<ConversationListItem[]> {
  const res = await fetch('/api/conversations')
  if (!res.ok) throw new Error(`Failed to load conversations: ${res.status}`)
  const data = (await res.json()) as { items: ConversationListItem[] }
  return data.items
}

function SkeletonRow() {
  return (
    <li className="flex gap-3 p-3" aria-hidden="true">
      <div className="w-12 h-12 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
      </div>
    </li>
  )
}

/**
 * Left pane — conversation list. Client component: fetches via React Query,
 * then keeps itself live with a Supabase Realtime subscription on `messages`
 * INSERT (list re-order + unread badge, no refetch needed).
 *
 * The list-mutation logic driven by realtime payloads (re-order, unread
 * bump) lives in the pure `applyIncomingMessageToList` /
 * `sortConversationsByLastMessage` helpers (lib/messages/helpers.ts) and is
 * unit-tested there (__tests__/messagesHelpers.test.ts). The websocket
 * subscription itself needs a live Supabase project to exercise, so verify
 * it manually before shipping:
 *   1. Open `/messages` as user A in one tab, as user B (a shared
 *      conversation's other participant) in another.
 *   2. B sends a message. Without refreshing, A's list should re-order that
 *      conversation to the top and show an incremented unread badge.
 */
export default function ConversationList() {
  const router = useRouter()
  const params = useParams<{ conversationId?: string }>()
  const activeId = params?.conversationId

  const [tab, setTab] = useState<ConversationTab>('all')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<ConversationListItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    staleTime: 15_000,
  })

  // Sync fetched data into local state (realtime events mutate local state directly).
  useEffect(() => {
    if (data) setItems(sortConversationsByLastMessage(data))
  }, [data])

  // Resolve the current user id once, for "mine" on realtime message payloads.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: userData }) => {
      setUserId(userData.user?.id ?? null)
    })
  }, [])

  // Realtime: new message anywhere → bump + re-order + unread badge.
  // RLS on `messages` (participants-only SELECT) scopes which rows this
  // socket receives, so no conversation_id filter is required here.
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`conversation-list:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as RawMessageRow
          const message: MessageItem = {
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            mine: row.sender_id === userId,
            body: row.body,
            attachments: Array.isArray(row.attachments)
              ? (row.attachments as MessageItem['attachments'])
              : [],
            read: row.is_read,
            createdAt: row.created_at,
          }
          setItems((prev) => sortConversationsByLastMessage(applyIncomingMessageToList(prev, message)))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const visible = useMemo(() => filterConversations(items, tab, search), [items, tab, search])
  const unreadTotal = useMemo(
    () => items.filter((i) => !i.archived).reduce((sum, i) => sum + i.unreadCount, 0),
    [items],
  )

  const handleSelect = useCallback(
    (id: string) => {
      router.push(`/messages/${id}` as Parameters<typeof router.push>[0])
    },
    [router],
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-gray-900">
            Messages
            {unreadTotal > 0 && (
              <span className="ml-1.5 text-sm font-normal text-gray-400">({unreadTotal})</span>
            )}
          </h1>
        </div>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            aria-label="Search conversations"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-3" role="tablist" aria-label="Conversation filters">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'pb-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t',
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <ul aria-label="Loading conversations">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </ul>
        ) : isError ? (
          <p className="p-4 text-sm text-gray-500 text-center">Something went wrong</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center px-6 py-16">
            <Inbox className="w-8 h-8 text-gray-300" aria-hidden="true" />
            <p className="text-sm text-gray-500">
              {tab === 'archived'
                ? 'No archived conversations'
                : tab === 'unread'
                  ? 'No unread conversations'
                  : "You don't have any messages yet"}
            </p>
          </div>
        ) : (
          <ul role="list">
            {visible.map((item) => (
              <ConversationRow
                key={item.id}
                item={item}
                active={item.id === activeId}
                onSelect={handleSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
