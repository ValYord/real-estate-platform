'use client'

import Image from 'next/image'
import { RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageItem } from '@/lib/messages/types'

export type ThreadMessage = MessageItem & { pendingStatus?: 'sending' | 'failed' }

interface MessageBubbleProps {
  message: ThreadMessage
  onRetry?: (clientMessage: ThreadMessage) => void
  onOpenImage?: (url: string) => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * A single chat bubble: mine (right, primary) vs theirs (left, neutral),
 * optional image attachment (thumbnail → lightbox), read receipt, and the
 * optimistic send states ("sending…" / "failed to send ⟲ retry").
 */
export default function MessageBubble({ message, onRetry, onOpenImage }: MessageBubbleProps) {
  const mine = message.mine
  const failed = message.pendingStatus === 'failed'
  const sending = message.pendingStatus === 'sending'

  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2',
          mine
            ? 'bg-primary text-white rounded-br-sm ml-auto'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm',
          failed && 'opacity-70',
        )}
      >
        {message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {message.attachments.map((att, i) => (
              <button
                key={`${att.url}-${i}`}
                type="button"
                onClick={() => onOpenImage?.(att.url)}
                className="block w-28 h-28 rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Open image"
              >
                <Image
                  src={att.url}
                  alt="Attachment"
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {message.body && <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>}

        <div
          className={cn(
            'flex items-center gap-1 mt-1 text-xs',
            mine ? 'justify-end text-white/70' : 'text-gray-400',
          )}
        >
          {failed ? (
            <button
              type="button"
              onClick={() => onRetry?.(message)}
              className="flex items-center gap-1 text-red-100 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
            >
              <RotateCw className="w-3 h-3" aria-hidden="true" />
              Failed to send — retry
            </button>
          ) : sending ? (
            <span>Sending…</span>
          ) : (
            <>
              <span>{formatTime(message.createdAt)}</span>
              {mine && (
                <span aria-label={message.read ? 'Read' : 'Sent'}>{message.read ? '✓✓' : '✓'}</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
