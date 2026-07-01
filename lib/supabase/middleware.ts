import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Refreshes the Supabase auth session on every request and propagates the
 * updated session cookies to the response.
 *
 * Call this at the TOP of `middleware.ts`, BEFORE any i18n or routing logic,
 * so that Server Components always receive a fresh session.
 *
 * @example
 * // middleware.ts
 * import { updateSession } from '@/lib/supabase/middleware'
 * export async function middleware(request: NextRequest) {
 *   const sessionResponse = await updateSession(request)
 *   // … run i18n middleware, copy sessionResponse cookies to final response
 * }
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Start with a pass-through response; the cookie setter may replace this
  // with a new NextResponse when it needs to propagate Set-Cookie headers.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          // Write updated auth cookies back into the request (for downstream
          // middleware reads) and into the response (so the browser receives them).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Calling getUser() triggers a token refresh if the access token is expired.
  // The result is intentionally unused here; auth gates belong in page/route code.
  await supabase.auth.getUser()

  return supabaseResponse
}
