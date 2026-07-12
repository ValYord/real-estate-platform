'use client'

import type { ReactNode } from 'react'
import type { UserMe } from '@/lib/settings/types'
import SettingsProvider from './SettingsContext'
import SettingsTabs from './SettingsTabs'

/**
 * Client shell for Page 21 (Settings). SSR-loaded `initialUser` (via
 * GET /api/users/me on the server, see app/[locale]/settings/layout.tsx)
 * seeds the shared context; all further mutations happen client-side.
 *
 * Layout (§2): vertical tabs (desktop, w-56) + form panel; horizontal
 * scroll chips + stacked form on mobile.
 */
export default function SettingsShell({
  initialUser,
  children,
}: {
  initialUser: UserMe
  children: ReactNode
}) {
  return (
    <SettingsProvider initialUser={initialUser}>
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
          <SettingsTabs />
          <div className="flex-1 min-w-0 max-w-md">{children}</div>
        </div>
      </div>
    </SettingsProvider>
  )
}
