/**
 * Unit tests for lib/blog/toc.ts — table-of-contents extraction from an
 * article body (docs/en/pages/15-blog.md §3.8).
 */
import { describe, expect, it } from 'vitest'
import { extractHeadings, slugify } from '@/lib/blog/toc'

describe('extractHeadings', () => {
  it('extracts H2 and H3 headings in document order', () => {
    const html =
      '<h2 id="overview">Overview</h2><p>Text</p><h3 id="details">Details</h3><p>More text</p><h2 id="summary">Summary</h2>'
    const headings = extractHeadings(html)
    expect(headings).toEqual([
      { id: 'overview', text: 'Overview', level: 2 },
      { id: 'details', text: 'Details', level: 3 },
      { id: 'summary', text: 'Summary', level: 2 },
    ])
  })

  it('ignores H1 and H4+ headings', () => {
    const html = '<h1 id="title">Title</h1><h2 id="a">A</h2><h4 id="b">B</h4>'
    const headings = extractHeadings(html)
    expect(headings).toEqual([{ id: 'a', text: 'A', level: 2 }])
  })

  it('strips inline tags from the heading text', () => {
    const html = '<h2 id="a">Hello <em>world</em></h2>'
    expect(extractHeadings(html)[0].text).toBe('Hello world')
  })

  it('falls back to a slugified id when the heading has none', () => {
    const html = '<h2>Buyer Takeaway</h2>'
    expect(extractHeadings(html)[0].id).toBe('buyer-takeaway')
  })

  it('returns an empty array for a body with no headings', () => {
    expect(extractHeadings('<p>Just a paragraph.</p>')).toEqual([])
  })

  it('skips a heading with only whitespace text', () => {
    expect(extractHeadings('<h2 id="empty">   </h2>')).toEqual([])
  })
})

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Buyer Takeaway')).toBe('buyer-takeaway')
  })

  it('strips leading/trailing punctuation', () => {
    expect(slugify('  What is Next?  ')).toBe('what-is-next')
  })
})
