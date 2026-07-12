'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import BellBadge from './BellBadge'
import NotificationDropdown from './NotificationDropdown'

interface NotificationBellDesktopProps {
  scrolled: boolean
  unreadCount: number
  onMarkAllRead: () => void
  onItemRead: (id: string) => void
}

/**
 * Desktop header bell (doc §3.1): click opens the dropdown panel; outside
 * click / Esc closes it (doc §7 accessibility).
 */
export default function NotificationBellDesktop({
  scrolled,
  unreadCount,
  onMarkAllRead,
  onItemRead,
}: NotificationBellDesktopProps) {
  const tHeader = useTranslations('header')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOutsideClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`${tHeader('notifications')}, ${unreadCount} unread`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative p-2 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          scrolled
            ? 'text-gray-600 hover:text-primary hover:bg-gray-100'
            : 'text-white/80 hover:text-white hover:bg-white/10',
        )}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        <BellBadge count={unreadCount} />
      </button>
      {open && (
        <NotificationDropdown onMarkAllRead={onMarkAllRead} onItemRead={onItemRead} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}
