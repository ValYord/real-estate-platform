/**
 * Unit tests for lib/notifications/navigation.ts — the click-to-target /
 * stale-target resolver (doc §3.3 "Click → target" / §3.5 "Stale target").
 *
 * `resolveNotificationTarget` takes the Supabase client as a plain argument
 * (dependency injection), so these tests just hand it a minimal fake client
 * shaped like the `.from().select().eq().maybeSingle()` chain it calls —
 * no module mocking needed.
 */
import { describe, it, expect } from 'vitest'
import { resolveNotificationTarget } from '../lib/notifications/navigation'
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

/** A fake Supabase client whose `.from(table)` existence check resolves to `found`. */
function makeFakeClient(existsByTable: Record<string, boolean>) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: existsByTable[table] ? { id: 'exists' } : null,
              error: null,
            }),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('resolveNotificationTarget()', () => {
  it('message: resolves to /messages/[id] when the conversation exists', async () => {
    const client = makeFakeClient({ conversations: true })
    const item = makeItem({ type: 'message', payload: { conversationId: 'conv-1' } })
    await expect(resolveNotificationTarget(client, item)).resolves.toEqual({
      href: '/messages/conv-1',
      stale: false,
    })
  })

  it('message: resolves stale when the conversation no longer exists / is inaccessible', async () => {
    const client = makeFakeClient({ conversations: false })
    const item = makeItem({ type: 'message', payload: { conversationId: 'conv-1' } })
    await expect(resolveNotificationTarget(client, item)).resolves.toEqual({ href: null, stale: true })
  })

  it('price_drop: resolves to /property/[id] when the property exists', async () => {
    const client = makeFakeClient({ properties: true })
    const item = makeItem({ type: 'price_drop', payload: { propertyId: 'p-1', title: 'x', percent: 5 } })
    await expect(resolveNotificationTarget(client, item)).resolves.toEqual({
      href: '/property/p-1',
      stale: false,
    })
  })

  it('listing_rejected: resolves stale when the property no longer exists', async () => {
    const client = makeFakeClient({ properties: false })
    const item = makeItem({ type: 'listing_rejected', payload: { propertyId: 'p-1' } })
    await expect(resolveNotificationTarget(client, item)).resolves.toEqual({ href: null, stale: true })
  })

  it('saved_search_match: resolves without an existence check (target page out of scope)', async () => {
    const client = makeFakeClient({})
    const item = makeItem({ type: 'saved_search_match', payload: { searchId: 's-1' } })
    await expect(resolveNotificationTarget(client, item)).resolves.toEqual({
      href: '/saved-searches/s-1',
      stale: false,
    })
  })

  it('new_review: resolves without an existence check (target page out of scope)', async () => {
    const client = makeFakeClient({})
    const item = makeItem({ type: 'new_review', payload: { agentSlug: 'anna-k' } })
    await expect(resolveNotificationTarget(client, item)).resolves.toEqual({
      href: '/agent/anna-k#reviews',
      stale: false,
    })
  })

  it('returns stale immediately when the payload is missing the id the type needs', async () => {
    const client = makeFakeClient({})
    const item = makeItem({ type: 'message', payload: {} })
    await expect(resolveNotificationTarget(client, item)).resolves.toEqual({ href: null, stale: true })
  })
})
