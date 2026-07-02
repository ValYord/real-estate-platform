import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import AuthLangSwitcher from '@/components/auth/LangSwitcher'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * Auth layout — Server Component shell.
 *
 * Renders minimal chrome:
 *   - Logo (top left) → home
 *   - Lang switcher (top right)
 *   - Small legal footer links
 *
 * The mega-menu Header/Footer from the parent locale layout is suppressed by
 * the ConditionalChrome component which detects /auth/ paths.
 *
 * Inner forms are Client Components (use client).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Minimal header ── */}
      <header className="w-full px-4 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link
          href="/"
          className="text-xl font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          aria-label="RE Platform — Home"
        >
          RE Platform
        </Link>
        <AuthLangSwitcher />
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* ── Legal footer ── */}
      <footer className="py-4 text-center text-xs text-gray-400 space-x-3">
        <Link href="/legal/terms" className="hover:underline">
          Terms
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/legal/privacy" className="hover:underline">
          Privacy
        </Link>
        <span aria-hidden="true">·</span>
        <span>© {new Date().getFullYear()} RE Platform</span>
      </footer>
    </div>
  )
}
