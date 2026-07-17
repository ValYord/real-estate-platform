import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import LandlordSubNav from '@/components/landlord/LandlordSubNav'
import ScreeningDashboard from '@/components/landlord/ScreeningDashboard'
import type { LandlordUnitOption, TenantApplicationSummary } from '@/lib/landlord/types'
import type { TenantApplicationStatus } from '@/types/database'

export const metadata: Metadata = {
  title: 'Screen tenants — Landlord tools | RE Platform',
  // Private, login-gated, RLS owner-scoped dashboard — never indexed (§8).
  robots: { index: false, follow: false },
}

interface ApplicationRow {
  id: string
  unit_id: string
  applicant_name: string
  contact: string
  employment: string | null
  income: number | null
  residence: string | null
  references_info: string | null
  declaration: string | null
  consent: boolean
  status: TenantApplicationStatus
  notes: string | null
  created_at: string
  rental_units: { address: string } | null
}

function rowToSummary(row: ApplicationRow): TenantApplicationSummary {
  return {
    id: row.id,
    unitId: row.unit_id,
    unitAddress: row.rental_units?.address ?? '—',
    applicantName: row.applicant_name,
    contact: row.contact,
    employment: row.employment,
    income: row.income,
    residence: row.residence,
    references: row.references_info,
    declaration: row.declaration,
    consent: row.consent,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

/**
 * `/landlord/screening` — Screen Tenants (Page 19 §3.3). Login-gated: guests
 * are redirected to login with `?next` back to this page. RLS on
 * `tenant_applications` (owner-scoped through the owning `rental_units`
 * row) additionally guarantees the query below can never return another
 * landlord's applications even if this check were bypassed.
 */
export default async function ScreeningPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/landlord/screening')
  }

  const [{ data: unitRows }, { data: applicationRows }] = await Promise.all([
    supabase.from('rental_units').select('id, address').eq('owner_id', user.id).order('created_at', { ascending: false }),
    supabase
      .from('tenant_applications')
      .select(
        'id, unit_id, applicant_name, contact, employment, income, residence, references_info, declaration, consent, status, notes, created_at, rental_units!tenant_applications_unit_id_fkey(address)',
      )
      .order('created_at', { ascending: false }),
  ])

  const units: LandlordUnitOption[] = (unitRows ?? []) as unknown as LandlordUnitOption[]
  const applications = ((applicationRows ?? []) as unknown as ApplicationRow[]).map(rowToSummary)

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6 lg:space-y-0 lg:flex lg:gap-8">
      <LandlordSubNav active="screening" />
      <div className="flex-1 min-w-0">
        <ScreeningDashboard units={units} initialApplications={applications} />
      </div>
    </div>
  )
}
