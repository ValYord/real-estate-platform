'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/locale'

interface PropertyDescriptionProps {
  text: { hy?: string; ru?: string; en?: string }
  locale: Locale
}

const LINE_CLAMP_LINES = 4

/**
 * Collapsible description block — shows max 4 lines, with "Read more" toggle.
 */
export default function PropertyDescription({ text, locale }: PropertyDescriptionProps) {
  const content = text[locale] ?? text.en ?? text.hy ?? text.ru ?? ''
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Temporarily remove clamp to measure natural height
    el.style.webkitLineClamp = 'unset'
    const fullHeight = el.scrollHeight
    el.style.webkitLineClamp = String(LINE_CLAMP_LINES)
    const clampedHeight = el.getBoundingClientRect().height
    setOverflows(fullHeight > clampedHeight + 4)
  }, [content])

  if (!content) return null

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
      <p
        ref={ref}
        className={cn(
          'text-gray-700 leading-relaxed whitespace-pre-line',
          !expanded && 'line-clamp-4',
        )}
        style={
          !expanded
            ? {
                display: '-webkit-box',
                WebkitLineClamp: LINE_CLAMP_LINES,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : undefined
        }
      >
        {content}
      </p>
      {overflows && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="w-4 h-4" aria-hidden="true" />
            </>
          ) : (
            <>
              Read more <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
