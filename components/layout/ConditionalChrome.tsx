'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'
import SignOutToast from './SignOutToast'

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

  if (isAuthPage || isWizardPage) return <>{children}</>

  if (isDashboardPage || isMessagesPage) {
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
      <Header />
      {children}
      <Footer />
      <Suspense>
        <SignOutToast />
      </Suspense>
    </>
  )
}
