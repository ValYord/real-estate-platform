'use client'

import { useEffect, useRef, useState } from 'react'
import type { GuideTocEntry } from '@/lib/guides/types'

interface GuideTocProps {
  entries: GuideTocEntry[]
}

/**
 * Table of contents — the interactive part of the guide page (doc §3.8).
 * Desktop: sticky sidebar with IntersectionObserver scroll-spy highlighting.
 * Mobile: collapsible `<details>` accordion (no scroll-spy, keeps it simple).
 *
 * No login-gated read-progress checkmarks in this MVP (see
 * docs/design/16-guides-handoff.md D4) — this component's only job is
 * scroll-spy / accordion UI.
 */
export function GuideToc({ entries }: GuideTocProps) {
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (entries.length === 0) return

    const headingElements = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null)

    if (headingElements.length === 0) return

    const observer = new IntersectionObserver(
      (visibleEntries) => {
        const visible = visibleEntries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          // Prefer the entry closest to the top of the viewport
          const topMost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
          )
          setActiveId(topMost.target.id)
        }
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    )
    observerRef.current = observer

    headingElements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [entries])

  if (entries.length === 0) return null

  const list = (
    <ul className="space-y-0.5">
      {entries.map((entry) => {
        const isActive = entry.id === activeId
        return (
          <li key={entry.id} className={entry.level === 3 ? 'pl-3' : ''}>
            <a
              href={`#${entry.id}`}
              aria-current={isActive ? 'true' : undefined}
              className={
                isActive
                  ? 'block text-sm text-primary font-medium py-1.5 pl-3 border-l-2 border-primary transition-colors'
                  : 'block text-sm text-gray-600 hover:text-primary py-1.5 pl-3 border-l-2 border-transparent transition-colors'
              }
            >
              {entry.text}
            </a>
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <nav
        aria-label="Table of contents"
        className="hidden lg:block sticky top-24 w-56 flex-shrink-0"
      >
        {list}
      </nav>

      {/* Mobile: collapsible accordion */}
      <details className="lg:hidden border border-gray-200 rounded-lg p-3 mt-4">
        <summary className="text-sm font-medium text-primary cursor-pointer select-none">
          Table of contents
        </summary>
        <nav aria-label="Table of contents" className="mt-2">
          {list}
        </nav>
      </details>
    </>
  )
}
