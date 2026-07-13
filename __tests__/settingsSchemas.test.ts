/**
 * Validation tests for the Settings (Page 21) zod schemas.
 * See docs/en/pages/21-settings.md §5 "Validation (zod)".
 */
import { describe, it, expect } from 'vitest'
import {
  profileSchema,
  preferencesSchema,
  patchUserSchema,
  passwordSchema,
  changePasswordRequestSchema,
  changeEmailSchema,
  deleteAccountSchema,
  notificationPrefsPatchSchema,
  privacyPatchSchema,
} from '../lib/settings/schemas'

// ── Profile tab (§3.2) ───────────────────────────────────────────────────────

describe('profileSchema', () => {
  const base = { name: 'Aram Petrosyan', phone: '+37491234567', bio: 'Hello there' }

  it('accepts a valid profile', () => {
    expect(profileSchema.safeParse(base).success).toBe(true)
  })

  it('accepts a profile without bio (optional)', () => {
    const { bio: _bio, ...rest } = base
    expect(profileSchema.safeParse(rest).success).toBe(true)
  })

  it('rejects a name shorter than 2 characters', () => {
    const result = profileSchema.safeParse({ ...base, name: 'A' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined()
    }
  })

  it('rejects a name longer than 60 characters', () => {
    const result = profileSchema.safeParse({ ...base, name: 'A'.repeat(61) })
    expect(result.success).toBe(false)
  })

  it('rejects a phone number without a + prefix', () => {
    const result = profileSchema.safeParse({ ...base, phone: '091234567' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.phone).toBeDefined()
    }
  })

  it('rejects a bio longer than 500 characters', () => {
    const result = profileSchema.safeParse({ ...base, bio: 'x'.repeat(501) })
    expect(result.success).toBe(false)
  })
})

describe('preferencesSchema', () => {
  it('accepts a valid combination', () => {
    expect(preferencesSchema.safeParse({ lang: 'ru', currency: 'USD', theme: 'dark' }).success).toBe(true)
  })

  it('rejects an unsupported locale', () => {
    const result = preferencesSchema.safeParse({ lang: 'fr', currency: 'USD', theme: 'dark' })
    expect(result.success).toBe(false)
  })

  it('rejects an unsupported currency', () => {
    const result = preferencesSchema.safeParse({ lang: 'hy', currency: 'GBP', theme: 'dark' })
    expect(result.success).toBe(false)
  })

  it('rejects an unsupported theme', () => {
    const result = preferencesSchema.safeParse({ lang: 'hy', currency: 'AMD', theme: 'blue' })
    expect(result.success).toBe(false)
  })
})

describe('patchUserSchema (PATCH /api/users/me body)', () => {
  it('accepts a partial profile-only patch', () => {
    expect(patchUserSchema.safeParse({ name: 'New Name' }).success).toBe(true)
  })

  it('accepts a partial preferences-only patch', () => {
    expect(patchUserSchema.safeParse({ lang: 'en' }).success).toBe(true)
  })

  it('accepts an empty object (caller rejects empty patches separately)', () => {
    expect(patchUserSchema.safeParse({}).success).toBe(true)
  })

  it('rejects an invalid phone in a partial patch', () => {
    expect(patchUserSchema.safeParse({ phone: 'not-a-phone' }).success).toBe(false)
  })

  it('rejects an invalid currency in a partial patch', () => {
    expect(patchUserSchema.safeParse({ currency: 'GBP' }).success).toBe(false)
  })
})

// ── Account tab — change password (§3.3, Scenario B) ────────────────────────

describe('passwordSchema', () => {
  const base = { current: 'oldpass1', new: 'NewPass123', confirm: 'NewPass123' }

  it('accepts a valid password change', () => {
    expect(passwordSchema.safeParse(base).success).toBe(true)
  })

  it('requires the current password', () => {
    const result = passwordSchema.safeParse({ ...base, current: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a new password shorter than 8 characters', () => {
    const result = passwordSchema.safeParse({ ...base, new: 'Ab1', confirm: 'Ab1' })
    expect(result.success).toBe(false)
  })

  it('rejects a new password without a letter', () => {
    const result = passwordSchema.safeParse({ ...base, new: '12345678', confirm: '12345678' })
    expect(result.success).toBe(false)
  })

  it('rejects a new password without a number', () => {
    const result = passwordSchema.safeParse({ ...base, new: 'OnlyLetters', confirm: 'OnlyLetters' })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched confirm', () => {
    const result = passwordSchema.safeParse({ ...base, confirm: 'Different123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirm).toBeDefined()
    }
  })
})

describe('changePasswordRequestSchema (POST /api/auth/change-password body)', () => {
  it('defaults revokeOthers to false when omitted', () => {
    const result = changePasswordRequestSchema.safeParse({
      current: 'oldpass1',
      new: 'NewPass123',
      confirm: 'NewPass123',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.revokeOthers).toBe(false)
  })

  it('accepts revokeOthers: true', () => {
    const result = changePasswordRequestSchema.safeParse({
      current: 'oldpass1',
      new: 'NewPass123',
      confirm: 'NewPass123',
      revokeOthers: true,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.revokeOthers).toBe(true)
  })

  it('rejects mismatched confirm the same way as passwordSchema', () => {
    const result = changePasswordRequestSchema.safeParse({
      current: 'oldpass1',
      new: 'NewPass123',
      confirm: 'Nope',
    })
    expect(result.success).toBe(false)
  })
})

// ── Account tab — change email (§3.3) ────────────────────────────────────────

describe('changeEmailSchema', () => {
  it('accepts a valid email', () => {
    expect(changeEmailSchema.safeParse({ newEmail: 'new@example.com' }).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    expect(changeEmailSchema.safeParse({ newEmail: 'not-an-email' }).success).toBe(false)
  })
})

// ── Account tab — delete account (§3.3, Scenario C) ──────────────────────────

describe('deleteAccountSchema', () => {
  it('accepts the literal confirm text "DELETE"', () => {
    expect(deleteAccountSchema.safeParse({ confirm: 'DELETE' }).success).toBe(true)
  })

  it('rejects lowercase "delete"', () => {
    expect(deleteAccountSchema.safeParse({ confirm: 'delete' }).success).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(deleteAccountSchema.safeParse({ confirm: '' }).success).toBe(false)
  })

  it('rejects a missing confirm field', () => {
    expect(deleteAccountSchema.safeParse({}).success).toBe(false)
  })
})

// ── Notifications tab (§3.5) ──────────────────────────────────────────────────

describe('notificationPrefsPatchSchema', () => {
  it('accepts a master-toggle-only patch', () => {
    expect(notificationPrefsPatchSchema.safeParse({ emailEnabled: false }).success).toBe(true)
  })

  it('accepts a per-event-type channel patch', () => {
    const result = notificationPrefsPatchSchema.safeParse({ types: { message: { push: false } } })
    expect(result.success).toBe(true)
  })

  it('rejects an empty patch (at least one field required)', () => {
    expect(notificationPrefsPatchSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an unknown event type', () => {
    const result = notificationPrefsPatchSchema.safeParse({ types: { bogus_event: { email: true } } })
    expect(result.success).toBe(false)
  })

  it('rejects unknown top-level fields (strict)', () => {
    const result = notificationPrefsPatchSchema.safeParse({ emailEnabled: true, extra: 'nope' })
    expect(result.success).toBe(false)
  })
})

// ── Privacy tab (§3.6) ────────────────────────────────────────────────────────

describe('privacyPatchSchema', () => {
  it('accepts a contactPreference-only patch', () => {
    expect(privacyPatchSchema.safeParse({ contactPreference: 'registered' }).success).toBe(true)
  })

  it('accepts a hidePhone-only patch', () => {
    expect(privacyPatchSchema.safeParse({ hidePhone: true }).success).toBe(true)
  })

  it('rejects an invalid contactPreference value', () => {
    expect(privacyPatchSchema.safeParse({ contactPreference: 'friends' }).success).toBe(false)
  })

  it('rejects an empty patch (at least one field required)', () => {
    expect(privacyPatchSchema.safeParse({}).success).toBe(false)
  })
})
