'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export interface TocHeading {
  id: string
  label: string
}

interface LegalTocProps {
  headings: readonly TocHeading[]
  className?: string
}

/**
 * Table of contents for legal pages (Terms / Privacy / Cookies) — sticky on
 * desktop, collapsible `<details>`-like toggle on mobile, with scroll-spy
 * (docs/en/pages/23-static.md §2 desktop layout + §6 responsive + §7 a11y:
 * `<nav aria-label="Table of contents">`, active anchor `aria-current`).
 */
export default function LegalToc({ headings, className }: LegalTocProps) {
  const t = useTranslations('static.common')
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return
        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        )
        setActiveId(topMost.target.id)
      },
      // Treats a heading as "active" once it crosses just below the sticky
      // header, and until it's within the last 70% of the viewport.
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  const list = (
    <ul className="space-y-1">
      {headings.map((h) => {
        const isActive = activeId === h.id
        return (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'block py-1 pl-3 border-l-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded',
                isActive
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-gray-500 hover:text-primary'
              )}
            >
              {h.label}
            </a>
          </li>
        )
      })}
    </ul>
  )

  return (
    <nav aria-label={t('tableOfContents')} className={className}>
      {/* Desktop: sticky */}
      <div className="hidden lg:block sticky top-24">{list}</div>

      {/* Mobile: collapsible */}
      <div className="lg:hidden mb-6">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          className="w-full flex items-center justify-between h-11 px-4 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t('tableOfContents')}
          <ChevronDown
            className={cn('w-4 h-4 transition-transform', mobileOpen && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
        {mobileOpen && (
          <div className="mt-2 p-3 border border-gray-200 rounded-lg">{list}</div>
        )}
      </div>
    </nav>
  )
}
