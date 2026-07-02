import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { reportSchema } from '@/lib/property/schemas'

type Params = { id: string }

/**
 * POST /api/properties/[id]/report
 *
 * Submits a report for the given property.
 * Auth is encouraged but not required (anonymous reports are still accepted).
 *
 * Body: { reason: 'fake' | 'sold' | 'incorrect' | 'spam', note?: string }
 *
 * Returns 202 Accepted on success.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof reportSchema.parse>
  try {
    input = reportSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // Optional: persist report to Supabase when credentials are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const supabase = createAdminClient()

      // Check the property exists
      const { data: prop } = await supabase
        .from('properties')
        .select('id')
        .eq('id', id)
        .single()

      if (!prop) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }

      // In a full implementation, write to a `property_reports` table here.
      // For now we acknowledge receipt immediately.
      void input // validated, would be persisted
    } catch {
      // Ignore DB errors — still accept the report
    }
  }

  return NextResponse.json({ message: 'Report received' }, { status: 202 })
}
