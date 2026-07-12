'use client'

import { usePathname } from '@/i18n/navigation'
import { User, Lock, Settings as SettingsIcon, Bell, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from './SettingsContext'

interface TabDef {
  key: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

// The Agent tab (/settings/agent) is Phase 2 — intentionally omitted here.
const TABS: TabDef[] = [
  { key: 'profile', label: 'Profile', href: '/settings/profile', icon: User },
  { key: 'account', label: 'Account', href: '/settings/account', icon: Lock },
  { key: 'preferences', label: 'Preferences', href: '/settings/preferences', icon: SettingsIcon },
  { key: 'notifications', label: 'Notifications', href: '/settings/notifications', icon: Bell },
  { key: 'privacy', label: 'Privacy', href: '/settings/privacy', icon: Shield },
]

/**
 * Deep-linkable Settings tab nav (§2). Vertical list on desktop, horizontal
 * scroll chips on mobile. Navigation goes through `guardedNavigate` so a
 * dirty Profile/Account form prompts before switching tabs (§3.1).
 */
export default function SettingsTabs() {
  const pathname = usePathname()
  const { guardedNavigate } = useSettings()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav
      role="tablist"
      aria-label="Settings sections"
      className={cn(
        // Mobile: horizontal scroll chips. Desktop (lg): vertical list.
        'flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible',
        'lg:w-56 lg:flex-shrink-0 pb-2 lg:pb-0',
        'border-b lg:border-b-0 border-gray-200',
      )}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon
        const active = isActive(tab.href)
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active ? 'page' : undefined}
            onClick={() => guardedNavigate(tab.href)}
            className={cn(
              'flex items-center gap-2 px-3 h-10 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              // Mobile active state: bottom border chip per the spec.
              'border-b-2 lg:border-b-0',
              active
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-transparent text-gray-700 hover:bg-gray-50',
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
