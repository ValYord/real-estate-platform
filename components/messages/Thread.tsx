'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { markAllRead, mergeIncomingMessage } from '@/lib/messages/helpers'
import type { AttachmentItem, ConversationListItem, MessageItem, MessagesResponse } from '@/lib/messages/types'
import PinnedPropertyCard from './PinnedPropertyCard'
import ThreadHeader from './ThreadHeader'
import MessageList from './MessageList'
import type { ThreadMessage } from './MessageBubble'
import SendBox from './SendBox'
import AttachmentLightbox from './AttachmentLightbox'
import { BlockConfirmModal, ReportModal } from './BlockReportModals'

interface RawMessageRow {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  attachments: unknown
  is_read: boolean
  created_at: string
}

async function fetchConversation(id: string): Promise<ConversationListItem | null> {
  const res = await fetch(`/api/conversations/${id}`)
  if (res.status === 404 || res.status === 403) return null
  if (!res.ok) throw new Error(`Failed to load conversation: ${res.status}`)
  return (await res.json()) as ConversationListItem
}

async function fetchMessages(id: string): Promise<MessagesResponse> {
  const res = await fetch(`/api/conversations/${id}/messages`)
  if (!res.ok) throw new Error(`Failed to load messages: ${res.status}`)
  return (await res.json()) as MessagesResponse
}

interface ThreadProps {
  conversationId: string
}

/**
 * Right pane — the active thread. Client component: React Query for the
 * initial fetch, Supabase Realtime for live updates (new messages, read
 * receipts), optimistic send with retry, and the block/report/archive menu.
 *
 * The realtime-merge logic (idempotent append, read-receipt patch) lives in
 * the pure `mergeIncomingMessage` / `markAllRead` helpers
 * (lib/messages/helpers.ts), unit-tested in __tests__/messagesHelpers.test.ts.
 * Manual end-to-end verification (needs a live Supabase project — websockets
 * aren't exercised in CI):
 *   1. Open the same conversation as user A and user B in two tabs.
 *   2. B sends a message → it appears in A's thread without a refresh.
 *   3. A has the thread open when B's message arrives → A's `read` PATCH
 *      fires, and B sees the bubble's receipt flip from ✓ to ✓✓ live.
 */
export default function Thread({ conversationId }: ThreadProps) {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [pending, setPending] = useState<ThreadMessage[]>([])
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [conversation, setConversation] = useState<ConversationListItem | null | undefined>(undefined)

  const conversationQuery = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => fetchConversation(conversationId),
  })

  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId),
  })

  useEffect(() => {
    if (conversationQuery.data !== undefined) setConversation(conversationQuery.data)
  }, [conversationQuery.data])

  useEffect(() => {
    if (messagesQuery.data) setMessages(messagesQuery.data.items)
  }, [messagesQuery.data])

  useEffect(() => {
    setPending([])
    setMessages([])
  }, [conversationId])

  // Resolve current user id (needed to tag realtime rows as "mine").
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const markRead = useCallback(() => {
    void fetch(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    })
  }, [conversationId])

  // Mark unread messages as read once the thread (and its messages) has loaded.
  useEffect(() => {
    if (messagesQuery.data && messagesQuery.data.items.some((m) => !m.mine && !m.read)) {
      setMessages((prev) => markAllRead(prev))
      markRead()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesQuery.data])

  // Realtime: new messages + read-receipt updates for this conversation.
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as RawMessageRow
          const message: MessageItem = {
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            mine: row.sender_id === userId,
            body: row.body,
            attachments: Array.isArray(row.attachments) ? (row.attachments as AttachmentItem[]) : [],
            read: row.is_read,
            createdAt: row.created_at,
          }
          setMessages((prev) => mergeIncomingMessage(prev, message))
          if (!message.mine) markRead()
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as RawMessageRow
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, read: row.is_read } : m)))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, userId, markRead])

  const displayMessages: ThreadMessage[] = useMemo(
    () => [...messages, ...pending].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages, pending],
  )

  const sendMessage = useCallback(
    (clientId: string, body: string, attachments: AttachmentItem[]) => {
      const nowIso = new Date().toISOString()
      setPending((prev) => [
        ...prev,
        {
          id: clientId,
          conversationId,
          senderId: userId ?? '',
          mine: true,
          body,
          attachments,
          read: false,
          createdAt: nowIso,
          pendingStatus: 'sending',
        },
      ])

      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, body, attachments }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('send_failed')
          const data = (await res.json()) as { id: string; createdAt: string }
          setPending((prev) => prev.filter((p) => p.id !== clientId))
          setMessages((prev) =>
            mergeIncomingMessage(prev, {
              id: data.id,
              conversationId,
              senderId: userId ?? '',
              mine: true,
              body,
              attachments,
              read: false,
              createdAt: data.createdAt,
            }),
          )
          void queryClient.invalidateQueries({ queryKey: ['conversations'] })
        })
        .catch(() => {
          setPending((prev) =>
            prev.map((p) => (p.id === clientId ? { ...p, pendingStatus: 'failed' } : p)),
          )
        })
    },
    [conversationId, userId, queryClient],
  )

  const handleSend = useCallback(
    (body: string, attachments: AttachmentItem[]) => {
      sendMessage(crypto.randomUUID(), body, attachments)
    },
    [sendMessage],
  )

  const handleRetry = useCallback(
    (message: ThreadMessage) => {
      setPending((prev) => prev.filter((p) => p.id !== message.id))
      sendMessage(message.id, message.body, message.attachments)
    },
    [sendMessage],
  )

  const handleArchiveToggle = useCallback(() => {
    if (!conversation) return
    const next = !conversation.archived
    setConversation({ ...conversation, archived: next })
    void fetch(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: next }),
    }).then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
  }, [conversation, conversationId, queryClient])

  const handleBlock = useCallback(() => {
    if (!conversation) return
    void fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: conversation.peer.id }),
    }).then((res) => {
      if (res.ok) {
        setConversation((c) => (c ? { ...c, blocked: true } : c))
        void queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }
    })
    setShowBlockConfirm(false)
  }, [conversation, queryClient])

  const handleReport = useCallback(
    (reason: 'spam' | 'fraud' | 'abuse' | 'other', note: string) => {
      void fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, reason, note: note || undefined }),
      })
      setShowReport(false)
    },
    [conversationId],
  )

  if (conversation === null) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-sm text-gray-500">This conversation is not available.</p>
      </div>
    )
  }

  if (conversation === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center" aria-label="Loading conversation">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <ThreadHeader
        peer={conversation.peer}
        archived={conversation.archived}
        blocked={conversation.blocked}
        onArchiveToggle={handleArchiveToggle}
        onBlock={() => setShowBlockConfirm(true)}
        onReport={() => setShowReport(true)}
      />
      <PinnedPropertyCard property={conversation.property} />
      <MessageList messages={displayMessages} onRetry={handleRetry} onOpenImage={setLightboxUrl} />
      <SendBox
        conversationId={conversationId}
        disabled={conversation.blocked}
        disabledReason="You have blocked this user"
        onSend={handleSend}
      />

      {lightboxUrl && <AttachmentLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      {showBlockConfirm && (
        <BlockConfirmModal
          peerName={conversation.peer.name}
          onConfirm={handleBlock}
          onCancel={() => setShowBlockConfirm(false)}
        />
      )}
      {showReport && <ReportModal onSubmit={handleReport} onCancel={() => setShowReport(false)} />}
    </div>
  )
}
