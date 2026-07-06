import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import ListingWizard from '@/components/wizard/ListingWizard'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

interface EditListingPageProps {
  params: Promise<{ id: string; locale: string }>
}

/**
 * /[locale]/listing/[id]/edit — Edit an existing listing.
 * Auth-gated via middleware. Non-owners get 404.
 */
export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Verify ownership before rendering the wizard.
  // Supabase type inference can't resolve the select string, so we cast below.
  type ListingOwner = { id: string; owner_id: string }
  const ownerResult = await supabase
    .from('properties')
    .select('id, owner_id')
    .eq('id', id)
    .single()

  const listing = ownerResult.data as unknown as ListingOwner | null

  if (!listing || listing.owner_id !== user.id) {
    notFound()
  }

  return <ListingWizard mode="edit" listingId={id} />
}
