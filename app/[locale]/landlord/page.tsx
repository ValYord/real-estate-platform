import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { safeLocale } from '@/lib/locale'
import { createServerClient } from '@/lib/supabase/server'
import { computeQuickStats } from '@/lib/landlord/getQuickStats'
import type { RentalUnitSummary } from '@/lib/landlord/types'
import ToolCardGrid from '@/components/landlord/ToolCardGrid'
import QuickStats from '@/components/landlord/QuickStats'
import Button from '@/components/ui/Button'

const BRAND = 'RE Platform'

type PageParams = { locale: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)

  return {
    title: `Landlord tools — lease, screening, rent | ${BRAND}`,
    description:
      'Manage your rental property in one place: track units, screen tenants, generate a lease, and collect rent online.',
    alternates: {
      canonical: `/${locale}/landlord`,
      languages: { hy: '/hy/landlord', ru: '/ru/landlord', en: '/en/landlord' },
    },
    // No `robots` override — public, indexable marketing landing (§8).
  }
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
 * Landlord Tools hub (Page 19 §0-2, §3.1) — SSR, indexable marketing
 * landing. Works for guests (marketing content only); logged-in landlords
 * with units see real quick stats, landlords with none see an onboarding
 * empty state instead.
 */
export default async function LandlordHubPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let units: RentalUnitSummary[] = []

  if (user) {
    const { data } = await supabase
      .from('rental_units')
      .select(
        'id, address, type, area_m2, rent, currency, status, photo_url, tenant_name, tenant_contact, lease_end, payment_status, next_payment_due, created_at',
      )
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    units = ((data ?? []) as unknown as RentalUnitRow[]).map(rowToSummary)
  }

  const hasUnits = units.length > 0
  const stats = hasUnits ? computeQuickStats(units) : null

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 lg:py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text">Landlord tools</h1>
        <p className="text-muted mt-1">Manage your rental property in one place</p>
      </div>

      {stats && <QuickStats stats={stats} />}

      {user && !hasUnits && (
        <div className="rounded-lg border border-border bg-surface p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">Get started</h2>
            <p className="text-sm text-muted mt-1">Add your first rental property to start tracking units, tenants, and rent.</p>
          </div>
          <Link href="/landlord/rentals">
            <Button>Add your first rental property</Button>
          </Link>
        </div>
      )}

      <ToolCardGrid />
    </div>
  )
}
