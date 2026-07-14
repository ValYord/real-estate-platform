'use client'

import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

export interface TabOption {
  value: string
  label: string
}

interface TabsProps {
  options: TabOption[]
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}

/**
 * Accessible horizontal tab list (roving tabindex), used for the FAQ
 * category filter. Hand-rolled to match the project's convention of plain
 * ARIA-correct components (see components/ui/Accordion.tsx).
 */
export default function Tabs({ options, value, onChange, label, className }: TabsProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const focusTab = (index: number) => {
    const option = options[index]
    if (!option) return
    tabRefs.current.get(option.value)?.focus()
    onChange(option.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        focusTab((index + 1) % options.length)
        break
      case 'ArrowLeft':
        event.preventDefault()
        focusTab((index - 1 + options.length) % options.length)
        break
      case 'Home':
        event.preventDefault()
        focusTab(0)
        break
      case 'End':
        event.preventDefault()
        focusTab(options.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex gap-2 overflow-x-auto -mx-1 px-1', className)}
    >
      {options.map((option, index) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              if (el) tabRefs.current.set(option.value, el)
              else tabRefs.current.delete(option.value)
            }}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'flex-shrink-0 whitespace-nowrap rounded-full px-4 h-9 text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isActive
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
