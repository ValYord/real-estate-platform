import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { safeLocale } from '@/lib/locale'
import { Link } from '@/i18n/navigation'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import ReadingProgress from '@/components/news/ReadingProgress'
import ShareRail from '@/components/news/ShareRail'
import ArticleBody from '@/components/news/ArticleBody'
import TableOfContents from '@/components/news/TableOfContents'
import AuthorBio from '@/components/news/AuthorBio'
import NewsletterBanner from '@/components/news/NewsletterBanner'
import RelatedArticles from '@/components/news/RelatedArticles'
import { extractHeadings } from '@/lib/blog/toc'
import { formatArticleDate } from '@/lib/blog/format'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog/types'
import { getMockArticle, getMockRelated } from '@/lib/blog/mockData'
import type { BlogPostDetail, BlogPostCard } from '@/lib/blog/types'

type PageParams = { locale: string; slug: string }

const BRAND = 'RE Platform'
const SITE_URL = 'https://example.com'

async function fetchArticle(slug: string, locale: string): Promise<BlogPostDetail | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/news/${encodeURIComponent(slug)}?lang=${locale}`, { cache: 'no-store' })
    if (res.status === 404) return null
    if (!res.ok) return null
    return (await res.json()) as BlogPostDetail
  } catch {
    return getMockArticle(slug)
  }
}

async function fetchRelated(slug: string, locale: string): Promise<BlogPostCard[]> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/news/${encodeURIComponent(slug)}/related?lang=${locale}`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const body = (await res.json()) as { items: BlogPostCard[] }
      return body.items
    }
  } catch {
    // Fall through to mock data
  }
  const article = getMockArticle(slug)
  return article ? getMockRelated(article.category, slug) : []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params
  const locale = safeLocale(rawLocale)
  const article = await fetchArticle(slug, locale)

  if (!article) {
    return { title: `Article not found | ${BRAND}` }
  }

  const description = article.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155)
  const canonical = `/${locale}/news/${article.slug}`
  const languages: Record<string, string> = {}
  for (const l of article.availableLocales) {
    languages[l] = `/${l}/news/${article.slug}`
  }

  return {
    title: `${article.title} | ${BRAND} News`,
    description,
    alternates: { canonical, languages },
    openGraph: {
      type: 'article',
      title: article.title,
      description,
      images: article.cover ? [{ url: article.cover }] : [],
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
    },
  }
}

export default async function NewsArticlePage({ params }: { params: Promise<PageParams> }) {
  const { locale: rawLocale, slug } = await params
  const locale = safeLocale(rawLocale)
  const article = await fetchArticle(slug, locale)
  if (!article) notFound()

  const related = await fetchRelated(slug, locale)
  const headings = extractHeadings(article.body)
  const url = `${SITE_URL}/${locale}/news/${article.slug}`

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'News', href: '/news' },
    { label: BLOG_CATEGORY_LABELS[article.category], href: `/news/category/${article.category}` },
    { label: article.title },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        headline: article.title,
        image: article.cover ? [article.cover] : [],
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        author: {
          '@type': 'Person',
          name: article.author.name,
        },
        publisher: {
          '@type': 'Organization',
          name: BRAND,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}/logo.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': url,
        },
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReadingProgress />

      <main className="max-w-7xl mx-auto px-4 pb-16">
        <Breadcrumbs items={breadcrumbs} className="py-3" />

        <div className="lg:grid lg:grid-cols-[56px_minmax(0,720px)_240px] lg:gap-8 lg:justify-center">
          {/* Share rail — desktop sticky left */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <ShareRail url={url} title={article.title} />
            </div>
          </aside>

          {/* Article */}
          <article className="min-w-0">
            <span className="inline-block bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
              <Link href={`/news/category/${article.category}`} className="hover:underline">
                {BLOG_CATEGORY_LABELS[article.category]}
              </Link>
            </span>

            <h1 className="mt-3 text-2xl md:text-4xl font-bold leading-tight text-gray-900">{article.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>{article.author.name}</span>
              <span aria-hidden="true">·</span>
              <span>{formatArticleDate(article.publishedAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{article.readingTime} min read</span>
              {article.updatedAt !== article.publishedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Updated {formatArticleDate(article.updatedAt)}</span>
                </>
              )}
            </div>

            {article.availableLocales.length > 0 && !article.availableLocales.includes(locale) && (
              <p className="mt-2 inline-block bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                Available in {article.availableLocales.join(', ').toUpperCase()} only
              </p>
            )}

            {article.cover && (
              // eslint-disable-next-line @next/next/no-img-element -- cover image sourced from arbitrary remote hosts (seed content); LCP handled via a plain <img> here rather than extending next/image remotePatterns for demo data.
              <img
                src={article.cover}
                alt={article.title}
                className="mt-5 w-full h-[220px] md:h-[420px] object-cover rounded-xl"
              />
            )}

            {/* Mobile/tablet: accordion TOC before the body */}
            <div className="mt-6 lg:hidden">
              <TableOfContents headings={headings} />
            </div>

            <div className="mt-6">
              <ArticleBody html={article.body} />
            </div>

            {/* Mobile/tablet: share row after the body */}
            <div className="mt-6 lg:hidden">
              <ShareRail url={url} title={article.title} />
            </div>

            <AuthorBio author={article.author} />

            <NewsletterBanner source="article" />

            <RelatedArticles posts={related} />
          </article>

          {/* TOC — desktop sticky right */}
          <aside className="hidden lg:block">
            <TableOfContents headings={headings} />
          </aside>
        </div>
      </main>
    </>
  )
}
