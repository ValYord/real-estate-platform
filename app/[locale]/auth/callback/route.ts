import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeNext } from '@/lib/auth/safeNext'
import type { Database } from '@/types/database'

/**
 * OAuth callback route handler.
 *
 * After the user authorises with Google, Supabase redirects here with a ?code
 * query parameter. We exchange it for a session, insert a profile row for new
 * users, and redirect to the originally requested page (or /dashboard).
 *
 * Email collision (Google email = existing password account) is handled in
 * Phase 1 by redirecting to login with an error message.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextRaw = searchParams.get('next')
  const next = safeNext(nextRaw ?? undefined)
  // `fav` is set when a guest tapped ♡ before logging in; we persist it after
  // the OAuth session is established (admin client bypasses RLS here, same as
  // the profile upsert below).
  const pendingFav = searchParams.get('fav')

  // Determine locale from the URL (e.g. /hy/auth/callback → 'hy')
  const localeMatch = request.nextUrl.pathname.match(/^\/(hy|ru|en)/)
  const locale = localeMatch ? localeMatch[1] : 'hy'

  if (!code) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/login?error=missing_code`, origin)
    )
  }

  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(
      new URL(
        `/${locale}/auth/login?error=${encodeURIComponent(
          error?.message ?? 'oauth_failed'
        )}`,
        origin
      )
    )
  }

  const user = data.session.user

  // Upsert a profile row for the user using the admin client (bypasses RLS
  // so this works for both new and returning OAuth users).
  // ignoreDuplicates=true means existing profiles are left untouched.
  const admin = createAdminClient()
  await admin.from('profiles').insert({
    id: user.id,
    full_name:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    avatar_url:
      (user.user_metadata?.avatar_url as string | undefined) ?? null,
    role: 'user',
  })
  // If the row already exists (returning user), the insert error is safely ignored.

  // Auto-save the deferred favorite (guest tapped ♡ before signing in via Google).
  // A UUID regex guards against invalid/injected values before the DB call.
  if (pendingFav && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pendingFav)) {
    const { data: prop } = await admin
      .from('properties')
      .select('price')
      .eq('id', pendingFav)
      .maybeSingle()
    const savedPrice = (prop as { price: number } | null)?.price ?? null
    // Upsert is idempotent; ignore errors (e.g., property deleted).
    await admin.from('favorites').upsert(
      { user_id: user.id, property_id: pendingFav, saved_price: savedPrice },
      { onConflict: 'user_id,property_id' },
    )
  }

  return NextResponse.redirect(new URL(next, origin))
}
