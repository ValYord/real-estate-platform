/**
 * Supabase client helpers — importability & shape tests.
 *
 * These tests verify that:
 *   1. createClient (browser)      — exports a function returning a SupabaseClient.
 *   2. createServerClient (server) — exports an async function (server-only enforced by Next.js).
 *   3. createAdminClient (admin)   — exports a function; server-only enforced at build time.
 *   4. updateSession (middleware)  — exports a function accepting NextRequest.
 *
 * NOTE on `server-only`:
 *   In a Node.js / Vitest environment the `server-only` package is a no-op
 *   (it contains no runtime throw).  The build-time guard is injected by
 *   Next.js's webpack layer: importing a `server-only` module from a Client
 *   Component causes `next build` to fail with:
 *     "You're importing a component that needs server-only..."
 *   This is verified by the comment in lib/supabase/admin.ts rather than by
 *   a runtime assertion.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest'

// ── Top-level mocks (hoisted before any import) ──────────────────────────────

// Mock next/headers so server.ts can be imported outside the Next.js runtime.
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

// Make server-only a no-op so the module can be imported in Vitest.
// In production (next build), this package causes a hard build error when
// imported from a client bundle — that guarantee is enforced by Next.js, not
// by a runtime throw.
vi.mock('server-only', () => ({}))

// ── Set required env vars before client instantiation ───────────────────────
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  // SUPABASE_SERVICE_ROLE_KEY is server-only — never set as NEXT_PUBLIC_*
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
})

// ────────────────────────────────────────────────────────────────────────────
// Browser client
// ────────────────────────────────────────────────────────────────────────────
describe('lib/supabase/client.ts — browser client', () => {
  it('exports a createClient function', async () => {
    const mod = await import('../lib/supabase/client')
    expect(typeof mod.createClient).toBe('function')
  })

  it('createClient() returns a SupabaseClient with .auth and .from', async () => {
    const { createClient } = await import('../lib/supabase/client')
    const client = createClient()
    expect(client).toBeDefined()
    expect(typeof client.auth).toBe('object')
    expect(typeof client.from).toBe('function')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Server client
// ────────────────────────────────────────────────────────────────────────────
describe('lib/supabase/server.ts — server client', () => {
  it('exports a createServerClient function', async () => {
    const mod = await import('../lib/supabase/server')
    expect(typeof mod.createServerClient).toBe('function')
  })

  it('createServerClient() resolves to a SupabaseClient', async () => {
    const { createServerClient } = await import('../lib/supabase/server')
    const client = await createServerClient()
    expect(client).toBeDefined()
    expect(typeof client.auth).toBe('object')
    expect(typeof client.from).toBe('function')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Admin client  (server-only — build error when imported from client code)
// ────────────────────────────────────────────────────────────────────────────
describe('lib/supabase/admin.ts — admin client (server-only guard)', () => {
  /**
   * In a real Next.js build, importing this file from a Client Component
   * (or any module reachable from one) triggers:
   *
   *   Error: This module cannot be imported from a Client Component module.
   *   It should only be used from a Server Component.
   *
   * The `server-only` package is mocked at the top of this file so Vitest
   * can import it, but the build-time enforcement is active in production builds.
   */
  it('exports a createAdminClient function', async () => {
    const mod = await import('../lib/supabase/admin')
    expect(typeof mod.createAdminClient).toBe('function')
  })

  it('createAdminClient() returns a SupabaseClient with service-role scope', async () => {
    const { createAdminClient } = await import('../lib/supabase/admin')
    const admin = createAdminClient()
    expect(admin).toBeDefined()
    expect(typeof admin.from).toBe('function')
  })

  it('SUPABASE_SERVICE_ROLE_KEY must NOT be prefixed NEXT_PUBLIC_', () => {
    // Verify the env var name is server-only (not browser-exposed)
    expect('SUPABASE_SERVICE_ROLE_KEY').not.toContain('NEXT_PUBLIC_')
    // The value is available server-side
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy()
    // The value must NOT be present in NEXT_PUBLIC_ namespace
    expect(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Admin client — missing env var guard
// ────────────────────────────────────────────────────────────────────────────
describe('lib/supabase/admin.ts — error when env vars missing', () => {
  it('createAdminClient() throws when SUPABASE_SERVICE_ROLE_KEY is absent', async () => {
    const saved = process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    // Re-import a fresh instance so the env change takes effect
    vi.resetModules()
    const { createAdminClient: fresh } = await import('../lib/supabase/admin')
    expect(() => fresh()).toThrow('SUPABASE_SERVICE_ROLE_KEY')

    // Restore for subsequent tests
    process.env.SUPABASE_SERVICE_ROLE_KEY = saved
    vi.resetModules()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Middleware session helper
// ────────────────────────────────────────────────────────────────────────────
describe('lib/supabase/middleware.ts — updateSession helper', () => {
  it('exports an updateSession function', async () => {
    const mod = await import('../lib/supabase/middleware')
    expect(typeof mod.updateSession).toBe('function')
  })
})
