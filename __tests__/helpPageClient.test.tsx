// @vitest-environment jsdom
/**
 * Render test for the Help Center client widget (search + popular articles,
 * Page 23 §3.7) after the design-system retrofit. Confirms the search/filter
 * behavior is unchanged and that the markup uses semantic design tokens
 * (text-text/text-muted/border-border) instead of raw gray-* utilities.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { ComponentProps } from 'react'
import HelpPageClient from '../components/help/HelpPageClient'

afterEach(cleanup)

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const strings: Record<string, string> = {
      searchLabel: 'Search help articles',
      searchPlaceholder: 'Search…',
      popularHeading: 'Popular articles',
      noResultsHeading: 'Nothing found',
      noResultsBody: 'Try a different search term.',
    }
    return strings[key] ?? key
  },
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// jsdom has no IntersectionObserver; framer-motion's `whileInView` (used by
// the FadeIn wrapper) needs one.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

const ARTICLES = [
  { id: 'a1', title: 'How do I list a property?', category: 'posting-a-listing', href: '/faq#how-to-list' },
  { id: 'a2', title: 'How do I reset my password?', category: 'account-security', href: '/faq#reset-password' },
]

describe('HelpPageClient', () => {
  it('renders every popular article by default', () => {
    render(<HelpPageClient popularArticles={ARTICLES} />)
    expect(screen.getByText('How do I list a property?')).toBeDefined()
    expect(screen.getByText('How do I reset my password?')).toBeDefined()
  })

  it('filters the list as the user types (behavior unchanged by the restyle)', () => {
    render(<HelpPageClient popularArticles={ARTICLES} />)
    const input = screen.getByPlaceholderText('Search…')
    fireEvent.change(input, { target: { value: 'password' } })
    expect(screen.queryByText('How do I list a property?')).toBeNull()
    expect(screen.getByText('How do I reset my password?')).toBeDefined()
  })

  it('shows the empty state when nothing matches', () => {
    render(<HelpPageClient popularArticles={ARTICLES} />)
    const input = screen.getByPlaceholderText('Search…')
    fireEvent.change(input, { target: { value: 'xyzzy-no-match' } })
    expect(screen.getByText('Nothing found')).toBeDefined()
    expect(screen.getByText('Try a different search term.')).toBeDefined()
  })

  it('uses semantic design tokens, not raw gray-* utilities', () => {
    const { container } = render(<HelpPageClient popularArticles={ARTICLES} />)
    const html = container.innerHTML
    expect(html).not.toMatch(/\b(?:text|bg|border|divide)-(?:gray|slate|zinc|stone)-\d+/)

    const heading = screen.getByText('Popular articles')
    expect(heading.className).toContain('text-text')

    const link = screen.getByText('How do I list a property?')
    expect(link.className).toContain('text-text')

    const list = link.closest('ul')
    expect(list?.className).toContain('divide-border')
  })
})
