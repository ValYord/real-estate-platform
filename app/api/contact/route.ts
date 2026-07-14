import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { contactPageSchema } from '@/lib/contact/schemas'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'
import { notifyAdminOfContactMessage } from '@/lib/contact/notify'

/**
 * POST /api/contact
 *
 * Public endpoint (no auth required) backing the /contact page form.
 * Persists a row to `contact_messages` (insert-only RLS — see
 * supabase/migrations/0007_contact_messages.sql) and best-effort notifies
 * the admin team.
 *
 * Status codes:
 *   201 { ok: true }
 *   400 { error: 'invalid_json' }
 *   422 { error: 'validation', fields: { … } }
 *   429 { error: 'rate_limited' }
 *   500 { error: 'server_error' }
 */
export async function POST(request: NextRequest) {
  // Rate-limit by IP (3 submissions per hour) — anti-spam, in addition to
  // the honeypot field validated below.
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = checkRateLimit(`contact:${ip}`, LIMITS.CONTACT.max, LIMITS.CONTACT.windowMs)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // Honeypot: checked on the raw body, before schema validation, so a bot
  // that blindly fills every field (tripping the schema's `website:
  // max(0)` constraint) still gets a silent "success" response instead of
  // a 422 that would reveal the anti-spam check. Real users never see or
  // fill this field (it's visually hidden — components/contact/ContactForm.tsx).
  if (
    typeof body === 'object' &&
    body !== null &&
    'website' in body &&
    (body as Record<string, unknown>).website
  ) {
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  const parsed = contactPageSchema.safeParse(body)
  if (!parsed.success) {
    const fields = Object.fromEntries(
      Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [
        key,
        messages?.[0] ?? 'Invalid',
      ])
    )
    return NextResponse.json({ error: 'validation', fields }, { status: 422 })
  }

  const { name, email, phone, subject, message } = parsed.data

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('contact_messages')
    .insert({
      name,
      email,
      phone: phone ? phone : null,
      subject,
      body: message,
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  await notifyAdminOfContactMessage({ id: data.id, name, email, subject })

  return NextResponse.json({ ok: true }, { status: 201 })
}
