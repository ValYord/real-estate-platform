/**
 * Unit tests for the pure helper functions behind Page 22 (Notifications):
 * row→item mapping, filter categories, display text/href, relative time,
 * and the local/optimistic + realtime list mutations.
 */
import { describe, it, expect } from 'vitest'
import {
  applyFilter,
  countUnread,
  formatBadgeCount,
  formatRelativeTime,
  markAllRead,
  matchesFilter,
  mergeIncomingNotification,
  notificationHref,
  notificationText,
  removeNotification,
  rowToNotificationItem,
  setReadState,
  type NotificationRow,
} from '../lib/notifications/helpers'
import type { NotificationItem } from '../lib/notifications/types'

function makeItem(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'n-1',
    type: 'message',
    read: false,
    payload: {},
    createdAt: '2026-07-12T09:00:00.000Z',
    ...overrides,
  }
}

function makeRow(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: 'n-1',
    user_id: 'user-1',
    type: 'message',
    title: 'New message from Tigran',
    body: null,
    is_read: false,
    metadata: { conversationId: 'conv-1', name: 'Tigran' },
    created_at: '2026-07-12T09:00:00.000Z',
    ...overrides,
  }
}

// ── rowToNotificationItem ───────────────────────────────────────────────────

describe('rowToNotificationItem()', () => {
  it('maps a well-formed row to a NotificationItem', () => {
    const item = rowToNotificationItem(makeRow())
    expect(item).toEqual({
      id: 'n-1',
      type: 'message',
      read: false,
      payload: { conversationId: 'conv-1', name: 'Tigran' },
      createdAt: '2026-07-12T09:00:00.000Z',
    })
  })

  it('maps is_read=true to read=true', () => {
    const item = rowToNotificationItem(makeRow({ is_read: true }))
    expect(item?.read).toBe(true)
  })

  it('drops unknown metadata keys but keeps known ones', () => {
    const item = rowToNotificationItem(
      makeRow({ metadata: { conversationId: 'conv-1', unknownField: 'x', percent: 5 } }),
    )
    expect(item?.payload).toEqual({ conversationId: 'conv-1', percent: 5 })
  })

  it('returns an empty payload for null/non-object metadata', () => {
    expect(rowToNotificationItem(makeRow({ metadata: null }))?.payload).toEqual({})
    expect(rowToNotificationItem(makeRow({ metadata: 'not-an-object' }))?.payload).toEqual({})
    expect(rowToNotificationItem(makeRow({ metadata: ['a', 'b'] }))?.payload).toEqual({})
  })

  it('returns null for an unrecognized type', () => {
    expect(rowToNotificationItem(makeRow({ type: 'something_else' }))).toBeNull()
  })
})

// ── Filter categories ────────────────────────────────────────────────────────

describe('matchesFilter() / applyFilter()', () => {
  const items: NotificationItem[] = [
    makeItem({ id: '1', type: 'message', read: false }),
    makeItem({ id: '2', type: 'price_drop', read: true }),
    makeItem({ id: '3', type: 'saved_search_match', read: false }),
    makeItem({ id: '4', type: 'new_review', read: true }),
    makeItem({ id: '5', type: 'listing_expiring', read: false }),
  ]

  it('"all" matches everything', () => {
    expect(applyFilter(items, 'all')).toHaveLength(5)
  })

  it('"unread" matches only unread items', () => {
    expect(applyFilter(items, 'unread').map((i) => i.id)).toEqual(['1', '3', '5'])
  })

  it('"messages" matches only the message type', () => {
    expect(applyFilter(items, 'messages').map((i) => i.id)).toEqual(['1'])
  })

  it('"property" matches price_drop/listing_* types', () => {
    expect(applyFilter(items, 'property').map((i) => i.id)).toEqual(['2', '5'])
  })

  it('"alerts" matches saved_search_match/new_review', () => {
    expect(applyFilter(items, 'alerts').map((i) => i.id)).toEqual(['3', '4'])
  })

  it('an empty category filter on an empty list returns an empty array (filter-empty state)', () => {
    expect(applyFilter([], 'property')).toEqual([])
  })

  it('matchesFilter() agrees with applyFilter() per item', () => {
    for (const item of items) {
      expect(matchesFilter(item, 'property')).toBe(applyFilter(items, 'property').includes(item))
    }
  })
})

// ── Display text (doc §3.3) ─────────────────────────────────────────────────

describe('notificationText()', () => {
  it('message', () => {
    expect(notificationText(makeItem({ type: 'message', payload: { name: 'Tigran' } }))).toBe(
      'New message from Tigran',
    )
  })

  it('price_drop includes the percent', () => {
    expect(
      notificationText(
        makeItem({ type: 'price_drop', payload: { title: 'Kentron, 3 rooms', percent: 5 } }),
      ),
    ).toBe('The price of "Kentron, 3 rooms" dropped 5%')
  })

  it('listing_approved', () => {
    expect(
      notificationText(makeItem({ type: 'listing_approved', payload: { title: 'Arabkir, 2 rooms' } })),
    ).toBe('Your "Arabkir, 2 rooms" listing was approved')
  })

  it('listing_rejected', () => {
    expect(notificationText(makeItem({ type: 'listing_rejected', payload: { title: 'Studio' } }))).toBe(
      '"Studio" was rejected — see the reason',
    )
  })

  it('new_review includes the rating', () => {
    expect(
      notificationText(makeItem({ type: 'new_review', payload: { name: 'Anna', rating: 4 } })),
    ).toBe('Anna rated you ⭐4')
  })

  it('falls back gracefully when payload fields are missing', () => {
    expect(notificationText(makeItem({ type: 'message', payload: {} }))).toBe('New message from someone')
  })
})

// ── Click target (doc §3.3) ──────────────────────────────────────────────────

describe('notificationHref()', () => {
  it('message → /messages/[conversationId]', () => {
    expect(notificationHref(makeItem({ type: 'message', payload: { conversationId: 'c-1' } }))).toBe(
      '/messages/c-1',
    )
  })

  it('price_drop and listing_approved → /property/[id]', () => {
    expect(
      notificationHref(makeItem({ type: 'price_drop', payload: { propertyId: 'p-1' } })),
    ).toBe('/property/p-1')
    expect(
      notificationHref(makeItem({ type: 'listing_approved', payload: { propertyId: 'p-2' } })),
    ).toBe('/property/p-2')
  })

  it('listing_rejected and listing_expiring → /listing/[id]/edit', () => {
    expect(
      notificationHref(makeItem({ type: 'listing_rejected', payload: { propertyId: 'p-3' } })),
    ).toBe('/listing/p-3/edit')
    expect(
      notificationHref(makeItem({ type: 'listing_expiring', payload: { propertyId: 'p-4' } })),
    ).toBe('/listing/p-4/edit')
  })

  it('new_review → /agent/[slug]#reviews', () => {
    expect(
      notificationHref(makeItem({ type: 'new_review', payload: { agentSlug: 'anna-k' } })),
    ).toBe('/agent/anna-k#reviews')
  })

  it('saved_search_match falls back to /search without a searchId', () => {
    expect(notificationHref(makeItem({ type: 'saved_search_match', payload: {} }))).toBe('/search')
  })

  it('returns null when the required payload id is missing (treated as stale)', () => {
    expect(notificationHref(makeItem({ type: 'message', payload: {} }))).toBeNull()
    expect(notificationHref(makeItem({ type: 'new_review', payload: {} }))).toBeNull()
  })
})

// ── Relative time (doc examples: "now", "5m", "2h", "1d") ──────────────────

describe('formatRelativeTime()', () => {
  const now = new Date('2026-07-12T12:00:00.000Z')

  it('< 1 minute → "now"', () => {
    expect(formatRelativeTime('2026-07-12T11:59:30.000Z', now)).toBe('now')
  })

  it('5 minutes → "5m"', () => {
    expect(formatRelativeTime('2026-07-12T11:55:00.000Z', now)).toBe('5m')
  })

  it('2 hours → "2h"', () => {
    expect(formatRelativeTime('2026-07-12T10:00:00.000Z', now)).toBe('2h')
  })

  it('1 day → "1d"', () => {
    expect(formatRelativeTime('2026-07-11T12:00:00.000Z', now)).toBe('1d')
  })
})

// ── Badge count (doc §2 "9+ overflow") ──────────────────────────────────────

describe('formatBadgeCount()', () => {
  it('shows the exact count at or below the max', () => {
    expect(formatBadgeCount(0)).toBe('0')
    expect(formatBadgeCount(9)).toBe('9')
  })

  it('overflows to "{max}+" above the max', () => {
    expect(formatBadgeCount(10)).toBe('9+')
    expect(formatBadgeCount(42)).toBe('9+')
  })
})

// ── List mutations ───────────────────────────────────────────────────────────

describe('mergeIncomingNotification()', () => {
  it('prepends a new item', () => {
    const existing = [makeItem({ id: '1' })]
    const incoming = makeItem({ id: '2' })
    expect(mergeIncomingNotification(existing, incoming).map((i) => i.id)).toEqual(['2', '1'])
  })

  it('is idempotent for a duplicate id', () => {
    const existing = [makeItem({ id: '1' })]
    const incoming = makeItem({ id: '1', read: true })
    const result = mergeIncomingNotification(existing, incoming)
    expect(result).toBe(existing)
  })
})

describe('setReadState() / removeNotification() / markAllRead() / countUnread()', () => {
  const items = [
    makeItem({ id: '1', read: false }),
    makeItem({ id: '2', read: false }),
    makeItem({ id: '3', read: true }),
  ]

  it('setReadState() flips only the targeted item', () => {
    const result = setReadState(items, '1', true)
    expect(result.find((i) => i.id === '1')?.read).toBe(true)
    expect(result.find((i) => i.id === '2')?.read).toBe(false)
  })

  it('removeNotification() drops the targeted item only', () => {
    expect(removeNotification(items, '2').map((i) => i.id)).toEqual(['1', '3'])
  })

  it('markAllRead() marks every item read', () => {
    expect(markAllRead(items).every((i) => i.read)).toBe(true)
  })

  it('countUnread() counts unread items', () => {
    expect(countUnread(items)).toBe(2)
    expect(countUnread(markAllRead(items))).toBe(0)
  })
})
