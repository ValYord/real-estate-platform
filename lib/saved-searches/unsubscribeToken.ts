/**
 * SECURITY NOTICE
 * ───────────────
 * Server-only. Signs/verifies the one-click "Turn off notifications" link
 * embedded in alert emails (`GET /api/saved-searches/unsubscribe?token=...`).
 * Uses `SAVED_SEARCH_UNSUB_SECRET`, a server-only env var — never prefix it
 * with `NEXT_PUBLIC_` and never import this module from a Client Component.
 *
 * Token format: base64url(JSON.stringify(payload)) + '.' + base64url(HMAC_SHA256(payload_json, secret))
 *
 * NOTE: nothing in this task calls `signUnsubscribeToken` yet — the email
 * digest that would embed the link is out of scope (separate follow-up
 * work). This module exists so that follow-up work can import a stable,
 * already-tested token format without redesigning it later. Only
 * `verifyUnsubscribeToken` has a live caller (the unsubscribe route).
 */
import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

export interface UnsubscribeTokenPayload {
  savedSearchId: string
}

function getSecret(): string {
  const secret = process.env.SAVED_SEARCH_UNSUB_SECRET
  if (!secret) {
    throw new Error('Missing environment variable: SAVED_SEARCH_UNSUB_SECRET')
  }
  return secret
}

function hmac(payloadJson: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadJson).digest('base64url')
}

/** Signs a saved-search id into an unsubscribe token. */
export function signUnsubscribeToken(payload: UnsubscribeTokenPayload): string {
  const secret = getSecret()
  const payloadJson = JSON.stringify(payload)
  const payloadB64 = Buffer.from(payloadJson, 'utf-8').toString('base64url')
  const signature = hmac(payloadJson, secret)
  return `${payloadB64}.${signature}`
}

/**
 * Verifies a token produced by `signUnsubscribeToken`.
 * Returns the payload if the signature is valid, `null` otherwise
 * (malformed token, tampered payload, or wrong secret). Never throws on
 * untrusted input.
 */
export function verifyUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
  if (typeof token !== 'string' || token.length === 0) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, signature] = parts
  if (!payloadB64 || !signature) return null

  let payloadJson: string
  try {
    payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8')
  } catch {
    return null
  }

  let secret: string
  try {
    secret = getSecret()
  } catch {
    return null
  }

  const expectedSignature = hmac(payloadJson, secret)
  const providedBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expectedSignature)
  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(payloadJson)
  } catch {
    return null
  }

  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'savedSearchId' in parsed &&
    typeof (parsed as { savedSearchId: unknown }).savedSearchId === 'string' &&
    (parsed as { savedSearchId: string }).savedSearchId.length > 0
  ) {
    return { savedSearchId: (parsed as { savedSearchId: string }).savedSearchId }
  }

  return null
}
