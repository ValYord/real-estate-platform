/**
 * Pure, environment-agnostic filtering logic for the FAQ (and Help) search +
 * category tabs, extracted from the client components so it can be unit
 * tested without mounting React / jsdom.
 */

export interface FaqItem {
  id: string
  category: string
  question: string
  answer: string
  linkHref?: string
  linkLabel?: string
}

export const ALL_CATEGORIES = 'all'

/** Case-insensitive substring match against a search corpus. */
function matchesQuery(haystack: string, query: string): boolean {
  return haystack.toLowerCase().includes(query.trim().toLowerCase())
}

/**
 * Filters FAQ items by category (or `ALL_CATEGORIES`) and a free-text query
 * matched against both `question` and `answer`.
 */
export function filterFaqItems(
  items: readonly FaqItem[],
  query: string,
  category: string
): FaqItem[] {
  const trimmedQuery = query.trim()

  return items.filter((item) => {
    if (category !== ALL_CATEGORIES && item.category !== category) return false
    if (!trimmedQuery) return true
    return matchesQuery(item.question, trimmedQuery) || matchesQuery(item.answer, trimmedQuery)
  })
}

export interface SearchableArticle {
  id: string
  title: string
  category: string
  href: string
}

/** Filters Help Center articles by a free-text query matched against the title. */
export function filterArticlesByQuery<T extends SearchableArticle>(
  items: readonly T[],
  query: string
): T[] {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return [...items]
  return items.filter((item) => matchesQuery(item.title, trimmedQuery))
}
