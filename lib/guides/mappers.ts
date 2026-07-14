import type { Locale } from '@/lib/locale'
import type { Tables } from '@/types/database'
import type { Guide, GuideCardData, LocalizedBlocks, LocalizedText, LocalizedToc } from './types'
import { pickLocalized } from './content'

type GuideRow = Tables<'guides'>

/**
 * Narrows a raw `guides` row (whose `title`/`excerpt`/`body`/`toc` columns
 * are the generic Supabase `Json` type) into the typed `Guide` shape.
 *
 * Safe to cast without runtime validation: this table has no CMS/user
 * write path in this MVP (see 0011_guides.sql) — every row is written by
 * the trusted seed script / a future service-role-only editor, the same
 * "cast at the read boundary" precedent already used for
 * `home_value_estimates.factors` (app/api/home-value/[hash]/route.ts).
 */
export function rowToGuide(row: GuideRow): Guide {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    status: row.status,
    featured: row.featured,
    title: row.title as LocalizedText,
    excerpt: row.excerpt as LocalizedText,
    body: row.body as LocalizedBlocks,
    toc: (row.toc as LocalizedToc) ?? {},
    coverUrl: row.cover_url,
    authorName: row.author_name,
    authorCredentials: row.author_credentials,
    readingTime: row.reading_time,
    stepCount: row.step_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Builds the pure-props shape a `GuideCard` needs, resolving locale fallback text once. */
export function guideToCardData(guide: Guide, locale: Locale): GuideCardData {
  return {
    slug: guide.slug,
    category: guide.category,
    title: pickLocalized(locale, guide.title) ?? guide.slug,
    excerpt: pickLocalized(locale, guide.excerpt) ?? '',
    coverUrl: guide.coverUrl,
    readingTime: guide.readingTime,
    stepCount: guide.stepCount,
  }
}
