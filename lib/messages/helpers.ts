/**
 * Pure helper functions for Page 09 — Messages / Inbox.
 *
 * Kept side-effect-free (no fetch/DOM/Supabase) so they can be unit tested
 * directly and reused by both `ConversationList` and `Thread` client
 * components when reacting to Supabase Realtime events.
 */

import type { ConversationListItem, ConversationTab, MessageItem } from './types'

// ── Timestamps ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Conversation-row timestamp: today → "HH:MM", yesterday → "Yesterday",
 * older → "Mon D" (e.g. "Jul 9"). Matches doc §3.1.
 */
export function formatConversationTimestamp(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)

  if (isSameCalendarDay(date, now)) {
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameCalendarDay(date, yesterday)) {
    return 'Yesterday'
  }

  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`
}

/** Day-separator label for the thread view: "Today" / "Yesterday" / "Mon D, YYYY". Matches doc §3.2. */
export function formatDaySeparatorLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)

  if (isSameCalendarDay(date, now)) return 'Today'

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameCalendarDay(date, yesterday)) return 'Yesterday'

  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

// ── Message list — day separators ───────────────────────────────────────────

export type MessageListEntry =
  | { kind: 'separator'; key: string; label: string }
  | { kind: 'message'; key: string; message: MessageItem }

/**
 * Inserts "Today" / "Yesterday" / date separators between messages sent on
 * different calendar days. Input must already be sorted oldest → newest.
 */
export function insertDaySeparators(
  messages: MessageItem[],
  now: Date = new Date(),
): MessageListEntry[] {
  const entries: MessageListEntry[] = []
  let lastDay: Date | null = null

  for (const message of messages) {
    const created = new Date(message.createdAt)
    if (!lastDay || !isSameCalendarDay(created, lastDay)) {
      entries.push({
        kind: 'separator',
        key: `sep-${startOfDay(created).toISOString()}`,
        label: formatDaySeparatorLabel(message.createdAt, now),
      })
      lastDay = created
    }
    entries.push({ kind: 'message', key: message.id, message })
  }

  return entries
}

// ── Conversation list — sort / filter / unread ──────────────────────────────

/** Sorts conversations newest-first by last activity (matches "list re-order" behaviour). */
export function sortConversationsByLastMessage(
  items: ConversationListItem[],
): ConversationListItem[] {
  return [...items].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  )
}

/** Sum of all per-conversation unread counts — used for the header/tab badge. */
export function computeTotalUnread(items: ConversationListItem[]): number {
  return items.reduce((sum, item) => sum + item.unreadCount, 0)
}

/** Applies the All/Unread/Archive tab + free-text search filter (name or property title). */
export function filterConversations(
  items: ConversationListItem[],
  tab: ConversationTab,
  search: string,
): ConversationListItem[] {
  let filtered = items

  if (tab === 'unread') {
    filtered = filtered.filter((i) => i.unreadCount > 0 && !i.archived)
  } else if (tab === 'archived') {
    filtered = filtered.filter((i) => i.archived)
  } else {
    filtered = filtered.filter((i) => !i.archived)
  }

  const query = search.trim().toLowerCase()
  if (query) {
    filtered = filtered.filter(
      (i) =>
        i.peer.name.toLowerCase().includes(query) ||
        (i.property?.title.toLowerCase().includes(query) ?? false),
    )
  }

  return filtered
}

/**
 * Applies a just-received realtime message to the conversation list: bumps
 * the conversation to the top, updates its preview/unread count, without a
 * full refetch. Returns a new array (does not mutate the input).
 */
export function applyIncomingMessageToList(
  items: ConversationListItem[],
  message: MessageItem,
): ConversationListItem[] {
  const index = items.findIndex((i) => i.id === message.conversationId)
  if (index === -1) return items

  const current = items[index]
  const updated: ConversationListItem = {
    ...current,
    lastMessage: { body: message.body, createdAt: message.createdAt, mine: message.mine },
    lastMessageAt: message.createdAt,
    unreadCount: message.mine ? current.unreadCount : current.unreadCount + 1,
  }

  const next = [...items]
  next.splice(index, 1)
  next.unshift(updated)
  return next
}

// ── Thread messages — realtime merge ────────────────────────────────────────

/**
 * Merges an incoming realtime `messages` row into the thread's message list.
 * Idempotent: if the id is already present (e.g. our own optimistic send got
 * confirmed via the POST response first), the existing entry is left alone.
 */
export function mergeIncomingMessage(
  existing: MessageItem[],
  incoming: MessageItem,
): MessageItem[] {
  if (existing.some((m) => m.id === incoming.id)) return existing
  return [...existing, incoming]
}

/** Marks all messages from the peer as read (used after opening a thread). */
export function markAllRead(messages: MessageItem[]): MessageItem[] {
  return messages.map((m) => (m.mine || m.read ? m : { ...m, read: true }))
}
