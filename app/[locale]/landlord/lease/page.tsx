import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import LandlordSubNav from '@/components/landlord/LandlordSubNav'
import LeaseDashboard from '@/components/landlord/LeaseDashboard'
import type { LandlordUnitOption, LeaseTemplateSummary, TenantApplicationSummary } from '@/lib/landlord/types'
import type { Locale, LeaseDealType, TenantApplicationStatus } from '@/types/database'

export const metadata: Metadata = {
  title: 'Create a lease — Landlord tools | RE Platform',
  // Private, login-gated, RLS owner-scoped dashboard — never indexed (§8).
  robots: { index: false, follow: false },
}

interface TemplateRow {
  id: string
  country: string
  lang: Locale
  deal_type: LeaseDealType
  name: string
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

function applicationRowToSummary(row: ApplicationRow): TenantApplicationSummary {
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

type SearchParams = { unit?: string; application?: string }

/**
 * `/landlord/lease` — Create a Lease (Page 19 §3.4). Login-gated; RLS on
 * `leases`/`tenant_applications` scopes every query below to the caller's
 * own data. `?unit=` / `?application=` (set by
 * ApplicationDetailPanel's "Create a lease →" link after an Approve) drive
 * the initial unit + tenant-prefill selection (§3.3 "Approve → move to
 * lease creation (prefill tenant data)").
 */
export default async function LeasePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/landlord/lease')
  }

  const { unit: initialUnitId, application: initialApplicationId } = await searchParams

  const [{ data: unitRows }, { data: templateRows }, { data: applicationRows }] = await Promise.all([
    supabase.from('rental_units').select('id, address').eq('owner_id', user.id).order('created_at', { ascending: false }),
    supabase.from('lease_templates').select('id, country, lang, deal_type, name').order('name', { ascending: true }),
    supabase
      .from('tenant_applications')
      .select(
        'id, unit_id, applicant_name, contact, employment, income, residence, references_info, declaration, consent, status, notes, created_at, rental_units!tenant_applications_unit_id_fkey(address)',
      )
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
  ])

  const units: LandlordUnitOption[] = (unitRows ?? []) as unknown as LandlordUnitOption[]
  const templates: LeaseTemplateSummary[] = ((templateRows ?? []) as unknown as TemplateRow[]).map((row) => ({
    id: row.id,
    country: row.country,
    lang: row.lang,
    dealType: row.deal_type,
    name: row.name,
  }))
  const approvedApplications = ((applicationRows ?? []) as unknown as ApplicationRow[]).map(applicationRowToSummary)

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6 lg:space-y-0 lg:flex lg:gap-8">
      <LandlordSubNav active="lease" />
      <div className="flex-1 min-w-0">
        <LeaseDashboard
          units={units}
          templates={templates}
          approvedApplications={approvedApplications}
          initialUnitId={initialUnitId}
          initialApplicationId={initialApplicationId}
        />
      </div>
    </div>
  )
}
