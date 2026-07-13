import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { safeLocale } from '@/lib/locale'
import { Link } from '@/i18n/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { mapPlanRow } from '@/lib/plans/mapPlanRow'
import { DEFAULT_PLANS } from '@/lib/plans/defaultPlans'
import type { Plan, PlanTier } from '@/lib/plans/types'
import PlanComparison from '@/components/pro/PlanComparison'
import PricingFaq from '@/components/pro/PricingFaq'

type PageParams = { locale: string }

// ── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'pro' })
  const canonical = `/${locale}/pro`

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical,
      languages: {
        hy: '/hy/pro',
        ru: '/ru/pro',
        en: '/en/pro',
        'x-default': '/hy/pro',
      },
    },
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      url: canonical,
      type: 'website',
    },
    // No `robots` override — this is a public, indexable monetization page.
  }
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function loadPlans(): Promise<{ plans: Plan[]; currentTier: PlanTier | null }> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let currentTier: PlanTier | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .maybeSingle()
    // Cast rather than rely on inference — same convention as
    // app/api/favorites/route.ts's `PriceRow` cast (this supabase-js
    // version's generic resolution for narrow `.select()` projections is
    // unreliable here).
    type TierRow = { tier: PlanTier }
    currentTier = (profile as TierRow | null)?.tier ?? 'free'
  }

  let plans: Plan[] = DEFAULT_PLANS
  try {
    const { data: rows, error } = await supabase
      .from('plans')
      .select('tier, is_popular, prices, features')
      .order('sort_order', { ascending: true })
    if (!error && rows && rows.length > 0) {
      plans = rows.map(mapPlanRow)
    }
  } catch {
    // Supabase unreachable/unconfigured — keep the typed fallback config.
  }

  return { plans, currentTier }
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * `/pro` — Pricing / tier comparison (Page 17, MVP scope). Server Component
 * shell: hero + tier comparison table sourced from the `plans` table (RLS
 * public-read, migration 0009_plans.sql) with a typed fallback config. The
 * billing-cycle toggle, currency display and FAQ accordion are client
 * components (components/pro/*); this shell renders no client JS of its own.
 * `/advertise`, real Stripe checkout and admin plan management are
 * explicitly out of scope — see docs/en/pages/17-pricing.md.
 */
export default async function ProPage({ params }: { params: Promise<PageParams> }) {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'pro' })

  const { plans, currentTier } = await loadPlans()

  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 text-sm text-gray-500">
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
            <span className="text-gray-900 font-medium">{t('tiers.pro')}</span>
          </li>
        </ol>
      </nav>

      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('hero.h1')}</h1>
        <p className="text-base sm:text-lg text-gray-500 mt-2">{t('hero.subtitle')}</p>
      </div>

      <PlanComparison plans={plans} currentTier={currentTier} />

      <PricingFaq />
    </main>
  )
}
