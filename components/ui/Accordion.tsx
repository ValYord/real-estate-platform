'use client'

import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AccordionItemData {
  id: string
  trigger: ReactNode
  content: ReactNode
}

interface AccordionProps {
  items: AccordionItemData[]
  /** IDs of currently expanded items. */
  openIds: readonly string[]
  onToggle: (id: string) => void
  className?: string
}

/**
 * Accessible, hand-rolled accordion (no external dependency — the project
 * doesn't use Radix/shadcn elsewhere; see components/layout/Footer.tsx for
 * the same "plain, ARIA-correct" convention).
 *
 * - `role="button"` semantics come for free from `<button>`.
 * - `aria-expanded` / `aria-controls` / `aria-labelledby` wire trigger ↔ panel.
 * - ↑/↓ move focus between triggers; Home/End jump to first/last.
 * - Enter/Space toggle — native `<button>` behavior, no extra handling needed.
 */
export default function Accordion({ items, openIds, onToggle, className }: AccordionProps) {
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const focusTrigger = (index: number) => {
    const item = items[index]
    if (!item) return
    triggerRefs.current.get(item.id)?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusTrigger((index + 1) % items.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusTrigger((index - 1 + items.length) % items.length)
        break
      case 'Home':
        event.preventDefault()
        focusTrigger(0)
        break
      case 'End':
        event.preventDefault()
        focusTrigger(items.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div className={cn('divide-y divide-gray-200', className)}>
      {items.map((item, index) => {
        const isOpen = openIds.includes(item.id)
        const triggerId = `accordion-trigger-${item.id}`
        const panelId = `accordion-panel-${item.id}`

        return (
          <div key={item.id} id={item.id} className="scroll-mt-24">
            <h3 className="m-0">
              <button
                ref={(el) => {
                  if (el) triggerRefs.current.set(item.id, el)
                  else triggerRefs.current.delete(item.id)
                }}
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => onToggle(item.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className="w-full flex items-center justify-between gap-4 py-4 font-medium text-left text-gray-900 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                <span>{item.trigger}</span>
                {isOpen ? (
                  <Minus className="w-4 h-4 flex-shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <Plus className="w-4 h-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
                )}
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="pb-4 text-gray-600 leading-relaxed"
            >
              {item.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
