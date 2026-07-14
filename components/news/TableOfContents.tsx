'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { TocHeading } from '@/lib/blog/types'

interface TableOfContentsProps {
  headings: TocHeading[]
}

/**
 * Table of contents — sticky sidebar on desktop, collapsible accordion on
 * mobile, active-section highlight via IntersectionObserver
 * (docs/en/pages/15-blog.md §3.8).
 */
export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-96px 0px -70% 0px' },
    )

    for (const heading of headings) {
      const el = document.getElementById(heading.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  const list = (
    <ul className="space-y-1 text-sm">
      {headings.map((h) => (
        <li key={h.id} className={h.level === 3 ? 'pl-3' : undefined}>
          <a
            href={`#${h.id}`}
            aria-current={activeId === h.id ? 'true' : undefined}
            className={cn(
              'block py-1 pl-3 border-l-2 transition-colors',
              activeId === h.id
                ? 'text-primary font-medium border-primary'
                : 'text-gray-500 border-transparent hover:text-gray-800',
            )}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  )

  return (
    <nav aria-label="Table of contents" className="text-sm">
      {/* Desktop: sticky sidebar */}
      <div className="hidden lg:block sticky top-24">
        <p className="font-semibold text-gray-900 mb-2">Table of contents</p>
        {list}
      </div>

      {/* Mobile/tablet: collapsible accordion */}
      <div className="lg:hidden border border-gray-200 rounded-lg">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between px-4 py-3 font-medium text-gray-900"
        >
          Table of contents
          <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
        {open && <div className="px-4 pb-4">{list}</div>}
      </div>
    </nav>
  )
}
