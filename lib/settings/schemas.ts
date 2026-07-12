import { z } from 'zod'
import { LOCALES } from '@/lib/locale'
import { NOTIFICATION_EVENT_TYPES } from './types'

/** E.164-ish phone number regex (mirrors lib/auth/schemas.ts). */
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/

const CURRENCIES = ['AMD', 'USD', 'EUR', 'RUB'] as const
const THEMES = ['light', 'dark', 'system'] as const
const CONTACT_PREFERENCES = ['everyone', 'registered', 'no_one'] as const

// ── Profile tab (3.2) ───────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: z.string().min(2, 'Name is required').max(60),
  phone: z.string().regex(PHONE_REGEX, 'Invalid phone number'),
  bio: z.string().max(500).optional(),
})

// ── Preferences tab (3.4) ───────────────────────────────────────────────────

export const preferencesSchema = z.object({
  lang: z.enum(LOCALES),
  currency: z.enum(CURRENCIES),
  theme: z.enum(THEMES),
})

/**
 * PATCH /api/users/me accepts any partial combination of profile fields
 * (name/phone/bio) and preferences (lang/currency/theme) — see the
 * technical section's API contract in docs/en/pages/21-settings.md.
 */
export const patchUserSchema = profileSchema.partial().merge(preferencesSchema.partial())

// ── Account tab — change password (3.3) ─────────────────────────────────────

export const passwordSchema = z
  .object({
    current: z.string().min(1, 'The current password is required'),
    new: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[a-zA-Z]/, 'Must contain a letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirm: z.string(),
  })
  .refine((d) => d.new === d.confirm, {
    path: ['confirm'],
    message: "Passwords don't match",
  })

/** Adds the "sign out other devices" checkbox to the base password schema. */
export const changePasswordRequestSchema = z
  .object({
    current: z.string().min(1, 'The current password is required'),
    new: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[a-zA-Z]/, 'Must contain a letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirm: z.string(),
    revokeOthers: z.boolean().optional().default(false),
  })
  .refine((d) => d.new === d.confirm, {
    path: ['confirm'],
    message: "Passwords don't match",
  })

// ── Account tab — change email (3.3) ─────────────────────────────────────────

export const changeEmailSchema = z.object({
  newEmail: z.string().email('Invalid email'),
})

// ── Account tab — delete account (3.3) ───────────────────────────────────────

export const deleteAccountSchema = z.object({
  confirm: z.literal('DELETE', {
    errorMap: () => ({ message: 'Type DELETE to confirm' }),
  }),
})

// ── Notifications tab (3.5) ───────────────────────────────────────────────────

const channelPrefsPatchSchema = z
  .object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
  })
  .strict()

export const notificationPrefsPatchSchema = z
  .object({
    emailEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    types: z.record(z.enum(NOTIFICATION_EVENT_TYPES), channelPrefsPatchSchema).optional(),
  })
  .strict()
  .refine(
    (d) => d.emailEnabled !== undefined || d.pushEnabled !== undefined || d.types !== undefined,
    { message: 'At least one field is required' },
  )

// ── Privacy tab (3.6) ─────────────────────────────────────────────────────────

export const privacyPatchSchema = z
  .object({
    contactPreference: z.enum(CONTACT_PREFERENCES).optional(),
    hidePhone: z.boolean().optional(),
  })
  .strict()
  .refine((d) => d.contactPreference !== undefined || d.hidePhone !== undefined, {
    message: 'At least one field is required',
  })

// ── Avatar upload (3.2) ───────────────────────────────────────────────────────

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type ProfileInput = z.infer<typeof profileSchema>
export type PreferencesInput = z.infer<typeof preferencesSchema>
export type PatchUserInput = z.infer<typeof patchUserSchema>
export type PasswordInput = z.infer<typeof passwordSchema>
export type ChangePasswordRequestInput = z.infer<typeof changePasswordRequestSchema>
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
export type NotificationPrefsPatchInput = z.infer<typeof notificationPrefsPatchSchema>
export type PrivacyPatchInput = z.infer<typeof privacyPatchSchema>
