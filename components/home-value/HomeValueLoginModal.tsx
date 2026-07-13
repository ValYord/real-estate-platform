'use client'

import { useEffect, useRef } from 'react'
import { X, Home as HomeIcon } from 'lucide-react'
import { Link } from '@/i18n/navigation'

interface HomeValueLoginModalProps {
  title: string
  description: string
  /** `next=` redirect target (locale-stripped path + query), e.g. "/home-value?lat=...". */
  redirectTo: string
  onClose: () => void
}

/**
 * Guest gate for "Claim my home" / value alerts (docs §3.7, §5 — "Claim/alert:
 * requires auth (401 → login modal with `?next`)"). Structurally mirrors
 * components/search/SignInPromptModal.tsx (focus-on-open, Esc to close,
 * overlay click to close) with home-value-specific copy.
 */
export function HomeValueLoginModal({ title, description, redirectTo, onClose }: HomeValueLoginModalProps) {
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
  const registerHref = `/auth/register?next=${encodeURIComponent(redirectTo)}`

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hv-login-title"
        aria-describedby="hv-login-desc"
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
            <HomeIcon className="w-8 h-8 text-primary" aria-hidden="true" />
          </span>
        </div>

        <h2 id="hv-login-title" className="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h2>
        <p id="hv-login-desc" className="text-sm text-gray-500 mb-6">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={loginHref as Parameters<typeof Link>[0]['href']}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
          <Link
            href={registerHref as Parameters<typeof Link>[0]['href']}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
