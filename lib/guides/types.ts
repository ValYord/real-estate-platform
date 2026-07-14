import type { Locale } from '@/lib/locale'
import type { GuideCategory } from '@/types/database'

export type { GuideCategory }

/**
 * One block of guide body content. Guides have no Admin CMS in this MVP, so
 * there is no raw/rich-HTML input path — content is authored as this typed
 * block array (seeded directly as JSON), and `GuideBody` maps each block to
 * plain JSX. No `dangerouslySetInnerHTML` anywhere in the guides feature.
 */
export type GuideBlock =
  | { kind: 'heading'; id: string; level: 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'info'; text: string }
  | { kind: 'warning'; text: string }
  | { kind: 'tool_cta'; tool: 'mortgage' | 'home_value' | 'search'; label: string }

/** One entry of a guide's precomputed table of contents. */
export interface GuideTocEntry {
  id: string
  text: string
  level: 2 | 3
}

/** Per-locale text/content maps, as stored in `guides` (not every key present). */
export type LocalizedText = Partial<Record<Locale, string>>
export type LocalizedBlocks = Partial<Record<Locale, GuideBlock[]>>
export type LocalizedToc = Partial<Record<Locale, GuideTocEntry[]>>

/** A full guide row, narrowed from the raw Supabase `Json` columns. */
export interface Guide {
  id: string
  slug: string
  category: GuideCategory
  status: 'draft' | 'published'
  featured: boolean
  title: LocalizedText
  excerpt: LocalizedText
  body: LocalizedBlocks
  toc: LocalizedToc
  coverUrl: string | null
  authorName: string | null
  authorCredentials: string | null
  readingTime: number
  stepCount: number
  createdAt: string
  updatedAt: string
}

/** Lightweight shape used to render a `GuideCard`. */
export interface GuideCardData {
  slug: string
  category: GuideCategory
  title: string
  excerpt: string
  coverUrl: string | null
  readingTime: number
  stepCount: number
}

export const GUIDE_CATEGORIES: GuideCategory[] = ['buyer', 'seller', 'renter', 'finance']

export const GUIDE_CATEGORY_LABELS: Record<GuideCategory, string> = {
  buyer: 'For buyers',
  seller: 'For sellers',
  renter: 'Renter / Landlord',
  finance: 'Mortgage / Finance',
}
