import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Returns a Supabase browser client typed against the project database schema.
 *
 * Safe to call in Client Components and browser-side hooks.
 * Uses only NEXT_PUBLIC_* env vars (shipped to the browser).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
