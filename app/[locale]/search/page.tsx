import type { Metadata } from 'next'
import { parseSearchParams } from '@/lib/search/filtersSchema'
import { getMockPropertiesResponse } from '@/lib/search/mockData'
import { SearchPageClient } from '@/components/search/SearchPageClient'

type SearchPageParams = Promise<{ locale: string }>
type SearchPageSearchParams = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: SearchPageParams
  searchParams: SearchPageSearchParams
}): Promise<Metadata> {
  const [, sp] = await Promise.all([params, searchParams])
  const entries = Object.entries(sp)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  const urlParams = new URLSearchParams(entries)
  const city = urlParams.get('city') ?? ''
  const deal = urlParams.get('deal') === 'rent' ? 'rent' : 'sale'

  return {
    title: city
      ? `Properties for ${deal} in ${city} | RE Platform`
      : `Properties for ${deal} | RE Platform`,
    description: `Find the best properties for ${deal}${city ? ` in ${city}` : ''} on RE Platform.`,
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchPageSearchParams
}) {
  const sp = await searchParams
  const entries = Object.entries(sp)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([k, v]): [string, string] => [k, String(v)])
  const urlParams = new URLSearchParams(entries)

  // Parse & validate filters (zod defaults apply)
  let filters
  try {
    filters = parseSearchParams(urlParams)
  } catch {
    filters = { deal: 'sale' as const, sort: 'newest' as const, page: 1 }
  }

  // SSR: fetch initial data
  let initialData
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const filtersParams = new URLSearchParams()
      if (filters.deal) filtersParams.set('deal', filters.deal)
      if (filters.city) filtersParams.set('city', filters.city)
      if (filters.district) filtersParams.set('district', filters.district)
      if (filters.priceMin) filtersParams.set('price_min', String(filters.priceMin))
      if (filters.priceMax) filtersParams.set('price_max', String(filters.priceMax))
      if (filters.beds) filtersParams.set('beds', String(filters.beds))
      if (filters.baths) filtersParams.set('baths', String(filters.baths))
      if (filters.areaMin) filtersParams.set('area_min', String(filters.areaMin))
      if (filters.sort) filtersParams.set('sort', filters.sort)
      if (filters.page) filtersParams.set('page', String(filters.page))
      if (filters.bounds) filtersParams.set('bounds', filters.bounds)

      const res = await fetch(`${baseUrl}/api/properties?${filtersParams.toString()}`, {
        next: { revalidate: 60 },
      })
      if (res.ok) {
        initialData = await res.json()
      }
    } catch {
      // Fall through
    }
  }

  if (!initialData) {
    initialData = getMockPropertiesResponse(filters)
  }

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemList',
        name: `Properties for ${filters.deal}${filters.city ? ` in ${filters.city}` : ''}`,
        numberOfItems: initialData.total,
        itemListElement: initialData.items.slice(0, 10).map((item: { title: Record<string, string>; id: string; slug: string }, i: number) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.title['en'] ?? item.title['hy'] ?? 'Property',
          url: `/property/${item.id}/${item.slug}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
          { '@type': 'ListItem', position: 2, name: filters.city ?? 'Search', item: '/search' },
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
      <main className="flex flex-col min-h-screen">
        <SearchPageClient
          initialData={initialData}
          initialFilters={filters}
        />
      </main>
    </>
  )
}
