import type { Metadata } from 'next'
import { safeLocale } from '@/lib/locale'
import NewsListingPage from '@/components/news/NewsListingPage'
import type { NewsListResponse } from '@/lib/blog/types'
import { getMockNewsResponse, getMockFeaturedPost } from '@/lib/blog/mockData'

type PageParams = { locale: string }
type PageSearchParams = { search?: string; page?: string }

const BRAND = 'RE Platform'

async function fetchNews(locale: string, searchParams: PageSearchParams): Promise<NewsListResponse> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const qs = new URLSearchParams({ lang: locale })
  if (searchParams.search) qs.set('search', searchParams.search)
  if (searchParams.page) qs.set('page', searchParams.page)

  try {
    const res = await fetch(`${base}/api/news?${qs.toString()}`, { next: { revalidate: 60 } })
    if (res.ok) return (await res.json()) as NewsListResponse
  } catch {
    // Fall through to mock data
  }

  const page = Number(searchParams.page) || 1
  const mock = getMockNewsResponse({ search: searchParams.search, page })
  const isUnfiltered = !searchParams.search && page === 1
  return { ...mock, ...(isUnfiltered ? { featured: getMockFeaturedPost() ?? undefined } : {}) }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const canonical = `/${locale}/news`

  return {
    title: `Real estate news and insights | ${BRAND}`,
    description: 'Market trends, buyer and seller tips, financing guides and product news.',
    alternates: {
      canonical,
      languages: { hy: '/hy/news', ru: '/ru/news', en: '/en/news' },
    },
  }
}

export default async function NewsIndexPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams: Promise<PageSearchParams>
}) {
  const [{ locale: rawLocale }, sp] = await Promise.all([params, searchParams])
  const locale = safeLocale(rawLocale)
  const data = await fetchNews(locale, sp)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        name: 'News & Insights',
        url: `https://example.com/${locale}/news`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com/' },
          { '@type': 'ListItem', position: 2, name: 'News', item: `https://example.com/${locale}/news` },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <NewsListingPage locale={locale} activeCategory={null} searchQuery={sp.search} data={data} />
    </>
  )
}
