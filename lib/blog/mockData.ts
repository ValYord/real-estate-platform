import { computeReadingTime } from './readingTime'
import type { BlogPostCard, BlogPostDetail, NewsListResponse } from './types'
import type { BlogCategoryInput } from './schemas'

/**
 * Offline fallback data — used when Supabase isn't configured (local dev
 * without a project linked, or CI), same "mock fallback" convention as
 * lib/search/mockData.ts / lib/property/mockData.ts. Mirrors the published
 * sample rows seeded by supabase/migrations/0011_blog.sql (the draft post
 * from that seed is intentionally NOT mirrored here — mock data should only
 * ever represent what the public RLS-scoped API can return).
 */
interface MockPost extends BlogPostDetail {
  isFeatured: boolean
}

const now = () => new Date()
const daysAgo = (n: number) => new Date(now().getTime() - n * 24 * 60 * 60 * 1000).toISOString()

const MOCK_POSTS: MockPost[] = [
  {
    id: '9c1f0d2a-0001-4a11-8b0a-000000000001',
    slug: 'yerevan-market-trends-2026',
    title: 'Yerevan market trends in 2026',
    body:
      '<h2 id="overview">Overview</h2><p>The Yerevan residential market has stabilized after two years of rapid growth. Average price per square meter in Arabkir and Kentron held steady quarter over quarter.</p>' +
      '<h2 id="whats-driving-it">What is driving it</h2><p>Lower mortgage rates and a steady supply of new developments are keeping the market balanced. <a href="/search?district=Arabkir">See active listings in Arabkir</a> to explore current inventory.</p>' +
      '<h3 id="buyer-takeaway">Buyer takeaway</h3><p>Buyers now have more time to compare options before committing.</p>',
    cover: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=630&fit=crop',
    category: 'market',
    author: {
      name: 'Lilit Harutyunyan',
      avatar: null,
      bio: "Lilit covers the Yerevan residential market and writes the platform's quarterly trend reports.",
      credentials: 'Senior Market Analyst',
    },
    publishedAt: daysAgo(2),
    updatedAt: daysAgo(2),
    readingTime: 6,
    availableLocales: ['en'],
    isFeatured: true,
  },
  {
    id: '9c1f0d2a-0001-4a11-8b0a-000000000002',
    slug: 'first-time-buyer-checklist',
    title: 'First-time buyer checklist',
    body:
      '<h2 id="before-you-start">Before you start</h2><p>Get pre-approved for financing and set a realistic budget before you begin touring properties.</p>' +
      '<h2 id="during-the-viewing">During the viewing</h2><p>Inspect plumbing, wiring and building common areas. Ask about heating costs.</p>' +
      '<h2 id="making-an-offer">Making an offer</h2><p>Compare recent sales in the district before negotiating.</p>',
    cover: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=630&fit=crop',
    category: 'buying',
    author: {
      name: 'Davit Sargsyan',
      avatar: null,
      bio: 'Davit has helped hundreds of first-time buyers navigate the Armenian property market.',
      credentials: 'Buyer Relations Lead',
    },
    publishedAt: daysAgo(5),
    updatedAt: daysAgo(5),
    readingTime: 5,
    availableLocales: ['en'],
    isFeatured: false,
  },
  {
    id: '9c1f0d2a-0001-4a11-8b0a-000000000003',
    slug: 'staging-your-home-to-sell-fast',
    title: 'Staging your home to sell fast',
    body:
      '<h2 id="declutter">Declutter first</h2><p>Remove personal items and excess furniture so rooms feel larger.</p>' +
      '<h2 id="light-and-paint">Light and paint</h2><p>Fresh neutral paint and good lighting are the highest-return improvements before listing.</p>',
    cover: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=630&fit=crop',
    category: 'selling',
    author: {
      name: 'Anahit Petrosyan',
      avatar: null,
      bio: 'Anahit is a staging consultant who partners with sellers across Yerevan.',
      credentials: 'Staging Consultant',
    },
    publishedAt: daysAgo(9),
    updatedAt: daysAgo(9),
    readingTime: 4,
    availableLocales: ['en'],
    isFeatured: false,
  },
  {
    id: '9c1f0d2a-0001-4a11-8b0a-000000000004',
    slug: 'renting-vs-buying-in-2026',
    title: 'Renting vs. buying in 2026',
    body:
      '<h2 id="the-math">The math</h2><p>Compare your expected time in the city against the break-even point for buying closing costs.</p>' +
      '<h2 id="flexibility">Flexibility</h2><p>Renting keeps you flexible if your job or family situation may change soon.</p>',
    cover: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&h=630&fit=crop',
    category: 'renting',
    author: {
      name: 'Vahe Grigoryan',
      avatar: null,
      bio: 'Vahe writes about housing affordability and tenant rights.',
      credentials: 'Housing Policy Writer',
    },
    publishedAt: daysAgo(12),
    updatedAt: daysAgo(12),
    readingTime: 5,
    availableLocales: ['en'],
    isFeatured: false,
  },
  {
    id: '9c1f0d2a-0001-4a11-8b0a-000000000005',
    slug: 'understanding-mortgage-rates',
    title: 'Understanding mortgage rates',
    body:
      '<h2 id="fixed-vs-variable">Fixed vs. variable</h2><p>Fixed rates offer predictability; variable rates can start lower but change over time.</p>' +
      '<h2 id="what-lenders-check">What lenders check</h2><p>Income stability, down payment size, and existing debt all affect your offered rate.</p>',
    cover: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=630&fit=crop',
    category: 'financing',
    author: {
      name: 'Nare Avetisyan',
      avatar: null,
      bio: 'Nare is a financial writer focused on residential lending in Armenia.',
      credentials: 'Mortgage Finance Writer',
    },
    publishedAt: daysAgo(15),
    updatedAt: daysAgo(15),
    readingTime: 4,
    availableLocales: ['en'],
    isFeatured: false,
  },
  {
    id: '9c1f0d2a-0001-4a11-8b0a-000000000006',
    slug: 'platform-adds-armenian-map-search',
    title: 'Platform adds map-based search',
    body:
      '<h2 id="whats-new">What is new</h2><p>Search results now render as pins on an interactive map alongside the list view.</p>',
    cover: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=630&fit=crop',
    category: 'news',
    author: {
      name: 'RE Platform Team',
      avatar: null,
      bio: 'Product updates from the RE Platform team.',
      credentials: null,
    },
    publishedAt: daysAgo(20),
    updatedAt: daysAgo(20),
    readingTime: 2,
    availableLocales: ['en'],
    isFeatured: false,
  },
]

function toCard(post: MockPost): BlogPostCard {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: stripToExcerpt(post.body),
    cover: post.cover,
    category: post.category,
    author: { name: post.author.name, avatar: post.author.avatar },
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
  }
}

function stripToExcerpt(html: string): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > 160 ? `${text.slice(0, 157)}...` : text
}

const PAGE_SIZE = 6

export interface MockNewsFilters {
  category?: BlogCategoryInput
  search?: string
  page?: number
}

export function getMockNewsResponse(filters: MockNewsFilters): NewsListResponse {
  let filtered = MOCK_POSTS
  if (filters.category) {
    filtered = filtered.filter((p) => p.category === filters.category)
  }
  if (filters.search) {
    const q = filters.search.toLowerCase()
    filtered = filtered.filter(
      (p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q),
    )
  }

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(Math.max(1, filters.page ?? 1), totalPages)
  const items = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(toCard)

  return { items, page, pageSize: PAGE_SIZE, totalPages, total }
}

export function getMockFeaturedPost(): BlogPostCard | null {
  const featured = MOCK_POSTS.find((p) => p.isFeatured) ?? MOCK_POSTS[0]
  return featured ? toCard(featured) : null
}

export function getMockArticle(slug: string): BlogPostDetail | null {
  const post = MOCK_POSTS.find((p) => p.slug === slug)
  if (!post) return null
  // Recompute reading time from the body to keep mock data self-consistent
  // with the real computeReadingTime() path used by the live API route.
  return { ...post, readingTime: computeReadingTime(post.body) }
}

export function getMockRelated(
  category: BlogCategoryInput,
  excludeSlug: string,
  limit = 4,
): BlogPostCard[] {
  return MOCK_POSTS.filter((p) => p.category === category && p.slug !== excludeSlug)
    .slice(0, limit)
    .map(toCard)
}
