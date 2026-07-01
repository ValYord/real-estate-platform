import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * Combined Supabase session refresh + i18n locale routing middleware.
 *
 * Order matters:
 *   1. updateSession — refreshes the Supabase auth token and writes updated
 *      session cookies.  Must run first so Server Components receive a fresh
 *      session on every request.
 *   2. intlMiddleware — detects the locale from the URL prefix and redirects
 *      to the default locale when none is present.
 *
 * Session cookies from step 1 are forwarded to the final response so the
 * browser always receives the latest auth state regardless of i18n redirects.
 */
const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Step 1: refresh auth session and collect any Set-Cookie headers
  const sessionResponse = await updateSession(request)

  // Step 2: run i18n locale detection / redirect
  const intlResponse = intlMiddleware(request) as NextResponse

  // Step 3: copy session cookies into the i18n response so the browser
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
