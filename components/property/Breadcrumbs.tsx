import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

/**
 * Page breadcrumbs — renders the full trail on desktop, collapsed (‹ Back) on mobile.
 * Server component (no interactivity needed).
 */
export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  // Mobile: show only a "back" link to the second-to-last item
  const backItem = items.length >= 2 ? items[items.length - 2] : items[0]

  return (
    <nav aria-label="Breadcrumb" className={cn('py-2', className)}>
      {/* Mobile: single back link */}
      <div className="flex md:hidden items-center">
        {backItem?.href ? (
          <Link
            href={backItem.href}
            className="flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            {backItem.label}
          </Link>
        ) : (
          <span className="flex items-center gap-1 text-sm text-muted">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            {backItem?.label}
          </span>
        )}
      </div>

      {/* Desktop: full trail */}
      <ol
        className="hidden md:flex items-center gap-1 text-sm text-muted flex-wrap"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li
              key={index}
              className="flex items-center gap-1"
              itemScope
              itemType="https://schema.org/ListItem"
              itemProp="itemListElement"
            >
              <meta itemProp="position" content={String(index + 1)} />
              {isLast ? (
                <span
                  className="text-text font-medium"
                  aria-current="page"
                  itemProp="name"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <>
                  <Link
                    href={item.href}
                    className="hover:text-primary hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    itemProp="item"
                  >
                    <span itemProp="name">{item.label}</span>
                  </Link>
                  <ChevronRight
                    className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0"
                    aria-hidden="true"
                  />
                </>
              ) : (
                <>
                  <span itemProp="name">{item.label}</span>
                  <ChevronRight
                    className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0"
                    aria-hidden="true"
                  />
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
