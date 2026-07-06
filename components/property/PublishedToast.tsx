'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'

/**
 * Shows a dismissable "Published 🎉" toast when the page is reached
 * via a redirect from the listing wizard (detected via ?published=1 param).
 *
 * Must be rendered inside a Suspense boundary because useSearchParams()
 * requires it in the Next.js App Router.
 */
export default function PublishedToast() {
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchParams.get('published') === '1') {
      setVisible(true)

      // Strip the search param from the URL without a full page reload
      const url = new URL(window.location.href)
      url.searchParams.delete('published')
      window.history.replaceState({}, '', url.toString())

      // Auto-dismiss after 6 s
      timerRef.current = setTimeout(() => setVisible(false), 6000)
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
      aria-atomic="true"
      className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-green-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg max-w-xs"
    >
      <span>Published 🎉 Your listing is now live!</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
