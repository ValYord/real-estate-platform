/** Cookie consent categories, persisted client-side (Page 23 — cookie consent). */
export interface CookieConsentValue {
  /** Always true — necessary cookies cannot be disabled. */
  necessary: true
  analytics: boolean
  marketing: boolean
  /** Epoch ms when the choice was made — used for the consent log / audit. */
  ts: number
}

export const COOKIE_CONSENT_STORAGE_KEY = 'cookie_consent'

/** Fired on `window` whenever consent is saved, so gated loaders can react. */
export const COOKIE_CONSENT_EVENT = 'cookie-consent-changed'
