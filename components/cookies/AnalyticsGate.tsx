'use client'

import { useEffect, useState } from 'react'
import { readConsent } from '@/lib/cookies/storage'
import { shouldLoadAnalytics, shouldLoadMarketing } from '@/lib/cookies/policy'
import { COOKIE_CONSENT_EVENT, type CookieConsentValue } from '@/lib/cookies/types'

let analyticsLoaded = false
let marketingLoaded = false

/**
 * Injects the analytics script tag — only called once consent is confirmed.
 * No-op when no provider is configured (`NEXT_PUBLIC_ANALYTICS_ID` unset),
 * which is the current state of this project.
 */
function loadAnalyticsScript(): void {
  if (analyticsLoaded) return
  const id = process.env.NEXT_PUBLIC_ANALYTICS_ID
  if (!id) return
  analyticsLoaded = true
  const script = document.createElement('script')
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  script.async = true
  document.head.appendChild(script)
}

/** Injects the marketing/ads pixel — only called once consent is confirmed. */
function loadMarketingScript(): void {
  if (marketingLoaded) return
  const id = process.env.NEXT_PUBLIC_MARKETING_PIXEL_ID
  if (!id) return
  marketingLoaded = true
  const script = document.createElement('script')
  script.src = `https://connect.facebook.net/en_US/fbevents.js?id=${id}`
  script.async = true
  document.head.appendChild(script)
}

/**
 * Renders nothing. Subscribes to the visitor's cookie consent choice and
 * only then loads non-necessary scripts — never eagerly, never before an
 * explicit choice (docs/en/pages/23-static.md §1 scenario C / §5).
 */
export default function AnalyticsGate() {
  const [consent, setConsent] = useState<CookieConsentValue | null>(null)

  useEffect(() => {
    setConsent(readConsent())
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentValue>).detail
      setConsent(detail)
    }
    window.addEventListener(COOKIE_CONSENT_EVENT, onChange)
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChange)
  }, [])

  useEffect(() => {
    if (shouldLoadAnalytics(consent)) loadAnalyticsScript()
    if (shouldLoadMarketing(consent)) loadMarketingScript()
  }, [consent])

  return null
}
