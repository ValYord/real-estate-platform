import { z } from 'zod'
import { LOCALES } from '@/lib/locale'

/**
 * zod validation for Page 15 — Blog / News & Insights (MVP).
 * Mirrors docs/en/pages/15-blog.md §5 "Validation (zod)".
 */

export const blogCategorySchema = z.enum([
  'buying',
  'selling',
  'renting',
  'financing',
  'market',
  'news',
])

export type BlogCategoryInput = z.infer<typeof blogCategorySchema>

/** `GET /api/news?category=&search=&page=&lang=` query params. */
export const newsQuerySchema = z.object({
  category: blogCategorySchema.optional(),
  // Trimmed + length-capped per spec; the actual DB query uses a
  // parameterized `ilike`, never string-concatenated SQL.
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  lang: z.enum(LOCALES).optional(),
})

export type NewsQueryInput = z.infer<typeof newsQuerySchema>

/** `POST /api/newsletter/subscribe` body. */
export const newsletterSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254),
  source: z.enum(['news_index', 'article', 'footer']).optional().default('news_index'),
  // Honeypot — must stay empty; bots that fill hidden fields are silently discarded.
  website: z.string().max(0, 'Spam detected').optional(),
})

export type NewsletterInput = z.infer<typeof newsletterSchema>

/** Path param validation for `/news/[slug]` and its API routes. */
export const blogSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/, 'Invalid slug')
