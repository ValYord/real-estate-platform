import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Refreshes the Supabase auth session on every request and propagates the
 * updated session cookies to the response.
 *
 * Also returns the authenticated user (or null) so the middleware can make
 * routing decisions (e.g. redirect unauthenticated users from protected pages)
 * without a second network round-trip.
 *
 * Call this at the TOP of `middleware.ts`, BEFORE any i18n or routing logic,
 * so that Server Components always receive a fresh session.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse
  user: User | null
}> {
  // Start with a pass-through response; the cookie setter may replace this.
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
  // We capture the user here to avoid a second network call in the middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response: supabaseResponse, user }
}
