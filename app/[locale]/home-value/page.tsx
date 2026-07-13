import type { Metadata } from 'next'
import { Suspense } from 'react'
import { safeLocale } from '@/lib/locale'
import { HomeValueFlow } from '@/components/home-value/HomeValueFlow'
import { HomeValueDisclaimer } from '@/components/home-value/HomeValueDisclaimer'

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
    title: `How much is my home worth — free valuation | ${BRAND}`,
    description: 'Find out the approximate value of your property in seconds. Free, no signup required.',
    alternates: {
      canonical: `/${locale}/home-value`,
      languages: {
        hy: '/hy/home-value',
        ru: '/ru/home-value',
        en: '/en/home-value',
      },
    },
  }
}

/**
 * /[locale]/home-value — Page 12, Phase-1 MVP (docs/en/pages/12-home-value.md).
 *
 * Server Component shell: SSR hero (fast first paint, SEO) wraps a single
 * client island (`<HomeValueFlow>`) that owns the Input → Details → Result
 * state machine, matching the same "Server Component shell + one client
 * island" split already used by /mortgage-calculators.
 */
export default async function HomeValuePage({ params }: { params: Promise<PageParams> }) {
  await params

  return (
    <main>
      <div className="bg-gradient-to-b from-primary/5 to-white py-10 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">
            Find out how much your home is worth
          </h1>
          <p className="text-base sm:text-lg text-gray-500 mt-2">Free valuation in seconds</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="h-14 w-full bg-gray-100 animate-pulse rounded-xl" />
              <HomeValueDisclaimer />
            </div>
          }
        >
          <HomeValueFlow />
        </Suspense>
      </div>
    </main>
  )
}
