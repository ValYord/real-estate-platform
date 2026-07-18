'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'
import SignOutToast from './SignOutToast'
import { LOCALES } from '@/lib/locale'

/**
 * Renders the mega-menu Header + Footer for every page EXCEPT auth pages.
 * Auth pages provide their own minimal chrome (Logo + LangSwitcher).
 *
 * Using `usePathname` (client-side) avoids the need to propagate custom
 * request headers from middleware to Server Components.
 *
 * Dashboard and Messages pages omit the Footer (both own their full-height
 * scroll area — sidebar layout / two-pane inbox, respectively).
 * SignOutToast reads ?signed_out=1 and shows a dismissable notification.
 */
export default function ConditionalChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // Match /[locale]/auth/... paths and wizard pages (/sell/new, /listing/*/edit)
  const isAuthPage = /\/auth\//i.test(pathname) || pathname.endsWith('/auth')
  const isWizardPage = /\/sell\/new/.test(pathname) || /\/listing\/[^/]+\/edit/.test(pathname)
  const isDashboardPage = pathname.includes('/dashboard')
  // Messages (Page 09) is an app-like, full-height two-pane inbox — no footer.
  const isMessagesPage = /\/messages(\/|$)/.test(pathname)
  // Settings (Page 21) is an app-like admin panel — no footer, same as Dashboard.
  const isSettingsPage = /\/settings(\/|$)/.test(pathname)
  // Admin panel (Page 24) renders its own top bar (AdminTopBar) and never the
  // public mega-menu Header/Footer — it's a fully separate internal tool, and
  // AdminLayout's server-side 403 branch must be the entire response body for
  // a non-admin (no public chrome wrapped around it either).
  const isAdminPage = /\/admin(\/|$)/.test(pathname)
  // Home (`/en`, `/hy`, `/ru`) is the only page with a full-bleed hero image
  // behind the header (docs/en/pages/01-home.md §3.1) — every other route
  // renders the header on a plain light page background, so it must start
  // solid/opaque there instead of transparent-until-scroll (which otherwise
  // leaves the white logo/nav text invisible on a white page).
  const isHomePage = new RegExp(`^/(${LOCALES.join('|')})/?$`).test(pathname)

  if (isAuthPage || isWizardPage || isAdminPage) return <>{children}</>

  if (isDashboardPage || isMessagesPage || isSettingsPage) {
    return (
      <>
        <Header />
        {children}
        <Suspense>
          <SignOutToast />
        </Suspense>
      </>
    )
  }

  return (
    <>
      <Header transparent={isHomePage} />
      {children}
      <Footer />
      <Suspense>
        <SignOutToast />
      </Suspense>
    </>
  )
}
