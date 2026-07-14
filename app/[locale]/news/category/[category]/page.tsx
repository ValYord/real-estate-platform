import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { safeLocale } from '@/lib/locale'
import { blogCategorySchema } from '@/lib/blog/schemas'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog/types'
import NewsListingPage from '@/components/news/NewsListingPage'
import type { NewsListResponse } from '@/lib/blog/types'
import { getMockNewsResponse } from '@/lib/blog/mockData'
import type { BlogCategoryInput } from '@/lib/blog/schemas'

type PageParams = { locale: string; category: string }
type PageSearchParams = { search?: string; page?: string }

const BRAND = 'RE Platform'

async function fetchNews(
  locale: string,
  category: BlogCategoryInput,
  searchParams: PageSearchParams,
): Promise<NewsListResponse> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const qs = new URLSearchParams({ lang: locale, category })
  if (searchParams.search) qs.set('search', searchParams.search)
  if (searchParams.page) qs.set('page', searchParams.page)

  try {
    const res = await fetch(`${base}/api/news?${qs.toString()}`, { next: { revalidate: 60 } })
    if (res.ok) return (await res.json()) as NewsListResponse
  } catch {
    // Fall through to mock data
  }

  const page = Number(searchParams.page) || 1
  return getMockNewsResponse({ category, search: searchParams.search, page })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale, category: rawCategory } = await params
  const locale = safeLocale(rawLocale)
  const parsed = blogCategorySchema.safeParse(rawCategory)
  if (!parsed.success) {
    return { title: `Category not found | ${BRAND}` }
  }

  const label = BLOG_CATEGORY_LABELS[parsed.data]
  const canonical = `/${locale}/news/category/${parsed.data}`

  return {
    title: `${label} news and insights | ${BRAND}`,
    description: `Articles about ${label.toLowerCase()} from RE Platform.`,
    alternates: {
      canonical,
      languages: {
        hy: `/hy/news/category/${parsed.data}`,
        ru: `/ru/news/category/${parsed.data}`,
        en: `/en/news/category/${parsed.data}`,
      },
    },
  }
}

export default async function NewsCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>
  searchParams: Promise<PageSearchParams>
}) {
  const [{ locale: rawLocale, category: rawCategory }, sp] = await Promise.all([params, searchParams])
  const locale = safeLocale(rawLocale)
  const parsed = blogCategorySchema.safeParse(rawCategory)
  if (!parsed.success) notFound()

  const category = parsed.data
  const data = await fetchNews(locale, category, sp)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com/' },
          { '@type': 'ListItem', position: 2, name: 'News', item: `https://example.com/${locale}/news` },
          {
            '@type': 'ListItem',
            position: 3,
            name: BLOG_CATEGORY_LABELS[category],
            item: `https://example.com/${locale}/news/category/${category}`,
          },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <NewsListingPage locale={locale} activeCategory={category} searchQuery={sp.search} data={data} />
    </>
  )
}
