import { Link } from '@/i18n/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  /** Base path (without the page query param), e.g. "/news" or "/news/category/market". */
  basePath: string
  /** Other query params to preserve across page links, e.g. { search: 'yerevan' }. */
  query?: Record<string, string | undefined>
}

function hrefFor(basePath: string, query: Record<string, string | undefined> | undefined, page: number): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value)
  }
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

/**
 * Real `?page=N` links (SSR) — not infinite scroll — so pagination stays
 * crawlable/shareable (docs/en/pages/15-blog.md §3.6).
 */
export default function Pagination({ page, totalPages, basePath, query }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 py-8">
      <Link
        href={hrefFor(basePath, query, Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        aria-label="Previous page"
        rel="prev"
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-md text-sm',
          page <= 1 ? 'pointer-events-none text-gray-300' : 'text-gray-600 hover:bg-gray-100',
        )}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </Link>

      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(basePath, query, p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-md text-sm font-medium',
            p === page ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100',
          )}
        >
          {p}
        </Link>
      ))}

      <Link
        href={hrefFor(basePath, query, Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        aria-label="Next page"
        rel="next"
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-md text-sm',
          page >= totalPages ? 'pointer-events-none text-gray-300' : 'text-gray-600 hover:bg-gray-100',
        )}
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </nav>
  )
}
