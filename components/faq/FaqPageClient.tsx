'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Tabs from '@/components/ui/Tabs'
import Accordion, { type AccordionItemData } from '@/components/ui/Accordion'
import { ALL_CATEGORIES, filterFaqItems, type FaqItem } from '@/lib/faq/filter'

interface FaqPageClientProps {
  items: FaqItem[]
  /** Ordered map of category value → translated label (includes "all"). */
  categories: Record<string, string>
}

/**
 * FAQ search + category tabs + accordion, with deep-link anchor support
 * (`/faq#some-id` auto-expands and scrolls to the matching item).
 * Docs/en/pages/23-static.md §3.3.
 */
export default function FaqPageClient({ items, categories }: FaqPageClientProps) {
  const t = useTranslations('static.faq')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL_CATEGORIES)
  const [openIds, setOpenIds] = useState<string[]>([])
  const didDeepLink = useRef(false)

  const filtered = useMemo(() => filterFaqItems(items, query, category), [items, query, category])

  // Deep-link support: `/faq#how-to-list` auto-expands + scrolls once, on mount.
  useEffect(() => {
    if (didDeepLink.current) return
    didDeepLink.current = true

    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const match = items.find((item) => item.id === hash)
    if (!match) return

    setCategory(ALL_CATEGORIES)
    setOpenIds([hash])

    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [items])

  const categoryOptions = Object.entries(categories).map(([value, label]) => ({ value, label }))

  const accordionItems: AccordionItemData[] = filtered.map((item) => ({
    id: item.id,
    trigger: item.question,
    content: (
      <div>
        <p>{item.answer}</p>
        {item.linkHref && item.linkLabel && (
          <Link href={item.linkHref} className="text-primary underline text-sm mt-2 inline-block">
            {item.linkLabel}
          </Link>
        )}
      </div>
    ),
  }))

  // Single-open mode (docs §3.3: "Default: all closed (single-open mode)").
  const toggle = (id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? [] : [id]))
  }

  return (
    <div className="mt-6">
      {/* Search */}
      <div className="relative">
        <Search
          className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <label htmlFor="faq-search" className="sr-only">
          {t('searchLabel')}
        </label>
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full h-11 pl-9 pr-3 rounded-lg border border-gray-300 focus:border-primary focus:outline-none"
        />
      </div>

      {/* Category tabs */}
      <Tabs
        options={categoryOptions}
        value={category}
        onChange={setCategory}
        label={t('title')}
        className="mt-4"
      />

      {/* Results */}
      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg font-medium text-gray-900">{t('noResultsHeading')}</p>
            <p className="text-sm text-gray-500 mt-1">{t('noResultsBody')}</p>
            <Link
              href="/contact"
              className="mt-4 inline-flex h-11 px-4 items-center rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              {t('ctaContact')}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-2" aria-live="polite">
              {t('resultsCount', { count: filtered.length })}
            </p>
            <Accordion items={accordionItems} openIds={openIds} onToggle={toggle} />
          </>
        )}
      </div>

      {/* CTA */}
      <div className="mt-10 border-t border-gray-200 pt-6 text-center">
        <p className="font-medium text-gray-900">{t('ctaHeading')}</p>
        <div className="mt-3 flex justify-center gap-3">
          <Link
            href="/contact"
            className="h-11 px-4 rounded-lg bg-primary text-white font-medium flex items-center hover:bg-primary/90 transition-colors"
          >
            {t('ctaContact')}
          </Link>
          <Link
            href="/help"
            className="h-11 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium flex items-center hover:bg-gray-50 transition-colors"
          >
            {t('ctaHelp')}
          </Link>
        </div>
      </div>
    </div>
  )
}
