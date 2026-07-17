import 'server-only'
import { cache } from 'react'
import { getAreaBySlug } from './areaRegistry'
import { fetchAreaRows } from './fetchAreaRows'
import { computeMarketSummary, computeSoldRecords, computeTrendSeries } from './aggregate'
import type { MarketSummaryResponse, SoldResponse, TrendsResponse } from './types'

export interface AreaPageData {
  summary: MarketSummaryResponse
  trends: TrendsResponse
  sold: SoldResponse
}

/**
 * Loads everything `/[locale]/neighborhood/[area]/page.tsx` needs by calling
 * the same aggregation functions the `/api/market/[area]*` route handlers
 * use, directly and in-process — deliberately NOT via a self-referencing
 * `fetch()` to those routes.
 *
 * During `next build`'s static-generation phase (which is what actually
 * produces the ISR HTML for every slug in `generateStaticParams`) there is
 * no HTTP server listening yet, so `fetch('http://localhost:3000/api/...')`
 * always fails at that point. An earlier version of this page did exactly
 * that, which meant the aggregate fetch silently failed during every build,
 * `notFound()` fired for every area, and no real static HTML was ever
 * produced — the page 404'd for every locale/area in production despite
 * `npm run build` reporting success. Calling the aggregation functions
 * directly sidesteps that chicken-and-egg problem entirely (and is cheaper
 * at runtime too — one `fetchAreaRows` call instead of three round trips).
 *
 * Wrapped in React's `cache()` so `generateMetadata` and the page component
 * share one `fetchAreaRows` call per render pass instead of two.
 */
export const loadAreaPageData = cache(async function loadAreaPageData(slug: string): Promise<AreaPageData | null> {
  const area = getAreaBySlug(slug)
  if (!area) return null

  const referenceDate = new Date()
  const rows = await fetchAreaRows(area)

  const metrics = computeMarketSummary(rows, referenceDate)
  const summary: MarketSummaryResponse = {
    area: area.slug,
    name: area.name,
    city: area.city,
    country: area.country,
    ...metrics,
  }
  const trends = computeTrendSeries(rows, '12m', 'sale', 'total', referenceDate)
  const sold: SoldResponse = { items: computeSoldRecords(rows, area.name, 20) }

  return { summary, trends, sold }
})
