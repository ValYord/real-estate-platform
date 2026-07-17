import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createRentalUnitSchema } from '@/lib/landlord/schemas'
import type { RentalUnitSummary, RentalUnitsResponse } from '@/lib/landlord/types'
import type { Currency, RentalPaymentStatus, RentalUnitStatus, RentalUnitType } from '@/types/database'

interface RentalUnitRow {
  id: string
  address: string
  type: RentalUnitType
  area_m2: number | null
  rent: number
  currency: Currency
  status: RentalUnitStatus
  photo_url: string | null
  tenant_name: string | null
  tenant_contact: string | null
  lease_end: string | null
  payment_status: RentalPaymentStatus | null
  next_payment_due: string | null
  created_at: string
}

function rowToSummary(row: RentalUnitRow): RentalUnitSummary {
  return {
    id: row.id,
    address: row.address,
    type: row.type,
    areaM2: row.area_m2,
    rent: row.rent,
    currency: row.currency,
    status: row.status,
    photoUrl: row.photo_url,
    tenantName: row.tenant_name,
    tenantContact: row.tenant_contact,
    leaseEnd: row.lease_end,
    paymentStatus: row.payment_status,
    nextPaymentDue: row.next_payment_due,
    createdAt: row.created_at,
  }
}

/**
 * GET /api/landlord/rentals
 *
 * Returns the authenticated user's own rental units (RLS `owner_id =
 * auth.uid()` on `rental_units` — see 0014_landlord_rentals.sql). 401 for
 * unauthenticated callers.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('rental_units')
      .select(
        'id, address, type, area_m2, rent, currency, status, photo_url, tenant_name, tenant_contact, lease_end, payment_status, next_payment_due, created_at',
      )
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const units = ((data ?? []) as unknown as RentalUnitRow[]).map(rowToSummary)
    const response: RentalUnitsResponse = { units }

    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

/**
 * POST /api/landlord/rentals
 *
 * Body: `{ address, type, areaM2?, rent, currency }` — validated by
 * `createRentalUnitSchema`. 201 `{ unit }` · 401 auth_required · 422
 * validation_error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof createRentalUnitSchema.parse>
  try {
    input = createRentalUnitSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const insertResult = await supabase
      .from('rental_units')
      .insert({
        owner_id: user.id,
        address: input.address,
        type: input.type,
        area_m2: input.areaM2 ?? null,
        rent: input.rent,
        currency: input.currency,
        status: 'vacant',
      } as unknown as never)
      .select(
        'id, address, type, area_m2, rent, currency, status, photo_url, tenant_name, tenant_contact, lease_end, payment_status, next_payment_due, created_at',
      )
      .single()

    if (insertResult.error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const row = insertResult.data as unknown as RentalUnitRow | null
    if (!row) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({ unit: rowToSummary(row) }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
