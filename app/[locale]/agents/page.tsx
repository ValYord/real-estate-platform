import type { Metadata } from 'next'
import { parseAgentsSearchParams, agentsQueryToParams } from '@/lib/agent/schemas'
import type { AgentsQueryInput } from '@/lib/agent/schemas'
import { getMockAgentsResponse } from '@/lib/agent/mockData'
import type { AgentsListResponse } from '@/lib/agent/types'
import { AgentsPageClient } from '@/components/agents/AgentsPageClient'
import { safeLocale } from '@/lib/locale'

type AgentsPageParams = Promise<{ locale: string }>
type AgentsPageSearchParams = Promise<Record<string, string | string[] | undefined>>

const BRAND = 'RE Platform'
const DEFAULT_FILTERS: AgentsQueryInput = { sort: 'rating', page: 1 }

/** Parses & validates `searchParams`, falling back to defaults on bad input
 * (the page still renders — /api/agents is the boundary that returns 400). */
function parseFilters(sp: Record<string, string | string[] | undefined>): AgentsQueryInput {
  try {
    return parseAgentsSearchParams(sp)
  } catch {
    return DEFAULT_FILTERS
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: AgentsPageParams
  searchParams: AgentsPageSearchParams
}): Promise<Metadata> {
  const [{ locale: rawLocale }, sp] = await Promise.all([params, searchParams])
  const locale = safeLocale(rawLocale)
  const filters = parseFilters(sp)

  const city = filters.city
  const title = city
    ? `Real estate agents in ${city} — Find and compare | ${BRAND}`
    : `Find a real estate agent | ${BRAND}`
  const description = city
    ? `Find a verified real estate agent in ${city} by specialty, language, and rating.`
    : 'Find a verified real estate agent by city, language, and specialty.'

  const canonical = `/${locale}/agents`
  // Filtered/paginated query strings are noindex (docs/en/pages/11 §8) — only
  // the base /agents landing (and future /agents/[city] SEO landings, out of
  // scope for this task) stays indexable.
  const hasFilters = Boolean(
    filters.city || filters.specialty || filters.lang || filters.minRating !== undefined || filters.page > 1,
  )

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { hy: '/hy/agents', ru: '/ru/agents', en: '/en/agents' },
    },
    robots: hasFilters ? { index: false, follow: true } : undefined,
    openGraph: { title, description },
  }
}

/** SSR fetch through the internal API (Supabase-backed, mock fallback) —
 * mirrors app/[locale]/search/page.tsx. */
async function fetchAgents(filters: AgentsQueryInput): Promise<AgentsListResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const params = agentsQueryToParams(filters)
      const res = await fetch(`${base}/api/agents?${params.toString()}`, {
        next: { revalidate: 60 },
      })
      if (res.ok) return (await res.json()) as AgentsListResponse
    } catch {
      // Fall through to mock data
    }
  }

  return getMockAgentsResponse(filters)
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: AgentsPageSearchParams
}) {
  const sp = await searchParams
  const filters = parseFilters(sp)
  const data = await fetchAgents(filters)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemList',
        name: filters.city ? `Real estate agents in ${filters.city}` : 'Real estate agents',
        numberOfItems: data.total,
        itemListElement: data.items.slice(0, 10).map((agent, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: agent.name,
          url: `https://example.com/agent/${agent.slug}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com/' },
          { '@type': 'ListItem', position: 2, name: 'Find an Agent', item: 'https://example.com/agents' },
        ],
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gray-50 rounded-2xl px-6 py-10 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Find your real estate agent</h1>
          <p className="text-gray-500 mt-2">Verified professionals in Armenia and beyond</p>
        </div>

        <AgentsPageClient initialData={data} initialFilters={filters} />
      </main>
    </>
  )
}
