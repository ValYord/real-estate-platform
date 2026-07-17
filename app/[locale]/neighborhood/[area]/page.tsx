import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { safeLocale } from '@/lib/locale'
import { Link } from '@/i18n/navigation'
import Button from '@/components/ui/Button'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import AreaHero from '@/components/neighborhood/AreaHero'
import PriceTrendChart from '@/components/neighborhood/PriceTrendChart'
import ActiveListingsCarousel from '@/components/neighborhood/ActiveListingsCarousel'
import RecentlySoldTable from '@/components/neighborhood/RecentlySoldTable'
import MarketActivityStats from '@/components/neighborhood/MarketActivityStats'
import NearbyNeighborhoods from '@/components/neighborhood/NearbyNeighborhoods'
import AlertCtaButton from '@/components/neighborhood/AlertCtaButton'
import { AREA_SLUGS, getAreaBySlug, listNearbyAreas } from '@/lib/market/areaRegistry'
import { loadAreaPageData } from '@/lib/market/pageData'
import { MIN_CONTENT_THRESHOLD } from '@/lib/market/types'
import type { MarketSummaryResponse } from '@/lib/market/types'
import { formatPrice } from '@/lib/market/format'
import { SITE_URL } from '@/lib/seo/constants'
import { LOCALES } from '@/lib/locale'

type PageParams = { locale: string; area: string }

const BRAND = 'RE Platform'

/**
 * ISR — precompute the heavy aggregates once a day and serve static HTML to
 * crawlers/users rather than recomputing on every request (product doc §5/§8).
 * Combined with `generateStaticParams` + `dynamicParams = false` below, only
 * the closed set of registered area slugs can ever render — anything else
 * 404s before this module's code even runs (defense in depth on top of the
 * explicit `notFound()` calls further down, which cover direct
 * function/test invocation outside the Next.js router).
 */
export const revalidate = 86400
export const dynamicParams = false

/**
 * Next.js needs the full `{locale, area}` cross product here, not just
 * `{area}` — the parent `[locale]` layout has no `generateStaticParams` of
 * its own, so omitting `locale` would leave every `{locale, area}` path
 * combination un-generated and, combined with `dynamicParams = false` below,
 * every request would 404 instead of serving the pre-rendered page.
 */
export function generateStaticParams(): Array<{ locale: string; area: string }> {
  return LOCALES.flatMap((locale) => AREA_SLUGS.map((area) => ({ locale, area })))
}

/** "{areaName}: median {X}, {N} active, {±Y}% YoY." — assembled from the aggregate the page itself renders, never a second CMS-authored copy to keep in sync. */
function buildDescription(areaName: string, summary: MarketSummaryResponse): string {
  const parts: string[] = []
  if (summary.medianPrice !== null) parts.push(`median ${formatPrice(summary.medianPrice, summary.currency)}`)
  if (summary.activeCount > 0) parts.push(`${summary.activeCount} active listings`)
  if (summary.yoyChange !== null) parts.push(`${summary.yoyChange >= 0 ? '+' : ''}${summary.yoyChange}% YoY`)

  const stats = parts.length > 0 ? parts.join(', ') : 'market data'
  return `${areaName} real estate: ${stats}. Explore prices, trends and active listings.`.slice(0, 155)
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale: rawLocale, area: slug } = await params
  const locale = safeLocale(rawLocale)
  const area = getAreaBySlug(slug)
  if (!area) return { title: `Area not found | ${BRAND}` }

  const data = await loadAreaPageData(slug)
  if (!data) return { title: `Area not found | ${BRAND}` }
  const { summary, sold } = data

  const year = new Date().getFullYear()
  const title = `${area.name}, ${area.city} real estate: prices, trends ${year} | ${BRAND}`
  const description = buildDescription(area.name, summary)

  // Programmatic-SEO thin-content guard (product doc §8): a page with
  // effectively nothing area-specific yet (near-zero active + sold rows)
  // stays `noindex` until enough content accumulates, rather than shipping
  // hundreds of thin/duplicate-looking pages to the crawl.
  const soldCount = sold?.items.length ?? 0
  const isThin = summary.activeCount + soldCount < MIN_CONTENT_THRESHOLD

  const canonical = `/${locale}/neighborhood/${slug}`
  const languages: Record<string, string> = {
    hy: `/hy/neighborhood/${slug}`,
    ru: `/ru/neighborhood/${slug}`,
    en: `/en/neighborhood/${slug}`,
  }

  return {
    title,
    description,
    robots: isThin ? { index: false, follow: true } : undefined,
    alternates: { canonical, languages },
    openGraph: { title, description, url: canonical, type: 'website' },
  }
}

export default async function NeighborhoodPage({ params }: { params: Promise<PageParams> }) {
  const { area: slug } = await params
  const area = getAreaBySlug(slug)
  if (!area) notFound()

  const data = await loadAreaPageData(slug)
  if (!data) notFound()
  const { summary, trends, sold } = data

  const nearby = listNearbyAreas(slug, 4)

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: area.city, href: `/search?city=${encodeURIComponent(area.city)}` },
    { label: area.name },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Place',
        name: `${area.name}, ${area.city}`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: area.city,
          addressRegion: area.name,
          addressCountry: area.country,
        },
        geo: { '@type': 'GeoCoordinates', latitude: area.lat, longitude: area.lng },
      },
      {
        '@type': 'Dataset',
        name: `${area.name}, ${area.city} real estate market data`,
        description: buildDescription(area.name, summary),
        dateModified: summary.dateModified,
        variableMeasured: ['medianPrice', 'activeCount', 'pricePerM2', 'yoyChange'],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: crumb.label,
          ...(crumb.href ? { item: `${SITE_URL}${crumb.href}` } : {}),
        })),
      },
    ],
  }

  const searchHref = `/search?city=${encodeURIComponent(area.city)}&district=${encodeURIComponent(area.district)}`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="max-w-7xl mx-auto px-4 pb-24 lg:pb-12">
        <Breadcrumbs items={breadcrumbs} className="py-3" />

        <AreaHero areaName={area.name} city={area.city} summary={summary} />

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 mt-8">
          {/* Main column */}
          <div className="min-w-0 space-y-8">
            <PriceTrendChart areaSlug={slug} areaName={area.name} initialData={trends} />
            <ActiveListingsCarousel city={area.city} district={area.district} areaName={area.name} />
            <RecentlySoldTable items={sold.items} />
          </div>

          {/* Aside */}
          <aside className="space-y-8 mt-8 lg:mt-0">
            <MarketActivityStats summary={summary} />
            <NearbyNeighborhoods areas={nearby} />
          </aside>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-10 pt-8 border-t border-border">
          <Link href={searchHref}>
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              Search properties in {area.name}
            </Button>
          </Link>
          <AlertCtaButton city={area.city} district={area.district} areaName={area.name} />
        </div>
      </main>
    </>
  )
}
