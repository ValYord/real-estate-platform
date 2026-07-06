'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'

/**
 * Shows a "You've signed out" toast when the page is reached via a redirect
 * from the sign-out action (detected via ?signed_out=1 query param).
 *
 * Must be rendered inside a Suspense boundary (App Router requirement for
 * useSearchParams in Client Components).
 */
export default function SignOutToast() {
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchParams.get('signed_out') === '1') {
      setVisible(true)

      // Strip the search param without a full page reload
      const url = new URL(window.location.href)
      url.searchParams.delete('signed_out')
      window.history.replaceState({}, '', url.toString())

      timerRef.current = setTimeout(() => setVisible(false), 5000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [searchParams])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg"
    >
      <span>You&apos;ve signed out</span>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="p-0.5 rounded hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
