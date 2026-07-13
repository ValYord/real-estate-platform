/**
 * Save-model behavior tests for the Settings page (§3.1 of
 * docs/en/pages/21-settings.md):
 *   - Preferences/Notifications/Privacy use `performInstantSave` — optimistic
 *     update, rollback to `previous` on request failure or network error.
 *   - The notification-prefs / privacy PATCH endpoints merge partial patches
 *     into existing state without clobbering untouched fields.
 */
import { describe, it, expect, vi } from 'vitest'
import { performInstantSave } from '../lib/settings/instantSave'
import { mergeNotificationPrefs, mergePrivacy } from '../lib/settings/mergePrefs'
import { DEFAULT_NOTIFICATION_PREFS, DEFAULT_PRIVACY } from '../lib/settings/defaults'

// ── performInstantSave — optimistic instant-save + rollback ─────────────────

describe('performInstantSave', () => {
  it('resolves ok:true with the next value when the request succeeds', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    const result = await performInstantSave({ previous: 'ru', next: 'en', request })
    expect(result).toEqual({ ok: true, value: 'en' })
  })

  it('rolls back to the previous value when the request returns a non-OK status', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
    const result = await performInstantSave({ previous: 'ru', next: 'en', request })
    expect(result).toEqual({ ok: false, value: 'ru' })
  })

  it('rolls back to the previous value when the request throws (network error)', async () => {
    const request = vi.fn().mockRejectedValue(new Error('network down'))
    const result = await performInstantSave({ previous: 'AMD', next: 'USD', request })
    expect(result).toEqual({ ok: false, value: 'AMD' })
  })

  it('rolls back on a 422 validation failure', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 422 }))
    const result = await performInstantSave({ previous: false, next: true, request })
    expect(result).toEqual({ ok: false, value: false })
  })
})

// ── mergeNotificationPrefs — partial patch merge (server + optimistic UI) ───

describe('mergeNotificationPrefs', () => {
  it('falls back to the defaults when current is null/undefined', () => {
    const merged = mergeNotificationPrefs(null, { emailEnabled: false })
    expect(merged.emailEnabled).toBe(false)
    expect(merged.pushEnabled).toBe(DEFAULT_NOTIFICATION_PREFS.pushEnabled)
    expect(merged.types).toEqual(DEFAULT_NOTIFICATION_PREFS.types)
  })

  it('overrides only the master toggle that was patched', () => {
    const merged = mergeNotificationPrefs(DEFAULT_NOTIFICATION_PREFS, { pushEnabled: false })
    expect(merged.pushEnabled).toBe(false)
    expect(merged.emailEnabled).toBe(true)
  })

  it('deep-merges a single event type channel without touching other event types', () => {
    const merged = mergeNotificationPrefs(DEFAULT_NOTIFICATION_PREFS, {
      types: { message: { push: false } },
    })
    expect(merged.types.message).toEqual({ email: true, push: false })
    // Untouched event types keep their previous values.
    expect(merged.types.marketing).toEqual(DEFAULT_NOTIFICATION_PREFS.types.marketing)
    expect(merged.types.review).toEqual(DEFAULT_NOTIFICATION_PREFS.types.review)
  })

  it('never mutates the input object', () => {
    const original = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATION_PREFS))
    mergeNotificationPrefs(DEFAULT_NOTIFICATION_PREFS, { types: { message: { email: false } } })
    expect(DEFAULT_NOTIFICATION_PREFS).toEqual(original)
  })
})

// ── mergePrivacy — partial patch merge ───────────────────────────────────────

describe('mergePrivacy', () => {
  it('falls back to the defaults when current is null/undefined', () => {
    const merged = mergePrivacy(null, { hidePhone: true })
    expect(merged).toEqual({ ...DEFAULT_PRIVACY, hidePhone: true })
  })

  it('overrides only the patched field', () => {
    const merged = mergePrivacy({ contactPreference: 'everyone', hidePhone: false }, {
      contactPreference: 'no_one',
    })
    expect(merged).toEqual({ contactPreference: 'no_one', hidePhone: false })
  })
})
