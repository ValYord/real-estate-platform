/**
 * Type definitions for the Messages / Inbox page (Page 09).
 */

export type ConversationTab = 'all' | 'unread' | 'archived'

export interface AttachmentItem {
  url: string
  type: 'image/jpeg' | 'image/png' | 'image/webp'
}

// ── Conversation list (GET /api/conversations) ──────────────────────────────

export interface ConversationPeer {
  id: string
  name: string
  avatar: string | null
  role: 'user' | 'agent' | 'admin'
  verified: boolean
}

export interface ConversationProperty {
  id: string
  thumb: string | null
  price: number
  currency: string
  title: string
  status: string
}

export interface ConversationListItem {
  id: string
  property: ConversationProperty | null
  peer: ConversationPeer
  lastMessage: {
    body: string
    createdAt: string
    mine: boolean
  } | null
  unreadCount: number
  archived: boolean
  muted: boolean
  blocked: boolean
  lastMessageAt: string
}

export interface ConversationsResponse {
  items: ConversationListItem[]
}

// ── Thread messages (GET /api/conversations/[id]/messages) ─────────────────

export interface MessageItem {
  id: string
  conversationId: string
  senderId: string
  mine: boolean
  body: string
  attachments: AttachmentItem[]
  read: boolean
  createdAt: string
}

export interface MessagesResponse {
  items: MessageItem[]
  nextCursor: string | null
}

// ── POST /api/messages ───────────────────────────────────────────────────────

export interface SendMessageResponse {
  id: string
  createdAt: string
}

// ── POST /api/messages/attachments ──────────────────────────────────────────

export interface AttachmentUploadResponse {
  uploadUrl: string
  token: string
  path: string
  publicUrl: string
}

// ── Optimistic send UI state ─────────────────────────────────────────────────

export type PendingMessageStatus = 'sending' | 'sent' | 'failed'

export interface PendingMessage {
  /** Client-generated temp id, replaced by the server id once confirmed. */
  clientId: string
  conversationId: string
  body: string
  attachments: AttachmentItem[]
  status: PendingMessageStatus
  createdAt: string
}
