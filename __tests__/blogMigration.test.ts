/**
 * Static check for the Page 15 (Blog / News) Supabase migration
 * (supabase/migrations/0011_blog.sql). Same "no live Supabase in CI"
 * pattern as __tests__/homeValueMigration.test.ts / savedSearchesMigration.test.ts:
 * asserts, by reading the migration SQL itself, that RLS is enabled and
 * scoped correctly.
 *
 * Manual verification checklist (run against a real Supabase project before
 * shipping to production):
 *   1. Using only the anon key (no session), `select * from blog_posts` —
 *      only rows with a past `published_at` should return; the seeded draft
 *      row (published_at IS NULL) must never appear.
 *   2. Using only the anon key, `insert into blog_posts (...) values (...)`
 *      — must be rejected (no INSERT policy exists for anon/authenticated).
 *   3. Using only the anon key, `insert into newsletter_subscribers (email)
 *      values ('a@b.com')` — must succeed.
 *   4. Using only the anon key, `select * from newsletter_subscribers` —
 *      must return 0 rows (no SELECT policy exists for anon/authenticated).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationSql = readFileSync(join(__dirname, '../supabase/migrations/0011_blog.sql'), 'utf-8')

describe('0011_blog.sql — table shape', () => {
  it('creates the blog_posts table', () => {
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS blog_posts/)
  })

  it('creates the newsletter_subscribers table', () => {
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS newsletter_subscribers/)
  })

  it('constrains blog_posts.category to the known enum', () => {
    expect(migrationSql).toMatch(
      /CHECK \(category IN \('buying', 'selling', 'renting', 'financing', 'market', 'news'\)\)/,
    )
  })

  it('constrains newsletter_subscribers.source to the known enum', () => {
    expect(migrationSql).toMatch(/CHECK \(source IN \('news_index', 'article', 'footer'\)\)/)
  })

  it('newsletter_subscribers.email is unique', () => {
    expect(migrationSql).toMatch(/email\s+TEXT\s+NOT NULL UNIQUE/)
  })

  it('blog_posts.published_at is nullable (draft = NULL)', () => {
    expect(migrationSql).toMatch(/published_at\s+TIMESTAMPTZ,/)
  })
})

describe('0011_blog.sql — RLS is enabled on both tables', () => {
  it('enables RLS on blog_posts', () => {
    expect(migrationSql).toMatch(/ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY/)
  })

  it('enables RLS on newsletter_subscribers', () => {
    expect(migrationSql).toMatch(/ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY/)
  })
})

describe('0011_blog.sql — blog_posts policies', () => {
  it('has exactly one policy (public SELECT of published rows only)', () => {
    const blogPoliciesSection = migrationSql.split('CREATE TABLE IF NOT EXISTS newsletter_subscribers')[0]
    const policyCount = (blogPoliciesSection.match(/CREATE POLICY/g) ?? []).length
    expect(policyCount).toBe(1)
  })

  it('the SELECT policy requires published_at to be set and in the past', () => {
    const match = migrationSql.match(
      /CREATE POLICY "blog_posts: public can select published"[\s\S]*?USING \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('published_at IS NOT NULL')
    expect(match?.[1]).toContain('published_at <= NOW()')
  })

  it('has no INSERT/UPDATE/DELETE policy (writes are service-role only)', () => {
    expect(migrationSql).not.toMatch(/ON blog_posts\s+FOR (INSERT|UPDATE|DELETE)/)
  })
})

describe('0011_blog.sql — newsletter_subscribers policies', () => {
  it('has exactly one policy (anon INSERT-only)', () => {
    const newsletterSection = migrationSql.split('CREATE TABLE IF NOT EXISTS newsletter_subscribers')[1] ?? ''
    const policyCount = (newsletterSection.match(/CREATE POLICY/g) ?? []).length
    expect(policyCount).toBe(1)
  })

  it('the INSERT policy allows any caller (anon signup form has no session)', () => {
    const match = migrationSql.match(
      /CREATE POLICY "newsletter_subscribers: anyone can insert"[\s\S]*?WITH CHECK \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1].trim()).toBe('TRUE')
  })

  it('has no SELECT policy (no public read of subscriber emails)', () => {
    expect(migrationSql).not.toMatch(/ON newsletter_subscribers\s+FOR SELECT/)
  })
})

describe('0011_blog.sql — seed data', () => {
  it('seeds at least one published sample post', () => {
    expect(migrationSql).toMatch(/yerevan-market-trends-2026/)
  })

  it('seeds a draft (unpublished) sample post to exercise the RLS policy', () => {
    expect(migrationSql).toMatch(/draft-upcoming-feature/)
  })
})
