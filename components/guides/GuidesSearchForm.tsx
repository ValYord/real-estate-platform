import { Search } from 'lucide-react'

interface GuidesSearchFormProps {
  defaultValue?: string
}

/**
 * Server-driven search: a plain `<form method="get">`, not a client
 * component. No JS is required for the core search-and-reload behavior —
 * submitting navigates to `/guides?search=...`, which is fully shareable
 * and crawlable (progressive enhancement over a client-side re-fetch).
 */
export function GuidesSearchForm({ defaultValue }: GuidesSearchFormProps) {
  return (
    <form method="get" action="" className="flex gap-2 mt-4 max-w-xl">
      <div className="relative flex-1">
        <label htmlFor="guides-search" className="sr-only">
          Search guides
        </label>
        <Search
          className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="guides-search"
          type="search"
          name="search"
          defaultValue={defaultValue}
          placeholder="Search guides…"
          className="h-11 w-full border border-gray-300 rounded-lg pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button
        type="submit"
        className="h-11 px-5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Search
      </button>
    </form>
  )
}
