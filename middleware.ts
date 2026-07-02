import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isProtectedPath, stripLocale } from '@/lib/auth/protectedPaths'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * Combined Supabase session refresh + i18n locale routing + auth-guard middleware.
 *
 * Order:
 *   1. updateSession — refreshes the Supabase auth token; also returns the current
 *      user so we can make routing decisions without a second network call.
 *   2. Auth guard — if the request targets a protected path and the user is not
 *      authenticated, redirect to /[locale]/auth/login?next=<path>.
 *   3. intlMiddleware — detects the locale from the URL prefix and redirects to the
 *      default locale when none is present.
 *   4. Session cookies from step 1 are forwarded to the final response.
 */
const intlMiddleware = createMiddleware(routing)

/** Extract locale from pathname (first segment). Falls back to 'hy'. */
function extractLocale(pathname: string): string {
  const match = pathname.match(/^\/(hy|ru|en)/)
  return match ? match[1] : 'hy'
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Step 1: Refresh auth session and get current user.
  const { response: sessionResponse, user } = await updateSession(request)

  // Step 2: Protect authenticated routes.
  if (isProtectedPath(pathname) && !user) {
    const locale = extractLocale(pathname)
    const loginUrl = new URL(`/${locale}/auth/login`, request.url)
    // Preserve the original destination so we can redirect back after login.
    loginUrl.searchParams.set('next', pathname)

    const redirectResponse = NextResponse.redirect(loginUrl)
    // Forward refreshed session cookies so they're not lost across the redirect.
    sessionResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  // Step 3: If user is logged in and visits an auth page, redirect to dashboard.
  const pathWithoutLocale = stripLocale(pathname)
  if (user && pathWithoutLocale.startsWith('/auth/') &&
      !pathWithoutLocale.startsWith('/auth/callback')) {
    const locale = extractLocale(pathname)
    const dashboardUrl = new URL(`/${locale}/dashboard`, request.url)
    const redirectResponse = NextResponse.redirect(dashboardUrl)
    sessionResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  // Step 4: Run i18n locale detection / redirect.
  const intlResponse = intlMiddleware(request) as NextResponse

  // Step 5: Copy session cookies into the i18n response so the browser
  // receives both the locale redirect and the refreshed auth cookies.
  sessionResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie)
  })

  return intlResponse
}

export const config = {
  matcher: [
    // Match every pathname EXCEPT:
    //   • /api/…        — API routes
    //   • /_next/…      — Next.js internals
    //   • /_vercel/…    — Vercel internals
    //   • paths with a file extension (e.g. /hero.jpg, /favicon.ico)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
}
