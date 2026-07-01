/**
 * SECURITY NOTICE
 * ───────────────
 * This module is server-only. Importing it from a Client Component or any
 * module reachable from the browser bundle will cause a Next.js build error
 * (enforced by the `server-only` package below).
 *
 * The admin client uses the SUPABASE_SERVICE_ROLE_KEY which bypasses all
 * Row Level Security policies. Use it ONLY in:
 *   - Route Handlers  (app/api/*)
 *   - Server Actions  (functions marked with `'use server'`)
 *
 * Never expose `SUPABASE_SERVICE_ROLE_KEY` through a NEXT_PUBLIC_* variable.
 */
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Returns a Supabase admin client with service-role privileges.
 *
 * Bypasses RLS — call only after verifying the caller has admin/system
 * privileges at the application layer (e.g. from a trusted server action).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!serviceRoleKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      // Disable cookie-based auth for the admin client — it uses the service
      // role key which is not user-scoped.
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
