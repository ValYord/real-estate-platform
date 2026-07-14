import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS, type BlogCategory } from '@/lib/blog/types'

interface CategoryChipsProps {
  /** `null` means "All" (the unfiltered /news index). */
  active: BlogCategory | null
}

/**
 * Category filter chips. Pure `<Link>` navigation to `/news` ("All") or
 * `/news/category/[category]` — a real, crawlable URL per click, not a
 * client-side state toggle (docs/en/pages/15-blog.md §3.3 "important for SEO").
 * No interactivity beyond navigation, so this stays a Server Component.
 */
export default function CategoryChips({ active }: CategoryChipsProps) {
  return (
    <div role="tablist" aria-label="Filter articles by category" className="flex gap-2 flex-wrap overflow-x-auto pb-1">
      <Link
        href="/news"
        role="tab"
        aria-current={active === null ? 'page' : undefined}
        className={cn(
          'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          active === null ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        )}
      >
        All
      </Link>
      {BLOG_CATEGORIES.map((category) => (
        <Link
          key={category}
          href={`/news/category/${category}`}
          role="tab"
          aria-current={active === category ? 'page' : undefined}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            active === category ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          )}
        >
          {BLOG_CATEGORY_LABELS[category]}
        </Link>
      ))}
    </div>
  )
}
