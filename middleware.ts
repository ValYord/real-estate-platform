import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * Locale-detection middleware.
 * - Detects locale from the URL prefix (e.g. /hy/, /ru/, /en/).
 * - Redirects / to /hy/ (the defaultLocale) when no prefix is present.
 * - Pass-through: /api/*, /_next/*, /_vercel/*, and paths with file extensions.
 */
export default createMiddleware(routing)

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
