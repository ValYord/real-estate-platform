import Breadcrumbs from '@/components/property/Breadcrumbs'
import CategoryChips from './CategoryChips'
import NewsSearch from './NewsSearch'
import FeaturedHero from './FeaturedHero'
import ArticleGrid from './ArticleGrid'
import Pagination from './Pagination'
import NewsletterBanner from './NewsletterBanner'
import { BLOG_CATEGORY_LABELS, type BlogCategory } from '@/lib/blog/types'
import type { NewsListResponse } from '@/lib/blog/types'

interface NewsListingPageProps {
  locale: string
  /** `null` renders the unfiltered index ("All"). */
  activeCategory: BlogCategory | null
  searchQuery?: string
  data: NewsListResponse
}

/**
 * Shared index/category listing layout — rendered by both
 * app/[locale]/news/page.tsx and app/[locale]/news/category/[category]/page.tsx
 * (docs/en/pages/15-blog.md §2 "Blog Index").
 */
export default function NewsListingPage({ locale, activeCategory, searchQuery, data }: NewsListingPageProps) {
  const title = activeCategory ? BLOG_CATEGORY_LABELS[activeCategory] : 'News & Insights'
  const basePath = activeCategory ? `/news/category/${activeCategory}` : '/news'

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'News', href: activeCategory ? '/news' : undefined },
    ...(activeCategory ? [{ label: BLOG_CATEGORY_LABELS[activeCategory] }] : []),
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 pb-16">
      <Breadcrumbs items={breadcrumbs} className="py-3" />

      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <p className="mt-1 text-base text-gray-500 max-w-2xl">
        Market trends, buyer/seller tips and product news from RE Platform.
      </p>

      {/* Featured hero — index only, unfiltered first page (populated by the API only in that case) */}
      {data.featured && (
        <div className="mt-6">
          <FeaturedHero post={data.featured} />
        </div>
      )}

      <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <CategoryChips active={activeCategory} />
        <NewsSearch locale={locale} defaultQuery={searchQuery} />
      </div>

      <div className="mt-6">
        <ArticleGrid posts={data.items} emptyQuery={searchQuery} />
      </div>

      <NewsletterBanner source="news_index" />

      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        basePath={basePath}
        query={{ search: searchQuery }}
      />
    </main>
  )
}
