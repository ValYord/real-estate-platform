import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { leaseFieldsSchema } from '@/lib/landlord/schemas'
import { buildLeaseDocument, leaseDocumentToLines } from '@/lib/landlord/leaseDocument'
import { renderTextPdf } from '@/lib/landlord/pdf'

type Params = { id: string }
type RouteContext = { params: Promise<Params> }

const idParamSchema = z.object({ id: z.string().uuid() })

interface LeaseRow {
  id: string
  fields: unknown
  rental_units: { address: string } | null
  lease_templates: { name: string } | null
}

/**
 * GET /api/landlord/leases/[id]/pdf
 *
 * Streams the `[⬇️ Download PDF]` action's output (§3.4). Renders on
 * demand from the persisted `fields` JSONB rather than a pre-generated
 * file in Storage (see the migration's header note and lib/landlord/pdf.ts
 * for the "straightforward ... no heavy PDF pipeline" MVP rationale).
 *
 * Login-gated + RLS owner-scoped: the `leases` SELECT below only ever
 * returns the caller's own lease (RLS `owner_id = auth.uid()`), so a
 * cross-owner id 404s exactly like a nonexistent one.
 */
export async function GET(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  let resolvedParams: Params
  try {
    resolvedParams = idParamSchema.parse(await params)
  } catch {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('leases')
      .select(
        'id, fields, rental_units!leases_unit_id_fkey(address), lease_templates!leases_template_id_fkey(name)',
      )
      .eq('id', resolvedParams.id)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const row = data as unknown as LeaseRow
    const fieldsParsed = leaseFieldsSchema.safeParse(row.fields)
    if (!fieldsParsed.success) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const document = buildLeaseDocument(fieldsParsed.data, row.lease_templates?.name ?? 'Lease agreement')
    const lines = [`Property: ${row.rental_units?.address ?? '—'}`, '', ...leaseDocumentToLines(document)]
    const pdf = renderTextPdf(lines)

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="lease-${resolvedParams.id}.pdf"`,
        'Content-Length': String(pdf.byteLength),
      },
    })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
