/**
 * Unit tests for Page 09 (Messages / Inbox) zod schemas (lib/messages/schemas.ts).
 *
 * Covers the validation contract documented in docs/en/pages/09-messages.md §5
 * (message body/attachments limits, attachment upload request, block/report
 * payloads, and the list/thread query params).
 */

import { describe, it, expect } from 'vitest'
import {
  attachmentSchema,
  messageSchema,
  attachmentUploadRequestSchema,
  conversationPatchSchema,
  conversationsQuerySchema,
  messagesQuerySchema,
  blockSchema,
  conversationReportSchema,
  ATTACHMENT_TYPES,
} from '../lib/messages/schemas'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
const OTHER_UUID = '660e8400-e29b-41d4-a716-446655440000'

// ── attachmentSchema ─────────────────────────────────────────────────────────

describe('attachmentSchema', () => {
  it('accepts a valid image attachment', () => {
    const result = attachmentSchema.safeParse({
      url: 'https://example.supabase.co/storage/v1/object/public/message-attachments/a.jpg',
      type: 'image/jpeg',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-URL string', () => {
    const result = attachmentSchema.safeParse({ url: 'not-a-url', type: 'image/jpeg' })
    expect(result.success).toBe(false)
  })

  it('rejects an unsupported mime type', () => {
    const result = attachmentSchema.safeParse({
      url: 'https://example.com/a.gif',
      type: 'image/gif',
    })
    expect(result.success).toBe(false)
  })

  it('only allows jpeg, png, webp', () => {
    expect(ATTACHMENT_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})

// ── messageSchema (POST /api/messages) ────────────────────────────────────────

describe('messageSchema', () => {
  it('accepts a valid text-only message', () => {
    const result = messageSchema.safeParse({
      conversationId: VALID_UUID,
      body: 'Is it still available?',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a message with attachments', () => {
    const result = messageSchema.safeParse({
      conversationId: VALID_UUID,
      body: 'Floor plan attached',
      attachments: [{ url: 'https://example.com/plan.png', type: 'image/png' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-UUID conversationId', () => {
    const result = messageSchema.safeParse({ conversationId: '8423', body: 'Hi' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty body', () => {
    const result = messageSchema.safeParse({ conversationId: VALID_UUID, body: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a body longer than 2000 characters', () => {
    const result = messageSchema.safeParse({
      conversationId: VALID_UUID,
      body: 'a'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts a body of exactly 2000 characters', () => {
    const result = messageSchema.safeParse({
      conversationId: VALID_UUID,
      body: 'a'.repeat(2000),
    })
    expect(result.success).toBe(true)
  })

  it('rejects more than 5 attachments', () => {
    const attachments = Array.from({ length: 6 }, (_, i) => ({
      url: `https://example.com/${i}.png`,
      type: 'image/png' as const,
    }))
    const result = messageSchema.safeParse({ conversationId: VALID_UUID, body: 'Hi', attachments })
    expect(result.success).toBe(false)
  })

  it('accepts exactly 5 attachments', () => {
    const attachments = Array.from({ length: 5 }, (_, i) => ({
      url: `https://example.com/${i}.png`,
      type: 'image/png' as const,
    }))
    const result = messageSchema.safeParse({ conversationId: VALID_UUID, body: 'Hi', attachments })
    expect(result.success).toBe(true)
  })

  it('rejects a missing conversationId', () => {
    const result = messageSchema.safeParse({ body: 'Hi' })
    expect(result.success).toBe(false)
  })
})

// ── attachmentUploadRequestSchema ─────────────────────────────────────────────

describe('attachmentUploadRequestSchema', () => {
  const base = {
    conversationId: VALID_UUID,
    fileName: 'floorplan.png',
    contentType: 'image/png' as const,
    size: 1024,
  }

  it('accepts a valid upload request', () => {
    expect(attachmentUploadRequestSchema.safeParse(base).success).toBe(true)
  })

  it('rejects a file over 5 MB', () => {
    const result = attachmentUploadRequestSchema.safeParse({
      ...base,
      size: 5 * 1024 * 1024 + 1,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a file at exactly 5 MB', () => {
    const result = attachmentUploadRequestSchema.safeParse({ ...base, size: 5 * 1024 * 1024 })
    expect(result.success).toBe(true)
  })

  it('rejects an unsupported content type (e.g. PDF)', () => {
    const result = attachmentUploadRequestSchema.safeParse({
      ...base,
      contentType: 'application/pdf',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a negative size', () => {
    const result = attachmentUploadRequestSchema.safeParse({ ...base, size: -1 })
    expect(result.success).toBe(false)
  })
})

// ── conversationPatchSchema ────────────────────────────────────────────────────

describe('conversationPatchSchema', () => {
  it('accepts archived only', () => {
    expect(conversationPatchSchema.safeParse({ archived: true }).success).toBe(true)
  })

  it('accepts muted only', () => {
    expect(conversationPatchSchema.safeParse({ muted: true }).success).toBe(true)
  })

  it('accepts read only', () => {
    expect(conversationPatchSchema.safeParse({ read: true }).success).toBe(true)
  })

  it('accepts a combination of fields', () => {
    expect(conversationPatchSchema.safeParse({ archived: false, muted: true }).success).toBe(true)
  })

  it('rejects an empty object (at least one field required)', () => {
    expect(conversationPatchSchema.safeParse({}).success).toBe(false)
  })
})

// ── conversationsQuerySchema ──────────────────────────────────────────────────

describe('conversationsQuerySchema', () => {
  it('accepts no params (returns everything, filtered client-side)', () => {
    const result = conversationsQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts tab=all/unread/archived', () => {
    for (const tab of ['all', 'unread', 'archived']) {
      expect(conversationsQuerySchema.safeParse({ tab }).success).toBe(true)
    }
  })

  it('rejects an invalid tab value', () => {
    expect(conversationsQuerySchema.safeParse({ tab: 'starred' }).success).toBe(false)
  })

  it('accepts a search string', () => {
    expect(conversationsQuerySchema.safeParse({ search: 'David' }).success).toBe(true)
  })
})

// ── messagesQuerySchema (pagination cursor) ───────────────────────────────────

describe('messagesQuerySchema', () => {
  it('accepts no cursor', () => {
    expect(messagesQuerySchema.safeParse({}).success).toBe(true)
  })

  it('accepts a valid ISO datetime cursor', () => {
    expect(
      messagesQuerySchema.safeParse({ before: '2026-07-01T10:00:00.000Z' }).success,
    ).toBe(true)
  })

  it('rejects a non-datetime cursor', () => {
    expect(messagesQuerySchema.safeParse({ before: 'yesterday' }).success).toBe(false)
  })
})

// ── blockSchema ────────────────────────────────────────────────────────────────

describe('blockSchema', () => {
  it('accepts a valid userId', () => {
    expect(blockSchema.safeParse({ userId: OTHER_UUID }).success).toBe(true)
  })

  it('rejects a non-UUID userId', () => {
    expect(blockSchema.safeParse({ userId: 'not-a-uuid' }).success).toBe(false)
  })
})

// ── conversationReportSchema ──────────────────────────────────────────────────

describe('conversationReportSchema', () => {
  it('accepts a valid report with a note', () => {
    const result = conversationReportSchema.safeParse({
      conversationId: VALID_UUID,
      reason: 'spam',
      note: 'Repeated unsolicited offers',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a report without a note (optional)', () => {
    const result = conversationReportSchema.safeParse({
      conversationId: VALID_UUID,
      reason: 'abuse',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid reason', () => {
    const result = conversationReportSchema.safeParse({
      conversationId: VALID_UUID,
      reason: 'annoying',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a note longer than 500 characters', () => {
    const result = conversationReportSchema.safeParse({
      conversationId: VALID_UUID,
      reason: 'other',
      note: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})
