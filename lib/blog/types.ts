import type { BlogCategory } from '@/types/database'

export type { BlogCategory }

/** Internal category values, in display order (docs/en/pages/15-blog.md §3.3). */
export const BLOG_CATEGORIES: BlogCategory[] = [
  'buying',
  'selling',
  'renting',
  'financing',
  'market',
  'news',
]

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  buying: 'Buying',
  selling: 'Selling',
  renting: 'Rent',
  financing: 'Financing',
  market: 'Market trends',
  news: 'News',
}

export interface BlogAuthor {
  name: string
  avatar: string | null
  bio: string | null
  credentials: string | null
}

/** Card shape used by the index grid, featured hero and related-articles list. */
export interface BlogPostCard {
  id: string
  slug: string
  title: string
  excerpt: string
  cover: string | null
  category: BlogCategory
  author: Pick<BlogAuthor, 'name' | 'avatar'>
  publishedAt: string
  readingTime: number
}

/** Full article shape used by the article page. */
export interface BlogPostDetail {
  id: string
  slug: string
  title: string
  body: string
  cover: string | null
  category: BlogCategory
  author: BlogAuthor
  publishedAt: string
  updatedAt: string
  readingTime: number
  /** Locales that have a non-empty title/body translation for this post. */
  availableLocales: string[]
}

export interface NewsListResponse {
  items: BlogPostCard[]
  page: number
  pageSize: number
  totalPages: number
  total: number
  /** Only populated for the unfiltered first page (the index hero slot). */
  featured?: BlogPostCard
}

/** A single heading extracted from the article body, for the table of contents. */
export interface TocHeading {
  id: string
  text: string
  level: 2 | 3
}
