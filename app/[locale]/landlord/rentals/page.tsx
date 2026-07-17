import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import type { RentalUnitSummary } from '@/lib/landlord/types'
import LandlordSubNav from '@/components/landlord/LandlordSubNav'
import RentalsDashboard from '@/components/landlord/RentalsDashboard'

export const metadata: Metadata = {
  title: 'Manage rentals — Landlord tools | RE Platform',
  // Private, login-gated, RLS owner-scoped dashboard — never indexed (§8).
  robots: { index: false, follow: false },
}

interface RentalUnitRow {
  id: string
  address: string
  type: RentalUnitSummary['type']
  area_m2: number | null
  rent: number
  currency: RentalUnitSummary['currency']
  status: RentalUnitSummary['status']
  photo_url: string | null
  tenant_name: string | null
  tenant_contact: string | null
  lease_end: string | null
  payment_status: RentalUnitSummary['paymentStatus']
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
 * `/landlord/rentals` — Manage Rentals (Page 19 §3.2). Login-gated: guests
 * are redirected to login with `?next` back to this page. RLS on
 * `rental_units` (`owner_id = auth.uid()`) additionally guarantees the
 * query below can never return another user's units even if this check
 * were bypassed.
 */
export default async function RentalsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/landlord/rentals')
  }

  const { data } = await supabase
    .from('rental_units')
    .select(
      'id, address, type, area_m2, rent, currency, status, photo_url, tenant_name, tenant_contact, lease_end, payment_status, next_payment_due, created_at',
    )
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const units = ((data ?? []) as unknown as RentalUnitRow[]).map(rowToSummary)

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6 lg:space-y-0 lg:flex lg:gap-8">
      <LandlordSubNav active="rentals" />
      <div className="flex-1 min-w-0">
        <RentalsDashboard initialUnits={units} />
      </div>
    </div>
  )
}
