import 'server-only'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Returns a Supabase server client typed against the project database schema.
 *
 * Must only be used in Server Components, Route Handlers, and Server Actions.
 * The `server-only` import above causes a build error if this module is
 * accidentally imported from a Client Component.
 *
 * Cookie handling follows the Next.js App Router pattern:
 *   - getAll: reads request cookies for the current session.
 *   - setAll: writes updated session cookies; errors are ignored in Server
 *     Components because the middleware refreshes the session on every request.
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient<Database>(
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
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore errors in Server Components — middleware refreshes the session
          }
        },
      },
    }
  )
}
