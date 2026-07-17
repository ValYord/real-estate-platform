import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ApplicationForm from '@/components/landlord/ApplicationForm'

export const metadata: Metadata = {
  title: 'Rental application | RE Platform',
  // Single-use share link, not a marketing page — never indexed.
  robots: { index: false, follow: false },
}

type PageParams = { token: string }

/**
 * `/apply/[token]` — the public, unauthenticated tenant application form
 * (docs/en/pages/19-landlord.md §3.3 "a shareable link/QR for the tenant").
 * Looks the unit up by its `apply_token` bearer capability with the
 * service-role client (RLS on `rental_units` doesn't grant public SELECT —
 * same reasoning as app/[locale]/home-value/[estimateHash]/page.tsx) and
 * only ever exposes the address, never `owner_id` or any other field.
 */
export default async function ApplyPage({ params }: { params: Promise<PageParams> }) {
  const { token } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const isConfigured =
    supabaseUrl && serviceRoleKey && !supabaseUrl.includes('placeholder') && !supabaseUrl.includes('your-project-id')

  if (!isConfigured) {
    notFound()
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { data: unit } = await admin
    .from('rental_units')
    .select('address')
    .eq('apply_token', token)
    .maybeSingle()

  if (!unit) {
    notFound()
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 lg:py-12">
      <ApplicationForm token={token} unitAddress={unit.address} />
    </div>
  )
}
