import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { safeLocale } from '@/lib/locale'
import { guidesSearchParamsSchema } from '@/lib/guides/schemas'
import { rowToGuide, guideToCardData } from '@/lib/guides/mappers'
import { GUIDE_CATEGORIES, GUIDE_CATEGORY_LABELS, type Guide } from '@/lib/guides/types'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import { GuidesSearchForm } from '@/components/guides/GuidesSearchForm'
import { FeaturedGuides } from '@/components/guides/FeaturedGuides'
import { GuideCategorySection } from '@/components/guides/GuideCategorySection'
import { GuideCard } from '@/components/guides/GuideCard'
import { HubCtaBanner } from '@/components/guides/HubCtaBanner'
import { Link } from '@/i18n/navigation'

const BRAND = 'RE Platform'

type PageParams = { locale: string }
type PageSearchParams = Promise<Record<string, string | string[] | undefined>>

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)

  return {
    title: `Real estate guides and resources | ${BRAND}`,
    description:
      'Step-by-step guides for buying, selling, renting, and financing property in Armenia.',
    alternates: {
      canonical: `/${locale}/guides`,
      languages: { hy: '/hy/guides', ru: '/ru/guides', en: '/en/guides' },
    },
  }
}

// ── Data ─────────────────────────────────────────────────────────────────────

async function fetchFeatured(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<Guide[]> {
  const { data: pinnedRows } = await supabase
    .from('guides')
    .select('*')
    .eq('status', 'published')
    .eq('featured', true)
    .order('updated_at', { ascending: false })
    .limit(3)

  const featured = (pinnedRows ?? []).map(rowToGuide)
  if (featured.length >= 3) return featured.slice(0, 3)

  // Backfill with the most recently updated published guides (doc D7).
  const { data: recentRows } = await supabase
    .from('guides')
    .select('*')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(6)

  const seen = new Set(featured.map((g) => g.id))
  for (const row of recentRows ?? []) {
    if (featured.length >= 3) break
    const guide = rowToGuide(row)
    if (!seen.has(guide.id)) {
      featured.push(guide)
      seen.add(guide.id)
    }
  }
  return featured
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GuidesHubPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams: PageSearchParams
}) {
  const [{ locale: rawLocale }, sp] = await Promise.all([params, searchParams])
  const locale = safeLocale(rawLocale)

  const rawSearch = typeof sp.search === 'string' ? sp.search : undefined
  const rawCategory = typeof sp.category === 'string' ? sp.category : undefined
  const parsed = guidesSearchParamsSchema.parse({ search: rawSearch, category: rawCategory })

  // An out-of-taxonomy category (e.g. legacy nav links `selling-tips`,
  // `renting-tips` — see docs/design/16-guides-handoff.md D9) is stripped to
  // `undefined` by the schema's `.catch()`. Distinguish that from "no
  // category requested at all" so we can show a dedicated empty state
  // instead of silently rendering the unfiltered hub.
  const categoryUnknown = rawCategory !== undefined && parsed.category === undefined

  const supabase = await createServerClient()

  const breadcrumbs = [{ label: 'Home', href: '/' }, { label: 'Guides' }]

  // ── Unknown category → dedicated empty state, never a crash ──────────────
  if (categoryUnknown) {
    return (
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Guides</h1>
        <p className="text-gray-500 mt-6">No guides in this category yet.</p>
        <Link href="/guides" className="text-primary hover:underline mt-2 inline-block">
          Browse all guides
        </Link>
      </main>
    )
  }

  // ── Search mode: flat, shareable, server-driven results ───────────────────
  if (parsed.search) {
    let query = supabase.from('guides').select('*').eq('status', 'published')
    if (parsed.category) query = query.eq('category', parsed.category)
    const term = parsed.search
    query = query.or(
      [
        `title->>en.ilike.%${term}%`,
        `title->>hy.ilike.%${term}%`,
        `title->>ru.ilike.%${term}%`,
        `excerpt->>en.ilike.%${term}%`,
        `excerpt->>hy.ilike.%${term}%`,
        `excerpt->>ru.ilike.%${term}%`,
      ].join(','),
    )
    const { data } = await query.order('updated_at', { ascending: false })
    const results = (data ?? []).map((row) => guideToCardData(rowToGuide(row), locale))

    return (
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbs} />
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Guides</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Step-by-step guides for buying, selling, renting, and financing property in Armenia.
        </p>
        <GuidesSearchForm defaultValue={parsed.search} />

        {results.length > 0 ? (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
              {results.length} {results.length === 1 ? 'guide' : 'guides'} matching &ldquo;
              {parsed.search}&rdquo;
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-8">
            <p className="text-gray-500">
              Nothing found for &ldquo;{parsed.search}&rdquo;.
            </p>
            <p className="text-sm text-gray-500 mt-1">Try one of these guides instead:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
              {(await fetchFeatured(supabase)).map((guide) => (
                <GuideCard key={guide.slug} guide={guideToCardData(guide, locale)} />
              ))}
            </div>
          </div>
        )}

        <HubCtaBanner />
      </main>
    )
  }

  // ── Default hub view (optionally filtered to one valid category) ─────────
  const featured = parsed.category ? [] : await fetchFeatured(supabase)

  let allQuery = supabase.from('guides').select('*').eq('status', 'published')
  if (parsed.category) allQuery = allQuery.eq('category', parsed.category)
  const { data: allRows } = await allQuery.order('updated_at', { ascending: false })
  const allGuides = (allRows ?? []).map((row) => guideToCardData(rowToGuide(row), locale))

  const sections = GUIDE_CATEGORIES.map((category) => ({
    category,
    title: GUIDE_CATEGORY_LABELS[category],
    guides: allGuides.filter((g) => g.category === category),
  }))

  const hasAnyGuides = sections.some((s) => s.guides.length > 0)

  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-bold text-gray-900 mt-2">Guides</h1>
      <p className="text-sm text-gray-500 mt-1 max-w-2xl">
        Step-by-step guides for buying, selling, renting, and financing property in Armenia.
      </p>
      <GuidesSearchForm />

      {!hasAnyGuides && (
        <p className="text-gray-500 mt-8">No guides in this category yet.</p>
      )}

      <FeaturedGuides guides={featured.map((g) => guideToCardData(g, locale))} />

      {sections.map((section) => (
        <GuideCategorySection
          key={section.category}
          title={section.title}
          guides={section.guides}
        />
      ))}

      <HubCtaBanner />
    </main>
  )
}
