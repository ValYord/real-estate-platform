'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { readConsent, writeConsent } from '@/lib/cookies/storage'
import { acceptAllConsent, necessaryOnlyConsent, buildConsent } from '@/lib/cookies/policy'
import { OPEN_COOKIE_PREFERENCES_EVENT } from '@/lib/cookies/events'
import type { CookieConsentValue } from '@/lib/cookies/types'
import Switch from '@/components/ui/Switch'

/**
 * Global cookie consent banner + preferences modal (Page 23 §3.6).
 *
 * Mounted once in the root locale layout so it appears on every page.
 * Before any choice is made, no non-necessary script is loaded anywhere in
 * the app — components that would load analytics/marketing scripts read
 * consent via `lib/cookies/policy.ts` + the `cookie-consent-changed` event,
 * they never assume consent.
 */
export default function CookieConsent() {
  const t = useTranslations('static.cookieConsent')

  const [consent, setConsent] = useState<CookieConsentValue | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [draftAnalytics, setDraftAnalytics] = useState(false)
  const [draftMarketing, setDraftMarketing] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setConsent(readConsent())
    setHydrated(true)
  }, [])

  // Allow other parts of the app (e.g. the /cookies page's "Manage
  // preferences" button) to reopen the modal without prop drilling.
  useEffect(() => {
    const openModal = () => {
      setDraftAnalytics(consent?.analytics ?? false)
      setDraftMarketing(consent?.marketing ?? false)
      setModalOpen(true)
    }
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openModal)
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openModal)
  }, [consent])

  // Focus the first interactive element when the modal opens.
  useEffect(() => {
    if (modalOpen) {
      modalRef.current?.querySelector<HTMLElement>('button, [role="switch"]')?.focus()
    }
  }, [modalOpen])

  const isFirstVisit = consent === null

  const persist = useCallback((next: CookieConsentValue) => {
    writeConsent(next)
    setConsent(next)
    setModalOpen(false)
  }, [])

  const handleAcceptAll = () => persist(acceptAllConsent(Date.now()))
  const handleNecessaryOnly = () => persist(necessaryOnlyConsent(Date.now()))
  const handleConfigure = () => {
    setDraftAnalytics(consent?.analytics ?? false)
    setDraftMarketing(consent?.marketing ?? false)
    setModalOpen(true)
  }
  const handleSave = () => persist(buildConsent(draftAnalytics, draftMarketing, Date.now()))

  const handleModalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Consent is mandatory on first visit — Escape must not dismiss the
    // modal without a choice (docs/en/pages/23-static.md §7). Once a choice
    // already exists, the modal was reopened voluntarily and may be closed.
    if (event.key === 'Escape' && isFirstVisit) {
      event.preventDefault()
      return
    }
    if (event.key === 'Escape' && !isFirstVisit) {
      setModalOpen(false)
      return
    }
    // Minimal focus trap: wrap Tab within the modal.
    if (event.key === 'Tab') {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [role="switch"], a[href]'
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  if (!hydrated || (consent !== null && !modalOpen)) return null

  return (
    <>
      {/* ── Banner (first visit only) ── */}
      {isFirstVisit && !modalOpen && (
        <div
          role="region"
          aria-label={t('bannerTitle')}
          className="fixed bottom-0 inset-x-0 bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] p-4 z-50"
        >
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{t('bannerTitle')}</p>
              <p className="text-sm text-gray-500 mt-1">
                {t('bannerBody')}{' '}
                <Link href="/cookies" className="text-primary underline">
                  {t('managePreferencesLink')}
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleNecessaryOnly}
                className="h-11 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('necessaryOnly')}
              </button>
              <button
                type="button"
                onClick={handleConfigure}
                className="h-11 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('configure')}
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="h-11 px-4 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t('acceptAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preferences modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end md:items-center justify-center p-4">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-modal-title"
            onKeyDown={handleModalKeyDown}
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5"
          >
            <div>
              <h2 id="cookie-modal-title" className="text-lg font-semibold text-gray-900">
                {t('modalTitle')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{t('modalBody')}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t('categories.necessary.label')}
                  </p>
                  <p className="text-xs text-gray-500">{t('categories.necessary.description')}</p>
                </div>
                <Switch
                  checked
                  disabled
                  onChange={() => {}}
                  label={t('categories.necessary.label')}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t('categories.analytics.label')}
                  </p>
                  <p className="text-xs text-gray-500">{t('categories.analytics.description')}</p>
                </div>
                <Switch
                  checked={draftAnalytics}
                  onChange={setDraftAnalytics}
                  label={t('categories.analytics.label')}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t('categories.marketing.label')}
                  </p>
                  <p className="text-xs text-gray-500">{t('categories.marketing.description')}</p>
                </div>
                <Switch
                  checked={draftMarketing}
                  onChange={setDraftMarketing}
                  label={t('categories.marketing.label')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {!isFirstVisit && (
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {t('cancel')}
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="h-11 px-4 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
