'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { filterArticlesByQuery, type SearchableArticle } from '@/lib/faq/filter'
import Input from '@/components/ui/Input'
import FadeIn from '@/components/motion/FadeIn'

interface HelpPageClientProps {
  popularArticles: SearchableArticle[]
}

/**
 * Help Center search box + popular articles list (Page 23 §3.7).
 * Category cards are static and rendered by the server page — only the
 * popular-articles list is client-filtered here.
 */
export default function HelpPageClient({ popularArticles }: HelpPageClientProps) {
  const t = useTranslations('static.help')
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => filterArticlesByQuery(popularArticles, query),
    [popularArticles, query]
  )

  return (
    <FadeIn delay={0.05}>
      <div className="mt-4">
        <div className="relative max-w-xl">
          <Search
            className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <label htmlFor="help-search" className="sr-only">
            {t('searchLabel')}
          </label>
          <Input
            id="help-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-text">{t('popularHeading')}</h2>
          {filtered.length === 0 ? (
            <div className="mt-4 text-center py-8">
              <p className="text-text font-medium">{t('noResultsHeading')}</p>
              <p className="text-sm text-muted mt-1">{t('noResultsBody')}</p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {filtered.map((article) => (
                <li key={article.id}>
                  <Link
                    href={article.href}
                    className="block py-3 text-text hover:text-primary transition-colors"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </FadeIn>
  )
}
