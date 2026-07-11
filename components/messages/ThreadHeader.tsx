'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, MoreVertical, User } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { ConversationPeer } from '@/lib/messages/types'

interface ThreadHeaderProps {
  peer: ConversationPeer
  archived: boolean
  blocked: boolean
  onArchiveToggle: () => void
  onBlock: () => void
  onReport: () => void
}

/**
 * Thread header: peer identity + "‹ Back" (mobile) + "⋯" menu
 * (Archive / Block / Report — doc §3.3). Follows the ARIA menu pattern:
 * Escape closes, focus stays managed on the trigger button.
 */
export default function ThreadHeader({
  peer,
  archived,
  blocked,
  onArchiveToggle,
  onBlock,
  onReport,
}: ThreadHeaderProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClickOutside)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClickOutside)
    }
  }, [menuOpen])

  return (
    <div className="flex items-center gap-2 p-3 border-b border-gray-100 flex-shrink-0">
      <button
        type="button"
        onClick={() => router.push('/messages')}
        aria-label="Back to conversation list"
        className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronLeft className="w-5 h-5" aria-hidden="true" />
      </button>

      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
        {peer.avatar ? (
          <Image src={peer.avatar} alt="" width={32} height={32} className="w-full h-full object-cover" />
        ) : (
          <User className="w-4 h-4 text-gray-400" aria-hidden="true" />
        )}
      </div>

      <p className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900">
        {peer.name}
        {peer.verified && <span className="ml-1 text-blue-500">✓</span>}
      </p>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Conversation options"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <MoreVertical className="w-5 h-5" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Conversation options"
            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onArchiveToggle()
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {archived ? 'Unarchive' : 'Archive'}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onReport()
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Report
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onBlock()
              }}
              disabled={blocked}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm',
                blocked ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50',
              )}
            >
              {blocked ? 'Blocked' : 'Block user'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
