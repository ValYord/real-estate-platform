'use client'

import { Bell } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import BellBadge from './BellBadge'

interface NotificationBellMobileLinkProps {
  unreadCount: number
  onNavigate?: () => void
}

/**
 * Mobile bell (doc §2/§6 "<768px"): tapping goes straight to
 * `/notifications` instead of opening a dropdown.
 */
export default function NotificationBellMobileLink({ unreadCount, onNavigate }: NotificationBellMobileLinkProps) {
  const tHeader = useTranslations('header')

  return (
    <Link
      href="/notifications"
      onClick={onNavigate}
      aria-label={`${tHeader('notifications')}, ${unreadCount} unread`}
      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary transition-colors"
    >
      <span className="relative">
        <Bell className="w-4 h-4" aria-hidden="true" />
        <BellBadge count={unreadCount} />
      </span>
      {tHeader('notifications')}
    </Link>
  )
}
