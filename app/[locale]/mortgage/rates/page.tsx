import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { safeLocale } from '@/lib/locale'
import { parseRatesFilter, ratesFilterToParams, type RatesFilter } from '@/lib/mortgage/rates/schemas'
import { getRates, type RatesQueryResult } from '@/lib/mortgage/rates/getRates'
import { formatRateDate } from '@/lib/mortgage/rates/format'
import RatesFilterBar from '@/components/mortgage/rates/RatesFilterBar'
import RatesTable from '@/components/mortgage/rates/RatesTable'
import PreApprovalCtaBlock from '@/components/mortgage/rates/PreApprovalCtaBlock'
import RatesDisclaimer from '@/components/mortgage/rates/RatesDisclaimer'

const BRAND = 'RE Platform'

type PageParams = { locale: string }
type PageSearchParams = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)

  return {
    title: `Mortgage interest rates — compare banks | ${BRAND}`,
    description:
      'Compare current mortgage interest rates from partner banks. Filter by country, currency, term, and loan amount.',
    alternates: {
      canonical: `/${locale}/mortgage/rates`,
      languages: { hy: '/hy/mortgage/rates', ru: '/ru/mortgage/rates', en: '/en/mortgage/rates' },
    },
    // No `robots` override — public, indexable comparison tool page (same as /mortgage-calculators).
  }
}

function parseSearchParamsInput(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const entries = Object.entries(sp).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  )
  return new URLSearchParams(entries)
}

/**
 * Mortgage Rates Hub MVP — Server Component shell (SSR, SEO). Reads
 * `searchParams` (the URL query is the single source of truth, D6),
 * zod-validates them, and self-fetches its own `GET /api/mortgage/rates`
 * via an absolute URL — identical to app/[locale]/search/page.tsx's
 * pattern — falling back to a direct `getRates` call if the fetch itself
 * fails (e.g. during tests/build with no dev server listening).
 */
export default async function MortgageRatesPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams: PageSearchParams
}) {
  await params
  const sp = await searchParams
  const urlParams = parseSearchParamsInput(sp)

  let filters: RatesFilter
  try {
    filters = parseRatesFilter(urlParams)
  } catch {
    filters = {}
  }

  let ratesData: RatesQueryResult
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const qs = ratesFilterToParams(filters).toString()
    const res = await fetch(`${baseUrl}/api/mortgage/rates${qs ? `?${qs}` : ''}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error('mortgage rates fetch failed')
    ratesData = await res.json()
  } catch {
    ratesData = await getRates(filters)
  }

  const { updatedAt, items } = ratesData

  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        {/* Desktop: Home › Mortgage rates */}
        <ol className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
          <li>
            <Link
              href="/"
              className="hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="select-none">
            ›
          </li>
          <li>
            <span className="text-gray-900 font-medium">Mortgage rates</span>
          </li>
        </ol>

        {/* Mobile: ‹ Back */}
        <Link
          href="/"
          className="sm:hidden inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <span aria-hidden="true">‹</span>
          Back
        </Link>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mortgage interest rates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Compare {items.length} {items.length === 1 ? 'offer' : 'offers'}
        </p>
        <span className="inline-block mt-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
          Updated: {formatRateDate(updatedAt)}
        </span>
        <p className="text-xs text-gray-400 mt-2">
          The interest rates are informational and may change.{' '}
          <a href="#disclaimer" className="underline hover:text-gray-600">
            See disclaimer
          </a>
          .
        </p>
      </div>

      <RatesFilterBar values={filters} />

      <RatesTable items={items} filters={filters} />

      <PreApprovalCtaBlock
        defaultCountry={filters.country}
        defaultCurrency={filters.currency}
        defaultLoanAmount={filters.amount}
      />

      <div id="disclaimer">
        <RatesDisclaimer updatedAt={updatedAt} />
      </div>
    </main>
  )
}
