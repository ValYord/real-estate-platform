'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import ConversationList from './ConversationList'

/**
 * Two-pane (desktop) / single-pane (mobile) inbox shell.
 *
 * Desktop (lg+): list (360px) and the active pane (`children` — either the
 * "no thread selected" placeholder or the Thread) are both visible.
 * Mobile (<lg): only one is visible at a time, decided by whether the URL
 * has a conversation id segment (`/messages` vs `/messages/[id]`).
 */
export default function MessagesShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // Matches /messages/<id> (with or without a locale prefix) but not /messages itself.
  const hasThread = /\/messages\/[^/]+/.test(pathname)

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white">
      <div
        className={cn(
          'w-full lg:w-[360px] lg:flex-shrink-0 border-r border-gray-200 flex flex-col min-h-0',
          hasThread && 'hidden lg:flex',
        )}
      >
        <ConversationList />
      </div>

      <div className={cn('flex-1 min-w-0 flex flex-col min-h-0', !hasThread && 'hidden lg:flex')}>
        {children}
      </div>
    </div>
  )
}
