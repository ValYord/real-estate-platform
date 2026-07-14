import { NextRequest, NextResponse } from 'next/server'
import { blogSlugSchema } from '@/lib/blog/schemas'
import { getMockArticle } from '@/lib/blog/mockData'
import { computeReadingTime } from '@/lib/blog/readingTime'
import type { BlogPostDetail } from '@/lib/blog/types'
import { safeLocale } from '@/lib/locale'
import { LOCALES } from '@/lib/locale'

interface BlogPostDetailRow {
  id: string
  slug: string
  title: Record<string, string>
  body: Record<string, string>
  cover_image: string | null
  category: BlogPostDetail['category']
  author_name: string
  author_avatar: string | null
  author_bio: string | null
  author_credentials: string | null
  published_at: string
  updated_at: string
  reading_time: number
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return Boolean(url && key && !url.includes('your-project-id') && !url.includes('placeholder'))
}

function localize(value: Record<string, string> | null | undefined, lang: string): string {
  if (!value) return ''
  return value[lang] ?? value.en ?? value.hy ?? value.ru ?? Object.values(value)[0] ?? ''
}

function toDetail(row: BlogPostDetailRow, lang: string): BlogPostDetail {
  const body = localize(row.body, lang)
  return {
    id: row.id,
    slug: row.slug,
    title: localize(row.title, lang),
    body,
    cover: row.cover_image,
    category: row.category,
    author: {
      name: row.author_name,
      avatar: row.author_avatar,
      bio: row.author_bio,
      credentials: row.author_credentials,
    },
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    readingTime: row.reading_time || computeReadingTime(body),
    availableLocales: LOCALES.filter((l) => Boolean(row.title?.[l]) && Boolean(row.body?.[l])),
  }
}

/**
 * GET /api/news/[slug]?lang=
 *
 * Article detail for Page 15 (docs/en/pages/15-blog.md §5). Same
 * published-only scope as GET /api/news (see that route's comment).
 *
 * 200 BlogPostDetail · 404 { error: 'not_found' }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug: rawSlug } = await params
  const parsedSlug = blogSlugSchema.safeParse(rawSlug)
  if (!parsedSlug.success) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  const slug = parsedSlug.data
  const lang = safeLocale(request.nextUrl.searchParams.get('lang'))

  if (isSupabaseConfigured()) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      const { data, error } = await admin
        .from('blog_posts')
        .select(
          'id, slug, title, body, cover_image, category, author_name, author_avatar, author_bio, author_credentials, published_at, updated_at, reading_time',
        )
        .eq('slug', slug)
        .not('published_at', 'is', null)
        .lte('published_at', new Date().toISOString())
        .single()

      if (!error && data) {
        return NextResponse.json(toDetail(data as unknown as BlogPostDetailRow, lang))
      }
      if (error) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
    } catch {
      // Fall through to mock data
    }
  }

  const mock = getMockArticle(slug)
  if (!mock) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json(mock)
}
