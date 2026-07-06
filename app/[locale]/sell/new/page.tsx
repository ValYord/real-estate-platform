import type { Metadata } from 'next'
import ListingWizard from '@/components/wizard/ListingWizard'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

interface SellNewPageProps {
  searchParams: Promise<{ draft?: string }>
}

/**
 * /[locale]/sell/new — Create a new listing.
 * Auth-gated via middleware (redirect to /auth/register?next=/sell/new).
 */
export default async function SellNewPage({ searchParams }: SellNewPageProps) {
  const { draft } = await searchParams
  return <ListingWizard mode="create" draftId={draft} />
}
