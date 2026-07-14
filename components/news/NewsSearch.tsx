import { Search } from 'lucide-react'

interface NewsSearchProps {
  locale: string
  defaultQuery?: string
}

/**
 * Article search box. A plain `<form method="get">` — submitting it is a
 * full navigation to `/[locale]/news?search=...`, so results stay SSR'd and
 * shareable without any client-side JavaScript (docs/en/pages/15-blog.md
 * §3.4: "Enter/submit → /news?search=[q] (SSR full-text search)").
 */
export default function NewsSearch({ locale, defaultQuery }: NewsSearchProps) {
  return (
    <form action={`/${locale}/news`} method="get" role="search" className="relative w-full sm:w-72">
      <label htmlFor="news-search" className="sr-only">
        Search articles
      </label>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        aria-hidden="true"
      />
      <input
        id="news-search"
        type="search"
        name="search"
        defaultValue={defaultQuery}
        placeholder="Search articles…"
        maxLength={100}
        className="h-11 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
    </form>
  )
}
