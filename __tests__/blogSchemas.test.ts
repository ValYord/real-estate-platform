/**
 * Unit tests for lib/blog/schemas.ts — the server-boundary zod validation
 * for Page 15 (Blog / News), mirroring docs/en/pages/15-blog.md §5.
 */
import { describe, expect, it } from 'vitest'
import { blogCategorySchema, newsQuerySchema, newsletterSchema, blogSlugSchema } from '@/lib/blog/schemas'

describe('blogCategorySchema', () => {
  it('accepts each known category', () => {
    for (const c of ['buying', 'selling', 'renting', 'financing', 'market', 'news']) {
      expect(blogCategorySchema.safeParse(c).success).toBe(true)
    }
  })

  it('rejects an unknown category', () => {
    expect(blogCategorySchema.safeParse('lifestyle').success).toBe(false)
  })
})

describe('newsQuerySchema', () => {
  it('defaults page to 1 when omitted', () => {
    const result = newsQuerySchema.parse({})
    expect(result.page).toBe(1)
  })

  it('coerces a string page to a number', () => {
    const result = newsQuerySchema.parse({ page: '3' })
    expect(result.page).toBe(3)
  })

  it('rejects page 0 and negative pages', () => {
    expect(newsQuerySchema.safeParse({ page: '0' }).success).toBe(false)
    expect(newsQuerySchema.safeParse({ page: '-1' }).success).toBe(false)
  })

  it('trims and caps the search term at 100 chars', () => {
    const result = newsQuerySchema.parse({ search: '  yerevan  ' })
    expect(result.search).toBe('yerevan')
    expect(newsQuerySchema.safeParse({ search: 'x'.repeat(101) }).success).toBe(false)
  })

  it('rejects an invalid category', () => {
    expect(newsQuerySchema.safeParse({ category: 'lifestyle' }).success).toBe(false)
  })

  it('rejects an unsupported lang', () => {
    expect(newsQuerySchema.safeParse({ lang: 'fr' }).success).toBe(false)
  })
})

describe('newsletterSchema', () => {
  it('accepts a valid email with no optional fields', () => {
    const result = newsletterSchema.safeParse({ email: 'reader@example.com' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.source).toBe('news_index')
    }
  })

  it('accepts a valid email with an explicit source', () => {
    const result = newsletterSchema.safeParse({ email: 'reader@example.com', source: 'article' })
    expect(result.success).toBe(true)
  })

  it('rejects a malformed email', () => {
    expect(newsletterSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
    expect(newsletterSchema.safeParse({ email: '' }).success).toBe(false)
    expect(newsletterSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an invalid source enum value', () => {
    expect(newsletterSchema.safeParse({ email: 'a@b.com', source: 'sms' }).success).toBe(false)
  })

  it('rejects a non-empty honeypot field', () => {
    expect(
      newsletterSchema.safeParse({ email: 'a@b.com', website: 'http://spam.example' }).success,
    ).toBe(false)
  })

  it('trims surrounding whitespace from the email', () => {
    const result = newsletterSchema.safeParse({ email: '  reader@example.com  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('reader@example.com')
    }
  })
})

describe('blogSlugSchema', () => {
  it('accepts a lowercase kebab-case slug', () => {
    expect(blogSlugSchema.safeParse('yerevan-market-trends-2026').success).toBe(true)
  })

  it('rejects slugs with spaces, uppercase or special characters', () => {
    expect(blogSlugSchema.safeParse('Not A Slug').success).toBe(false)
    expect(blogSlugSchema.safeParse('slug/../traversal').success).toBe(false)
    expect(blogSlugSchema.safeParse('<script>').success).toBe(false)
  })
})
