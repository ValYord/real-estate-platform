/**
 * Tests for the pure FAQ/Help filtering logic (Page 23 §3.3/§3.7):
 * category tabs + free-text search on /faq, and article search on /help.
 */
import { describe, it, expect } from 'vitest'
import { ALL_CATEGORIES, filterFaqItems, filterArticlesByQuery, type FaqItem } from '../lib/faq/filter'

const ITEMS: FaqItem[] = [
  { id: 'how-to-list', category: 'seller', question: 'How do I list a property?', answer: 'Use the wizard.' },
  { id: 'reset-password', category: 'account', question: 'How do I reset my password?', answer: 'Use the forgot-password link.' },
  { id: 'is-listing-free', category: 'seller', question: 'Is posting a listing free?', answer: 'Yes, it is free.' },
  { id: 'save-a-search', category: 'buyer', question: 'Can I save a search?', answer: 'Yes, click save search.' },
]

describe('filterFaqItems — category filter', () => {
  it('returns all items when category is ALL_CATEGORIES and query is empty', () => {
    expect(filterFaqItems(ITEMS, '', ALL_CATEGORIES)).toHaveLength(ITEMS.length)
  })

  it('returns only items in the given category', () => {
    const result = filterFaqItems(ITEMS, '', 'seller')
    expect(result).toHaveLength(2)
    expect(result.every((item) => item.category === 'seller')).toBe(true)
  })

  it('returns an empty array for a category with no matches', () => {
    expect(filterFaqItems(ITEMS, '', 'pro')).toHaveLength(0)
  })
})

describe('filterFaqItems — free-text search', () => {
  it('matches against the question (case-insensitive)', () => {
    const result = filterFaqItems(ITEMS, 'PASSWORD', ALL_CATEGORIES)
    expect(result.map((item) => item.id)).toEqual(['reset-password'])
  })

  it('matches against the answer, not just the question', () => {
    const result = filterFaqItems(ITEMS, 'wizard', ALL_CATEGORIES)
    expect(result.map((item) => item.id)).toEqual(['how-to-list'])
  })

  it('trims surrounding whitespace before matching', () => {
    const result = filterFaqItems(ITEMS, '  free  ', ALL_CATEGORIES)
    expect(result.map((item) => item.id)).toEqual(['is-listing-free'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterFaqItems(ITEMS, 'xyzzy-no-match', ALL_CATEGORIES)).toHaveLength(0)
  })

  it('combines category and query filters', () => {
    const result = filterFaqItems(ITEMS, 'free', 'seller')
    expect(result.map((item) => item.id)).toEqual(['is-listing-free'])
    expect(filterFaqItems(ITEMS, 'free', 'buyer')).toHaveLength(0)
  })
})

describe('filterArticlesByQuery — Help Center article search', () => {
  const articles = [
    { id: 'a1', title: 'How do I list a property?', category: 'posting-a-listing', href: '/faq#how-to-list' },
    { id: 'a2', title: 'How do I reset my password?', category: 'account-security', href: '/faq#reset-password' },
  ]

  it('returns every article when the query is empty', () => {
    expect(filterArticlesByQuery(articles, '')).toHaveLength(2)
  })

  it('filters by title, case-insensitively', () => {
    const result = filterArticlesByQuery(articles, 'PASSWORD')
    expect(result.map((a) => a.id)).toEqual(['a2'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterArticlesByQuery(articles, 'no-such-topic')).toHaveLength(0)
  })
})
