import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import SettingsShell from '@/components/settings/SettingsShell'
import { DEFAULT_NOTIFICATION_PREFS, DEFAULT_PRIVACY } from '@/lib/settings/defaults'
import type { NotificationPrefs, PrivacySettings, UserMe } from '@/lib/settings/types'
import type { Currency, Locale, Theme, UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'Settings — RE Platform',
  // Private, login-gated page (§8 SEO & meta).
  robots: { index: false, follow: false },
}

type ProfileRow = {
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: UserRole
  bio: string | null
  phone_verified: boolean
  lang: Locale
  currency: Currency
  theme: Theme
  notification_prefs: unknown
  privacy: unknown
}

/**
 * Auth-gated SSR shell for Page 21 (Settings).
 *
 * `/settings` is listed in PROTECTED_PATHS (lib/auth/protectedPaths.ts) so
 * the middleware already redirects guests before this ever renders; the
 * check below is defense in depth per the CLAUDE.md auth rule (protected
 * routes verify the session server-side too).
 *
 * Pre-loads the profile row (§0 "initial data is SSR pre-loaded") and hands
 * it to the client shell, which owns all further client-side form state.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/settings')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'full_name, avatar_url, phone, role, bio, phone_verified, lang, currency, theme, notification_prefs, privacy',
    )
    .eq('id', user.id)
    .single()

  const row = profile as unknown as ProfileRow | null

  const initialUser: UserMe = {
    id: user.id,
    role: row?.role ?? 'user',
    name: row?.full_name ?? '',
    email: user.email ?? '',
    phone: row?.phone ?? null,
    avatarUrl: row?.avatar_url ?? null,
    bio: row?.bio ?? null,
    lang: row?.lang ?? 'hy',
    currency: row?.currency ?? 'AMD',
    theme: row?.theme ?? 'system',
    emailVerified: !!user.email_confirmed_at,
    phoneVerified: row?.phone_verified ?? false,
    notificationPrefs: (row?.notification_prefs as NotificationPrefs | null) ?? DEFAULT_NOTIFICATION_PREFS,
    privacy: (row?.privacy as PrivacySettings | null) ?? DEFAULT_PRIVACY,
  }

  return <SettingsShell initialUser={initialUser}>{children}</SettingsShell>
}
