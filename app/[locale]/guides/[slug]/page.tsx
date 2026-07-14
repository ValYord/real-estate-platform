import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { safeLocale, LOCALES } from '@/lib/locale'
import { rowToGuide, guideToCardData } from '@/lib/guides/mappers'
import { pickLocalized, hasHowToSteps } from '@/lib/guides/content'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import { GuideHeader } from '@/components/guides/GuideHeader'
import { GuideToc } from '@/components/guides/GuideToc'
import { GuideBody } from '@/components/guides/GuideBody'
import { RelatedGuides } from '@/components/guides/RelatedGuides'
import { HubCtaBanner } from '@/components/guides/HubCtaBanner'

const BRAND = 'RE Platform'

type PageParams = { locale: string; slug: string }

async function fetchGuideBySlug(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  slug: string,
) {
  // RLS ("guides: published are public") already restricts this to
  // status = 'published' rows for the anon-key client — no extra .eq() needed
  // to enforce that, but being explicit keeps intent obvious in the query.
  const { data } = await supabase
    .from('guides')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return data ? rowToGuide(data) : null
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params
  const locale = safeLocale(rawLocale)

  const supabase = await createServerClient()
  const guide = await fetchGuideBySlug(supabase, slug)
  if (!guide) {
    return { title: `Guide not found | ${BRAND}` }
  }

  const title = pickLocalized(locale, guide.title) ?? guide.slug
  const description = (pickLocalized(locale, guide.excerpt) ?? '').slice(0, 155)
  const canonical = `/${locale}/guides/${guide.slug}`

  // hreflang only for locales that actually have non-empty title content
  // (doc §12 — "only for translated variants").
  const availableLocales = LOCALES.filter((l) => Boolean(guide.title[l]))
  const languages = Object.fromEntries(
    availableLocales.map((l) => [l, `/${l}/guides/${guide.slug}`]),
  )

  return {
    title: `${title} — Guide | ${BRAND}`,
    description,
    alternates: { canonical, languages },
    openGraph: {
      type: 'article',
      title,
      description,
      images: guide.coverUrl ? [{ url: guide.coverUrl }] : [],
      modifiedTime: guide.updatedAt,
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GuidePage({ params }: { params: Promise<PageParams> }) {
  const { locale: rawLocale, slug } = await params
  const locale = safeLocale(rawLocale)

  const supabase = await createServerClient()
  const guide = await fetchGuideBySlug(supabase, slug)
  if (!guide) notFound()

  const title = pickLocalized(locale, guide.title) ?? guide.slug
  const excerpt = pickLocalized(locale, guide.excerpt)
  const blocks = pickLocalized(locale, guide.body) ?? []
  const toc = pickLocalized(locale, guide.toc) ?? []

  // ── Related guides: same category, most recently updated, excluding self ─
  const { data: relatedRows } = await supabase
    .from('guides')
    .select('*')
    .eq('status', 'published')
    .eq('category', guide.category)
    .neq('id', guide.id)
    .order('updated_at', { ascending: false })
    .limit(4)
  const related = (relatedRows ?? []).map((row) => guideToCardData(rowToGuide(row), locale))

  const canonicalUrl = `https://example.com/${locale}/guides/${guide.slug}`
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Guides', href: '/guides' },
    { label: title },
  ]

  // ── JSON-LD: Article always, HowTo when the guide has ≥2 step headings ───
  const steps = toc.filter((entry) => entry.level === 2)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': canonicalUrl,
        headline: title,
        description: excerpt ?? undefined,
        image: guide.coverUrl ? [guide.coverUrl] : undefined,
        dateModified: guide.updatedAt,
        author: guide.authorName ? { '@type': 'Person', name: guide.authorName } : undefined,
        publisher: { '@type': 'Organization', name: BRAND },
      },
      ...(hasHowToSteps(toc)
        ? [
            {
              '@type': 'HowTo',
              name: title,
              step: steps.map((s) => ({ '@type': 'HowToStep', name: s.text })),
            },
          ]
        : []),
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        <Breadcrumbs items={breadcrumbs} />

        <GuideHeader
          title={title}
          intro={excerpt}
          updatedAt={guide.updatedAt}
          readingTime={guide.readingTime}
          authorName={guide.authorName}
          authorCredentials={guide.authorCredentials}
          coverUrl={guide.coverUrl}
        />

        <div className="lg:flex lg:gap-10 lg:items-start">
          <GuideToc entries={toc} />
          <div className="flex-1 min-w-0">
            <GuideBody blocks={blocks} />
          </div>
        </div>

        <HubCtaBanner
          title="Ready for the next step?"
          subtitle="Search available properties or estimate your monthly mortgage payment."
        />

        <RelatedGuides guides={related} />
      </main>
    </>
  )
}
