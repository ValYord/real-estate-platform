import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { newsletterSchema } from '@/lib/blog/schemas'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'

/** Postgres unique-violation error code (duplicate email). */
const UNIQUE_VIOLATION = '23505'

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(url && key && !url.includes('your-project-id') && !url.includes('placeholder'))
}

/**
 * POST /api/newsletter/subscribe
 *
 * Body validated by `newsletterSchema` (docs/en/pages/15-blog.md §5 —
 * §3.11 "Newsletter (inline)"). Persists the email to
 * `newsletter_subscribers` and returns a confirmation status — there is no
 * real ESP/double-opt-in email integration in this task's scope, only
 * persistence + a confirmation UI (see the migration's RLS comment).
 *
 * The insert goes through the normal (anon-key, cookie-based) server client
 * — NOT the service-role admin client — so the `newsletter_subscribers:
 * anyone can insert` RLS policy is the thing actually authorizing the
 * write, matching "RLS: insert-only from anon, no public read".
 *
 * Rate-limit: 3 requests/hour per IP (public, unauthenticated endpoint).
 *
 * 202 { status: 'pending_confirmation' } · 409 { error: 'already_subscribed' }
 * 422 { error: 'validation_error' } · 429 { error: 'rate_limited' }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rate = checkRateLimit(
    `newsletter-subscribe:${ip}`,
    LIMITS.NEWSLETTER_SUBSCRIBE.max,
    LIMITS.NEWSLETTER_SUBSCRIBE.windowMs,
  )
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof newsletterSchema.parse>
  try {
    input = newsletterSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // Honeypot: silently accept but do nothing (bots get a fake success).
  if (input.website) {
    return NextResponse.json({ status: 'pending_confirmation' }, { status: 202 })
  }

  if (!isSupabaseConfigured()) {
    // No Supabase project linked (local dev) — accept without persisting so
    // the UI flow can still be exercised end to end.
    return NextResponse.json({ status: 'pending_confirmation' }, { status: 202 })
  }

  try {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email: input.email, source: input.source } as unknown as never)

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return NextResponse.json({ error: 'already_subscribed' }, { status: 409 })
      }
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({ status: 'pending_confirmation' }, { status: 202 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
