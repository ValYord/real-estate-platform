/**
 * In-memory rate limiter (per serverless instance; resets on cold start).
 * Sufficient for Phase 1. Replace with Redis / Supabase-based persistence
 * for production multi-instance deployments.
 */

interface Entry {
  count: number
  resetAt: number // epoch ms
}

const store = new Map<string, Entry>()

/** Purge expired entries to prevent unbounded map growth. */
function cleanup(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}

/**
 * Check whether a key is within rate-limit bounds.
 *
 * @param key        Composite key (e.g. "login:ip:email")
 * @param maxCount   Maximum allowed requests in the window
 * @param windowMs   Window length in milliseconds
 * @returns `{ allowed, remaining, resetAt }`
 */
export function checkRateLimit(
  key: string,
  maxCount: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxCount - 1, resetAt: now + windowMs }
  }

  if (entry.count >= maxCount) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return {
    allowed: true,
    remaining: maxCount - entry.count,
    resetAt: entry.resetAt,
  }
}

/** Rate-limit presets */
export const LIMITS = {
  /** 5 login attempts per 15 minutes per IP+email */
  LOGIN: { max: 5, windowMs: 15 * 60 * 1000 },
  /** 5 registrations per hour per IP */
  REGISTER: { max: 5, windowMs: 60 * 60 * 1000 },
  /** 3 forgot-password requests per hour per email */
  FORGOT: { max: 3, windowMs: 60 * 60 * 1000 },
  /** 1 OTP resend per 60 seconds per user+channel */
  OTP_RESEND: { max: 1, windowMs: 60 * 1000 },
  /** 3 contact form submissions per hour per IP (Page 23 — /contact) */
  CONTACT: { max: 3, windowMs: 60 * 60 * 1000 },
  /** 5 "Send a request" submissions per hour per user (docs/en/pages/10 §3.7) */
  AGENT_LEAD: { max: 5, windowMs: 60 * 60 * 1000 },
  /**
   * 20 valuation calculations per hour per IP (docs/en/pages/12 — the tool
   * is intentionally usable by guests with no session, so this is keyed by
   * IP rather than user id, same as the other pre-auth endpoints above).
   */
  HOME_VALUE_ESTIMATE: { max: 20, windowMs: 60 * 60 * 1000 },
  /** 5 "Get pre-approved" submissions per hour per user (docs/design/14-mortgage-rates-handoff.md §2). */
  MORTGAGE_PREAPPROVAL: { max: 5, windowMs: 60 * 60 * 1000 },
  /**
   * 10 tenant-application submissions per hour per IP (docs/en/pages/
   * 19-landlord.md §3.3) — the public `/apply/[token]` form has no session,
   * same IP-keyed reasoning as HOME_VALUE_ESTIMATE above.
   */
  TENANT_APPLICATION: { max: 10, windowMs: 60 * 60 * 1000 },
} as const
