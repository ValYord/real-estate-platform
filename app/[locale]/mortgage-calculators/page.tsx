import type { Metadata } from 'next'
import { Link } from '@/i18n/navigation'
import { safeLocale } from '@/lib/locale'
import MortgagePaymentCalculator from '@/components/mortgage/MortgagePaymentCalculator'

const BRAND = 'RE Platform'

type PageParams = { locale: string }

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const canonical = `/${locale}/mortgage-calculators`

  return {
    title: `Mortgage calculator — monthly payment | ${BRAND}`,
    description:
      'Estimate your monthly mortgage payment, total interest, and total cost. Free, instant, no signup required.',
    alternates: {
      canonical,
      languages: {
        hy: '/hy/mortgage-calculators',
        ru: '/ru/mortgage-calculators',
        en: '/en/mortgage-calculators',
      },
    },
    // No `robots` override — this is a public, indexable tool page.
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Mortgage Calculators Hub — MVP scope: a single, standalone, client-side
 * Monthly Payment calculator (see docs/design/13-mortgage-calc-handoff.md).
 * Server Component shell (SEO metadata only, no data fetching) rendering
 * one client component that owns 100% of the interactive state.
 */
export default async function MortgageCalculatorsPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  await params

  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-4">
        {/* Desktop: Home › Mortgage calculator */}
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
            <span className="text-gray-900 font-medium">Mortgage calculator</span>
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
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mortgage calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Estimate your monthly payment, total interest, and total cost.
        </p>
      </div>

      <MortgagePaymentCalculator />

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 mt-8">
        The calculations are estimates, not financial advice. Actual rates depend on the bank and
        your profile.
      </p>
    </main>
  )
}
