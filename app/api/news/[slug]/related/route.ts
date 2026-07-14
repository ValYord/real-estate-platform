import { NextRequest, NextResponse } from 'next/server'
import { blogSlugSchema } from '@/lib/blog/schemas'
import { getMockArticle, getMockRelated } from '@/lib/blog/mockData'
import type { BlogCategory, BlogPostCard } from '@/lib/blog/types'
import { safeLocale } from '@/lib/locale'

const RELATED_LIMIT = 4

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

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return Boolean(url && key && !url.includes('your-project-id') && !url.includes('placeholder'))
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

/**
 * GET /api/news/[slug]/related?lang= — "Read also" cards, same category,
 * most recent first, excluding the current article. Max 4 (docs/en/pages/15-blog.md §5).
 *
 * 200 { items: BlogPostCard[] }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug: rawSlug } = await params
  const parsedSlug = blogSlugSchema.safeParse(rawSlug)
  if (!parsedSlug.success) {
    return NextResponse.json({ items: [] })
  }
  const slug = parsedSlug.data
  const lang = safeLocale(request.nextUrl.searchParams.get('lang'))

  if (isSupabaseConfigured()) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      const { data: current } = await admin.from('blog_posts').select('category').eq('slug', slug).single()
      const category = (current as { category: BlogCategory } | null)?.category

      if (category) {
        const { data, error } = await admin
          .from('blog_posts')
          .select('id, slug, title, excerpt, cover_image, category, author_name, author_avatar, published_at, reading_time')
          .eq('category', category)
          .neq('slug', slug)
          .not('published_at', 'is', null)
          .lte('published_at', new Date().toISOString())
          .order('published_at', { ascending: false })
          .limit(RELATED_LIMIT)

        if (!error && data) {
          const items = (data as unknown as BlogPostRow[]).map((row) => toCard(row, lang))
          return NextResponse.json({ items })
        }
      }
    } catch {
      // Fall through to mock data
    }
  }

  const mockArticle = getMockArticle(slug)
  if (!mockArticle) {
    return NextResponse.json({ items: [] })
  }
  return NextResponse.json({ items: getMockRelated(mockArticle.category, slug, RELATED_LIMIT) })
}
