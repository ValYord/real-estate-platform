import type { TocHeading } from './types'

/**
 * Extracts a table of contents from an article body's H2/H3 tags.
 *
 * The body HTML is authored server-side (seed/migration in this MVP; the
 * Page 24 CMS editor later) and always includes a stable `id` attribute on
 * each heading (see the seed data in supabase/migrations/0011_blog.sql), so
 * this is a plain regex scan rather than a full HTML parse — there is no
 * untrusted input involved.
 */
export function extractHeadings(html: string): TocHeading[] {
  const headings: TocHeading[] = []
  const re = /<h([23])(?:\s+[^>]*?id="([^"]*)")?[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null

  while ((match = re.exec(html)) !== null) {
    const level = Number(match[1]) as 2 | 3
    const text = stripTags(match[3]).trim()
    if (!text) continue
    const id = match[2] && match[2].length > 0 ? match[2] : slugify(text)
    headings.push({ id, text, level })
  }

  return headings
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, '')
}

/** Slugify a heading's text into a URL-safe anchor id (fallback when the HTML has no `id`). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
