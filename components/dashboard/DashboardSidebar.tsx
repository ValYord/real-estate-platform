'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import {
  BarChart2, Home, Heart, MessageSquare, Bell, Search, Settings, LogOut,
  TrendingUp, Menu, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface DashboardSidebarProps {
  userId: string
  userRole: 'user' | 'agent' | 'admin'
  initialUnread: number
  initialNotifications: number
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  badgeKey?: 'messages' | 'notifications'
  disabled?: boolean
}

function Badge({ count, ariaLabel }: { count: number; ariaLabel: string }) {
  if (count <= 0) return null
  const display = count > 9 ? '9+' : String(count)
  return (
    <span
      aria-label={ariaLabel}
      className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center font-medium"
    >
      {display}
    </span>
  )
}

function SidebarNav({
  userId,
  userRole,
  initialUnread,
  initialNotifications,
  onNavClick,
}: DashboardSidebarProps & { onNavClick?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [unreadMessages, setUnreadMessages] = useState(initialUnread)
  const [unreadNotifications, setUnreadNotifications] = useState(initialNotifications)

  // Supabase Realtime: subscribe to new messages and notifications
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`dashboard:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          setUnreadMessages((n) => n + 1)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnreadNotifications((n) => n + 1)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // ?signed_out=1 triggers the SignOutToast in ConditionalChrome
    router.push('/?signed_out=1' as Parameters<typeof router.push>[0])
  }

  const navItems: NavItem[] = [
    { icon: BarChart2, label: 'Overview', href: '/dashboard' },
    { icon: Home, label: 'My listings', href: '/dashboard/listings' },
    { icon: Heart, label: 'Favorites', href: '/favorites' },
    { icon: MessageSquare, label: 'Messages', href: '/messages', badgeKey: 'messages' },
    { icon: Bell, label: 'Notifications', href: '/notifications', badgeKey: 'notifications' },
    { icon: Search, label: 'Saved searches', href: '/saved-searches', disabled: true },
    { icon: Settings, label: 'Settings', href: '/settings' },
    ...(userRole === 'agent'
      ? [{ icon: TrendingUp as React.ComponentType<{ className?: string }>, label: 'Pro Dashboard', href: '/pro/dashboard' }]
      : []),
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const getBadgeCount = (badgeKey?: 'messages' | 'notifications') => {
    if (badgeKey === 'messages') return unreadMessages
    if (badgeKey === 'notifications') return unreadNotifications
    return 0
  }

  return (
    <nav aria-label="Personal panel" className="flex flex-col h-full py-3">
      <div className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const badgeCount = getBadgeCount(item.badgeKey)

          return (
            <Link
              key={item.href}
              href={item.href as Parameters<typeof Link>[0]['href']}
              aria-current={active ? 'page' : undefined}
              onClick={onNavClick}
              className={cn(
                'flex items-center gap-3 px-4 h-11 rounded-lg text-sm transition-colors duration-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : item.disabled
                    ? 'text-gray-400 cursor-not-allowed pointer-events-none'
                    : 'text-gray-700 hover:bg-gray-50',
              )}
              aria-disabled={item.disabled ? 'true' : undefined}
            >
              <Icon aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
              {item.badgeKey && badgeCount > 0 && (
                <Badge
                  count={badgeCount}
                  ariaLabel={`${badgeCount} unread ${item.badgeKey}`}
                />
              )}
            </Link>
          )
        })}
      </div>

      {/* Divider + Sign out */}
      <div className="px-3 pb-3 border-t border-gray-100 pt-3 mt-2">
        <button
          onClick={handleSignOut}
          className={cn(
            'flex items-center gap-3 px-4 h-11 rounded-lg text-sm w-full text-gray-700',
            'hover:bg-gray-50 transition-colors duration-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <LogOut aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  )
}

export default function DashboardSidebar(props: DashboardSidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Close drawer on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  // Focus close button when drawer opens
  useEffect(() => {
    if (drawerOpen) closeButtonRef.current?.focus()
  }, [drawerOpen])

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 bg-white sticky top-16 h-[calc(100vh-4rem)] flex-shrink-0 overflow-y-auto">
        <SidebarNav {...props} />
      </aside>

      {/* Mobile hamburger button — shown inside the dashboard content header */}
      <button
        className="lg:hidden fixed top-[4.5rem] left-4 z-40 p-2 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open dashboard navigation"
        aria-expanded={drawerOpen}
        aria-controls="dashboard-drawer"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        className={cn(
          'fixed inset-0 bg-black/40 z-50 lg:hidden transition-opacity duration-300',
          drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Mobile drawer */}
      <div
        id="dashboard-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation"
        className={cn(
          'fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 lg:hidden',
          'flex flex-col transition-transform duration-300',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 flex-shrink-0">
          <span className="text-base font-semibold text-gray-900">My Account</span>
          <button
            ref={closeButtonRef}
            onClick={() => setDrawerOpen(false)}
            aria-label="Close dashboard navigation"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav {...props} onNavClick={() => setDrawerOpen(false)} />
        </div>
      </div>
    </>
  )
}
