'use client'

import Image from 'next/image'
import { Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatConversationTimestamp } from '@/lib/messages/helpers'
import type { ConversationListItem } from '@/lib/messages/types'

interface ConversationRowProps {
  item: ConversationListItem
  active: boolean
  onSelect: (id: string) => void
}

export default function ConversationRow({ item, active, onSelect }: ConversationRowProps) {
  const unread = item.unreadCount > 0

  return (
    <li role="listitem">
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={active ? 'true' : undefined}
        aria-label={
          unread ? `${item.peer.name}, ${item.unreadCount} unread` : item.peer.name
        }
        className={cn(
          'w-full flex gap-3 p-3 text-left hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
          active && 'bg-primary/5 border-l-2 border-primary',
        )}
      >
        {/* Property thumbnail */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
          {item.property?.thumb ? (
            <Image
              src={item.property.thumb}
              alt=""
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <Home className="w-5 h-5 text-gray-300" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn('truncate text-sm', unread ? 'font-semibold text-gray-900' : 'text-gray-700')}>
              {item.peer.name}
              {item.peer.verified && <span className="ml-1 text-blue-500">✓</span>}
            </p>
            <span className="flex-shrink-0 text-xs text-gray-400">
              {formatConversationTimestamp(item.lastMessageAt)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p
              className={cn(
                'truncate text-sm',
                unread ? 'font-medium text-gray-800' : 'text-gray-500',
              )}
            >
              {item.lastMessage
                ? `${item.lastMessage.mine ? 'You: ' : ''}${item.lastMessage.body}`
                : 'No messages yet'}
            </p>
            {unread && (
              <span className="flex-shrink-0 bg-primary text-white text-xs rounded-full px-1.5 min-w-5 text-center">
                {item.unreadCount}
              </span>
            )}
          </div>

          {item.property && (
            <p className="truncate text-xs text-gray-400 mt-0.5">{item.property.title}</p>
          )}
        </div>
      </button>
    </li>
  )
}
