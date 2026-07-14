import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { newsQuerySchema } from '@/lib/blog/schemas'
import { getMockNewsResponse, getMockFeaturedPost } from '@/lib/blog/mockData'
import type { BlogPostCard, NewsListResponse } from '@/lib/blog/types'
import { safeLocale } from '@/lib/locale'

const PAGE_SIZE = 6

interface BlogPostRow {
  id: string
  slug: string
  title: Record<string, string>
  excerpt: Record<string, string>
  cover_image: string | null
  category: BlogPostCard['category']
  author_name: string
  author_avatar: string | null
  published_at: string
  reading_time: number
}

function localize(value: Record<string, string> | null | undefined, lang: string): string {
  if (!value) return ''
  return value[lang] ?? value.en ?? value.hy ?? value.ru ?? Object.values(value)[0] ?? ''
}

function toCard(row: BlogPostRow, lang: string): BlogPostCard {
  return {
    id: row.id,
    slug: row.slug,
    title: localize(row.title, lang),
    excerpt: localize(row.excerpt, lang),
    cover: row.cover_image,
    category: row.category,
    author: { name: row.author_name, avatar: row.author_avatar },
    publishedAt: row.published_at,
    readingTime: row.reading_time,
  }
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return Boolean(url && key && !url.includes('your-project-id') && !url.includes('placeholder'))
}

/**
 * GET /api/news?category=&search=&page=&lang=
 *
 * Index/category listing for Page 15 (docs/en/pages/15-blog.md §5). Reads
 * are scoped to published posts only — the same scope the `blog_posts`
 * public SELECT RLS policy enforces (see supabase/migrations/0011_blog.sql)
 * — using the service-role client purely for read efficiency (consistent
 * with app/api/properties/route.ts), not to bypass any access restriction a
 * public caller wouldn't already have.
 *
 * `featured` is populated only for the unfiltered first page (the index's
 * hero slot) — the most recently published post, unless a post is manually
 * flagged `is_featured`.
 *
 * 200 { items, page, pageSize, totalPages, total, featured? }
 * 422 { error: 'invalid_query' }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  let query: ReturnType<typeof newsQuerySchema.parse>
  try {
    query = newsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_query', fields: err.flatten().fieldErrors }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const lang = safeLocale(query.lang)
  const showFeatured = !query.category && !query.search && query.page === 1

  if (isSupabaseConfigured()) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      let dbQuery = admin
        .from('blog_posts')
        .select('id, slug, title, excerpt, cover_image, category, author_name, author_avatar, published_at, reading_time', {
          count: 'exact',
        })
        .not('published_at', 'is', null)
        .lte('published_at', new Date().toISOString())

      if (query.category) {
        dbQuery = dbQuery.eq('category', query.category)
      }
      if (query.search) {
        const term = query.search.replace(/[%_]/g, '')
        dbQuery = dbQuery.or(`title->>${lang}.ilike.%${term}%,excerpt->>${lang}.ilike.%${term}%`)
      }

      dbQuery = dbQuery
        .order('published_at', { ascending: false })
        .range((query.page - 1) * PAGE_SIZE, query.page * PAGE_SIZE - 1)

      const { data, count, error } = await dbQuery

      if (!error && data) {
        const rows = data as unknown as BlogPostRow[]
        const total = count ?? rows.length
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
        const items = rows.map((row) => toCard(row, lang))

        let featured: BlogPostCard | undefined
        if (showFeatured) {
          const { data: featuredRows } = await admin
            .from('blog_posts')
            .select('id, slug, title, excerpt, cover_image, category, author_name, author_avatar, published_at, reading_time')
            .not('published_at', 'is', null)
            .lte('published_at', new Date().toISOString())
            .order('is_featured', { ascending: false })
            .order('published_at', { ascending: false })
            .limit(1)

          const featuredRow = (featuredRows as unknown as BlogPostRow[] | null)?.[0]
          if (featuredRow) featured = toCard(featuredRow, lang)
        }

        const response: NewsListResponse = {
          items,
          page: query.page,
          pageSize: PAGE_SIZE,
          totalPages,
          total,
          ...(featured ? { featured } : {}),
        }
        return NextResponse.json(response)
      }
    } catch {
      // Fall through to mock data
    }
  }

  const mock = getMockNewsResponse({ category: query.category, search: query.search, page: query.page })
  const featuredMock = showFeatured ? getMockFeaturedPost() : null
  const response: NewsListResponse = {
    ...mock,
    ...(featuredMock ? { featured: featuredMock } : {}),
  }
  return NextResponse.json(response)
}
