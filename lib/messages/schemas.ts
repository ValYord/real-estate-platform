import { z } from 'zod'

/**
 * Zod validation for Page 09 — Messages / Inbox.
 * Mirrors the schema documented in docs/en/pages/09-messages.md §5
 * (adapted from numeric example ids to the UUID primary keys this project
 * actually uses for `conversations`/`messages`).
 */

// ── Attachments ────────────────────────────────────────────────────────────

export const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const attachmentSchema = z.object({
  url: z.string().url(),
  type: z.enum(ATTACHMENT_TYPES),
})

export type AttachmentInput = z.infer<typeof attachmentSchema>

// ── POST /api/messages ──────────────────────────────────────────────────────

export const messageSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a UUID'),
  body: z.string().min(1, 'Empty message').max(2000, 'Message is too long'),
  attachments: z.array(attachmentSchema).max(5, 'Max 5 attachments').optional(),
})

export type MessageInput = z.infer<typeof messageSchema>

// ── POST /api/messages/attachments (signed upload URL request) ────────────

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024 // 5 MB, per doc §5 "Attachment limits"

export const attachmentUploadRequestSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a UUID'),
  fileName: z.string().min(1).max(200),
  contentType: z.enum(ATTACHMENT_TYPES, {
    errorMap: () => ({ message: 'Only JPG, PNG, or WebP images are allowed' }),
  }),
  size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES, 'File is too large, max 5 MB'),
})

export type AttachmentUploadRequest = z.infer<typeof attachmentUploadRequestSchema>

// ── PATCH /api/conversations/[id] ───────────────────────────────────────────

export const conversationPatchSchema = z
  .object({
    archived: z.boolean().optional(),
    muted: z.boolean().optional(),
    read: z.boolean().optional(),
  })
  .refine((data) => data.archived !== undefined || data.muted !== undefined || data.read !== undefined, {
    message: 'At least one of archived, muted, read must be provided',
  })

export type ConversationPatchInput = z.infer<typeof conversationPatchSchema>

// ── GET /api/conversations ──────────────────────────────────────────────────

export const conversationsQuerySchema = z.object({
  // No default: omitting `tab` means "return everything" so the client can
  // do instant, refetch-free tab switching over a single fetched list.
  tab: z.enum(['all', 'unread', 'archived']).optional(),
  search: z.string().max(200).optional(),
})

export type ConversationsQueryInput = z.infer<typeof conversationsQuerySchema>

// ── GET /api/conversations/[id]/messages ────────────────────────────────────

export const messagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
})

export type MessagesQueryInput = z.infer<typeof messagesQuerySchema>

// ── POST /api/blocks ─────────────────────────────────────────────────────────

export const blockSchema = z.object({
  userId: z.string().uuid('userId must be a UUID'),
})

export type BlockInput = z.infer<typeof blockSchema>

// ── POST /api/reports ────────────────────────────────────────────────────────

export const conversationReportSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a UUID'),
  reason: z.enum(['spam', 'fraud', 'abuse', 'other'], {
    errorMap: () => ({ message: 'Invalid reason' }),
  }),
  note: z.string().max(500).optional(),
})

export type ConversationReportInput = z.infer<typeof conversationReportSchema>
