'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'

/**
 * Renders the mega-menu Header + Footer for every page EXCEPT auth pages.
 * Auth pages provide their own minimal chrome (Logo + LangSwitcher).
 *
 * Using `usePathname` (client-side) avoids the need to propagate custom
 * request headers from middleware to Server Components.
 */
export default function ConditionalChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // Match /[locale]/auth/... paths and wizard pages (/sell/new, /listing/*/edit)
  const isAuthPage = /\/auth\//i.test(pathname) || pathname.endsWith('/auth')
  const isWizardPage = /\/sell\/new/.test(pathname) || /\/listing\/[^/]+\/edit/.test(pathname)

  if (isAuthPage || isWizardPage) return <>{children}</>

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}
