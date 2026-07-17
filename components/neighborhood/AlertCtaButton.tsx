'use client'

import { useState } from 'react'
import { usePathname } from '@/i18n/navigation'
import Button from '@/components/ui/Button'
import SaveSearchModal from '@/components/search/SaveSearchModal'
import SignInPromptModal from '@/components/search/SignInPromptModal'
import { hasSessionCookie } from '@/lib/auth/hasSessionCookie'
import type { Filters } from '@/lib/search/filtersSchema'

interface AlertCtaButtonProps {
  city: string
  district: string
  areaName: string
  size?: 'md' | 'lg'
}

/**
 * "Get an alert" CTA — reuses the exact trio `SearchPageClient` wires up for
 * its own [💾 Save search] button (`hasSessionCookie` → `SaveSearchModal` /
 * `SignInPromptModal`), pre-filled with this area's city/district so the
 * resulting saved search matches `/search?city=&district=` (product doc
 * §3.9, behind login).
 */
export default function AlertCtaButton({ city, district, areaName, size = 'lg' }: AlertCtaButtonProps) {
  const pathname = usePathname()
  const [modalOpen, setModalOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [toast, setToast] = useState<'saved' | 'duplicate' | null>(null)

  const filters: Filters = { deal: 'sale', city, district, sort: 'newest', page: 1 }

  const handleClick = () => {
    if (hasSessionCookie()) setModalOpen(true)
    else setSignInOpen(true)
  }

  return (
    <>
      <Button variant="secondary" size={size} onClick={handleClick}>
        Get an alert for {areaName}
      </Button>

      {modalOpen && (
        <SaveSearchModal
          filters={filters}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            setToast('saved')
          }}
          onDuplicate={() => {
            setModalOpen(false)
            setToast('duplicate')
          }}
        />
      )}

      {signInOpen && <SignInPromptModal redirectTo={pathname} onClose={() => setSignInOpen(false)} />}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-text text-surface"
        >
          {toast === 'duplicate' ? 'This search is already saved' : 'Alert created — you’ll be notified of new matches'}
        </div>
      )}
    </>
  )
}
