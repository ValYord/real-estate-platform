import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { safeLocale } from '@/lib/locale'
import { EstimateResultCard } from '@/components/home-value/EstimateResultCard'
import { HomeValueCtaCard } from '@/components/home-value/HomeValueCtaCard'
import { HomeValueDisclaimer } from '@/components/home-value/HomeValueDisclaimer'
import type { EstimateSnapshot } from '@/app/api/home-value/[hash]/route'

const BRAND = 'RE Platform'

type PageParams = { locale: string; estimateHash: string }

async function fetchSnapshot(hash: string): Promise<EstimateSnapshot | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/home-value/${encodeURIComponent(hash)}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as EstimateSnapshot
  } catch {
    return null
  }
}

// Share snapshots are private/ephemeral — never indexed (docs §8).
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  await params
  return {
    title: `Home value estimate | ${BRAND}`,
    robots: { index: false, follow: false },
  }
}

/**
 * /[locale]/home-value/[estimateHash] — read-only, publicly shareable
 * snapshot of a previously computed estimate (docs §0, §4 "Share view").
 * SSR via `GET /api/home-value/[hash]` (service-role, scoped by the exact
 * hash — see the migration for the RLS rationale). No owner-identifying
 * data is fetched or rendered.
 */
export default async function HomeValueSnapshotPage({ params }: { params: Promise<PageParams> }) {
  const { locale: rawLocale, estimateHash } = await params
  safeLocale(rawLocale)

  const snapshot = await fetchSnapshot(estimateHash)
  if (!snapshot) notFound()

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
      <div className="mb-6">
        <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Shared estimate</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Home value snapshot</h1>
        <p className="text-sm text-gray-500 mt-1">
          A read-only copy of a previously calculated estimate.{' '}
          <Link href="/home-value" className="text-primary hover:underline">
            Get your own estimate
          </Link>
          .
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
        <div className="min-w-0">
          <EstimateResultCard data={snapshot} addressLabel={snapshot.addressLabel} />
        </div>
        <div className="mt-6 lg:mt-0">
          <HomeValueCtaCard
            estimate={snapshot.estimate}
            district={snapshot.district ?? undefined}
            areaM2={snapshot.areaM2}
            propertyType={snapshot.propertyType}
            addressLabel={snapshot.addressLabel ?? undefined}
          />
        </div>
      </div>

      <HomeValueDisclaimer className="mt-6" />
    </main>
  )
}
