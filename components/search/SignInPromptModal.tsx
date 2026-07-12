'use client'

import { useEffect, useRef } from 'react'
import { X, Bell } from 'lucide-react'
import { Link } from '@/i18n/navigation'

interface SignInPromptModalProps {
  /** `next=` redirect target, e.g. "/search?deal=sale&city=Yerevan". */
  redirectTo: string
  onClose: () => void
}

/**
 * Guest flow for [💾 Save search]. Unlike `useFavoriteToggle`'s guest ♡
 * redirect, this does NOT hard-navigate away immediately — the user is
 * mid-session with live filters on screen, and losing that context to a
 * full navigation on a single misclick is worse UX than for a single ♡ tap.
 * Content mirrors `FavoritesLoginWall`'s heading/body/button pair.
 */
export default function SignInPromptModal({ redirectTo, onClose }: SignInPromptModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const loginHref = `/auth/login?next=${encodeURIComponent(redirectTo)}`

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-prompt-title"
        aria-describedby="signin-prompt-desc"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center"
      >
        <div className="flex justify-end mb-2">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <span className="w-16 h-16 flex items-center justify-center bg-primary/10 rounded-full">
            <Bell className="w-8 h-8 text-primary" aria-hidden="true" />
          </span>
        </div>

        <h2 id="signin-prompt-title" className="text-xl font-semibold text-gray-900 mb-2">
          Sign in to save this search
        </h2>
        <p id="signin-prompt-desc" className="text-sm text-gray-500 mb-6">
          Save your filters and we&apos;ll email you when a new match appears.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={loginHref as Parameters<typeof Link>[0]['href']}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
