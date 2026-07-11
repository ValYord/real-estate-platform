'use client'

import { useMemo } from 'react'
import { insertDaySeparators } from '@/lib/messages/helpers'
import MessageBubble, { type ThreadMessage } from './MessageBubble'

interface MessageListProps {
  messages: ThreadMessage[]
  onRetry: (message: ThreadMessage) => void
  onOpenImage: (url: string) => void
}

/**
 * Scrollable message area: day separators + bubbles.
 * `aria-live="polite"` announces new bubbles without spamming per keystroke.
 */
export default function MessageList({ messages, onRetry, onOpenImage }: MessageListProps) {
  const entries = useMemo(() => insertDaySeparators(messages), [messages])

  return (
    <div
      className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-2"
      aria-live="polite"
      aria-label="Messages"
    >
      {entries.map((entry) =>
        entry.kind === 'separator' ? (
          <p key={entry.key} className="text-center text-xs text-gray-400 my-3">
            {entry.label}
          </p>
        ) : (
          <MessageBubble
            key={entry.key}
            message={entry.message as ThreadMessage}
            onRetry={onRetry}
            onOpenImage={onOpenImage}
          />
        ),
      )}
    </div>
  )
}
