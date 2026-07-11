/**
 * Unit tests for the pure Messages / Inbox helper functions
 * (lib/messages/helpers.ts) that back <ConversationList> and <Thread>:
 * timestamp formatting, day separators, sort/filter, and the realtime
 * merge functions used to apply incoming Supabase Realtime events without
 * a full refetch.
 */

import { describe, it, expect } from 'vitest'
import {
  formatConversationTimestamp,
  formatDaySeparatorLabel,
  insertDaySeparators,
  sortConversationsByLastMessage,
  computeTotalUnread,
  filterConversations,
  applyIncomingMessageToList,
  mergeIncomingMessage,
  markAllRead,
} from '../lib/messages/helpers'
import type { ConversationListItem, MessageItem } from '../lib/messages/types'

const NOW = new Date('2026-07-11T15:00:00.000Z')

function makeConversation(overrides: Partial<ConversationListItem> = {}): ConversationListItem {
  return {
    id: 'conv-1',
    property: null,
    peer: { id: 'peer-1', name: 'David', avatar: null, role: 'user', verified: false },
    lastMessage: null,
    unreadCount: 0,
    archived: false,
    muted: false,
    blocked: false,
    lastMessageAt: NOW.toISOString(),
    ...overrides,
  }
}

function makeMessage(overrides: Partial<MessageItem> = {}): MessageItem {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'peer-1',
    mine: false,
    body: 'Hello',
    attachments: [],
    read: false,
    createdAt: NOW.toISOString(),
    ...overrides,
  }
}

// ── formatConversationTimestamp ───────────────────────────────────────────────

describe('formatConversationTimestamp', () => {
  it('formats a same-day timestamp as HH:MM', () => {
    const iso = '2026-07-11T09:05:00.000Z'
    expect(formatConversationTimestamp(iso, NOW)).toBe('09:05')
  })

  it('formats yesterday as "Yesterday"', () => {
    const iso = '2026-07-10T09:05:00.000Z'
    expect(formatConversationTimestamp(iso, NOW)).toBe('Yesterday')
  })

  it('formats an older date as "Mon D"', () => {
    const iso = '2026-07-05T09:05:00.000Z'
    expect(formatConversationTimestamp(iso, NOW)).toBe('Jul 5')
  })
})

// ── formatDaySeparatorLabel ────────────────────────────────────────────────────

describe('formatDaySeparatorLabel', () => {
  it('labels today as "Today"', () => {
    expect(formatDaySeparatorLabel('2026-07-11T09:05:00.000Z', NOW)).toBe('Today')
  })

  it('labels yesterday as "Yesterday"', () => {
    expect(formatDaySeparatorLabel('2026-07-10T09:05:00.000Z', NOW)).toBe('Yesterday')
  })

  it('labels an older date with month/day/year', () => {
    expect(formatDaySeparatorLabel('2026-01-02T09:05:00.000Z', NOW)).toBe('Jan 2, 2026')
  })
})

// ── insertDaySeparators ────────────────────────────────────────────────────────

describe('insertDaySeparators', () => {
  it('inserts one separator for messages on the same day', () => {
    const messages = [
      makeMessage({ id: 'a', createdAt: '2026-07-11T09:00:00.000Z' }),
      makeMessage({ id: 'b', createdAt: '2026-07-11T10:00:00.000Z' }),
    ]
    const entries = insertDaySeparators(messages, NOW)
    expect(entries.filter((e) => e.kind === 'separator')).toHaveLength(1)
    expect(entries).toHaveLength(3)
    expect(entries[0]).toMatchObject({ kind: 'separator', label: 'Today' })
  })

  it('inserts a new separator when the calendar day changes', () => {
    const messages = [
      makeMessage({ id: 'a', createdAt: '2026-07-10T09:00:00.000Z' }),
      makeMessage({ id: 'b', createdAt: '2026-07-11T10:00:00.000Z' }),
    ]
    const entries = insertDaySeparators(messages, NOW)
    const separators = entries.filter((e) => e.kind === 'separator')
    expect(separators).toHaveLength(2)
    expect(separators.map((s) => (s.kind === 'separator' ? s.label : ''))).toEqual([
      'Yesterday',
      'Today',
    ])
  })

  it('returns an empty array for no messages', () => {
    expect(insertDaySeparators([], NOW)).toEqual([])
  })
})

// ── sortConversationsByLastMessage ────────────────────────────────────────────

describe('sortConversationsByLastMessage', () => {
  it('sorts newest last-message first', () => {
    const items = [
      makeConversation({ id: 'old', lastMessageAt: '2026-07-01T00:00:00.000Z' }),
      makeConversation({ id: 'new', lastMessageAt: '2026-07-11T00:00:00.000Z' }),
      makeConversation({ id: 'mid', lastMessageAt: '2026-07-05T00:00:00.000Z' }),
    ]
    expect(sortConversationsByLastMessage(items).map((i) => i.id)).toEqual(['new', 'mid', 'old'])
  })

  it('does not mutate the input array', () => {
    const items = [
      makeConversation({ id: 'a', lastMessageAt: '2026-07-01T00:00:00.000Z' }),
      makeConversation({ id: 'b', lastMessageAt: '2026-07-11T00:00:00.000Z' }),
    ]
    const copy = [...items]
    sortConversationsByLastMessage(items)
    expect(items).toEqual(copy)
  })
})

// ── computeTotalUnread ─────────────────────────────────────────────────────────

describe('computeTotalUnread', () => {
  it('sums unread counts across conversations', () => {
    const items = [
      makeConversation({ unreadCount: 2 }),
      makeConversation({ unreadCount: 0 }),
      makeConversation({ unreadCount: 5 }),
    ]
    expect(computeTotalUnread(items)).toBe(7)
  })

  it('returns 0 for an empty list', () => {
    expect(computeTotalUnread([])).toBe(0)
  })
})

// ── filterConversations ───────────────────────────────────────────────────────

describe('filterConversations', () => {
  const items = [
    makeConversation({
      id: 'a',
      unreadCount: 2,
      archived: false,
      peer: { id: 'p1', name: 'David', avatar: null, role: 'user', verified: false },
    }),
    makeConversation({
      id: 'b',
      unreadCount: 0,
      archived: false,
      peer: { id: 'p2', name: 'Maria', avatar: null, role: 'agent', verified: true },
    }),
    makeConversation({
      id: 'c',
      unreadCount: 3,
      archived: true,
      peer: { id: 'p3', name: 'Aram', avatar: null, role: 'user', verified: false },
    }),
  ]

  it('"all" tab excludes archived conversations', () => {
    const result = filterConversations(items, 'all', '')
    expect(result.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('"unread" tab only includes non-archived conversations with unread > 0', () => {
    const result = filterConversations(items, 'unread', '')
    expect(result.map((i) => i.id)).toEqual(['a'])
  })

  it('"archived" tab only includes archived conversations', () => {
    const result = filterConversations(items, 'archived', '')
    expect(result.map((i) => i.id)).toEqual(['c'])
  })

  it('search filters by peer name (case-insensitive)', () => {
    const result = filterConversations(items, 'all', 'david')
    expect(result.map((i) => i.id)).toEqual(['a'])
  })

  it('search matching nothing returns an empty list', () => {
    expect(filterConversations(items, 'all', 'zzz')).toEqual([])
  })
})

// ── applyIncomingMessageToList ────────────────────────────────────────────────

describe('applyIncomingMessageToList', () => {
  it('bumps the conversation to the top and increments unread for a peer message', () => {
    const items = [
      makeConversation({ id: 'a', unreadCount: 0, lastMessageAt: '2026-07-01T00:00:00.000Z' }),
      makeConversation({ id: 'b', unreadCount: 1, lastMessageAt: '2026-07-05T00:00:00.000Z' }),
    ]
    const incoming = makeMessage({ conversationId: 'b', mine: false, body: 'New!' })
    const result = applyIncomingMessageToList(items, incoming)
    expect(result[0].id).toBe('b')
    expect(result[0].unreadCount).toBe(2)
    expect(result[0].lastMessage?.body).toBe('New!')
  })

  it('does not increment unread for my own message', () => {
    const items = [makeConversation({ id: 'a', unreadCount: 0 })]
    const incoming = makeMessage({ conversationId: 'a', mine: true })
    const result = applyIncomingMessageToList(items, incoming)
    expect(result[0].unreadCount).toBe(0)
  })

  it('returns the list unchanged if the conversation is not found', () => {
    const items = [makeConversation({ id: 'a' })]
    const incoming = makeMessage({ conversationId: 'does-not-exist' })
    expect(applyIncomingMessageToList(items, incoming)).toBe(items)
  })
})

// ── mergeIncomingMessage ───────────────────────────────────────────────────────

describe('mergeIncomingMessage', () => {
  it('appends a new message', () => {
    const existing = [makeMessage({ id: 'a' })]
    const result = mergeIncomingMessage(existing, makeMessage({ id: 'b' }))
    expect(result.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('is idempotent — does not duplicate an already-present id', () => {
    const existing = [makeMessage({ id: 'a' })]
    const result = mergeIncomingMessage(existing, makeMessage({ id: 'a', body: 'dup' }))
    expect(result).toHaveLength(1)
    expect(result[0].body).toBe('Hello') // original preserved, not overwritten
  })
})

// ── markAllRead ────────────────────────────────────────────────────────────────

describe('markAllRead', () => {
  it('marks peer messages as read', () => {
    const messages = [makeMessage({ id: 'a', mine: false, read: false })]
    const result = markAllRead(messages)
    expect(result[0].read).toBe(true)
  })

  it('leaves my own messages untouched (read state driven by the peer)', () => {
    const messages = [makeMessage({ id: 'a', mine: true, read: false })]
    const result = markAllRead(messages)
    expect(result[0].read).toBe(false)
  })

  it('does not create a new object reference for already-read messages', () => {
    const messages = [makeMessage({ id: 'a', mine: false, read: true })]
    const result = markAllRead(messages)
    expect(result[0]).toBe(messages[0])
  })
})
