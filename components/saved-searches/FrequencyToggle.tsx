'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import type { AlertFrequency } from '@/lib/saved-searches/types'

interface FrequencyToggleProps {
  value: AlertFrequency
  onChange: (next: AlertFrequency) => void
  /** Unique id fragment for aria-labelledby wiring per card. */
  idPrefix: string
}

const OPTIONS: { value: AlertFrequency; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'instant', label: 'Instant' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
]

/**
 * Alert-frequency control for a saved-search card.
 * Desktop (>=768px): segmented control, `role="radiogroup"` with 4
 * `role="radio"` buttons, arrow-key navigation.
 * Mobile (<768px): native `<select>` (matches the doc's "dropdown"
 * requirement).
 *
 * Purely presentational + emits `onChange` — the parent owns the optimistic
 * update / rollback / toast (mirrors `useFavoriteToggle`'s split of
 * responsibility).
 */
export default function FrequencyToggle({ value, onChange, idPrefix }: FrequencyToggleProps) {
  const groupRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const delta = e.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (index + delta + OPTIONS.length) % OPTIONS.length
    const nextOption = OPTIONS[nextIndex]
    onChange(nextOption.value)
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    buttons?.[nextIndex]?.focus()
  }

  return (
    <>
      {/* Desktop segmented control */}
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label="Alert frequency"
        className="hidden md:inline-flex rounded-lg border border-gray-200 p-0.5"
      >
        {OPTIONS.map((opt, index) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'text-xs px-3 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Mobile dropdown */}
      <select
        id={`${idPrefix}-frequency-select`}
        aria-label="Alert frequency"
        value={value}
        onChange={(e) => onChange(e.target.value as AlertFrequency)}
        className="md:hidden border border-gray-200 rounded-lg h-9 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </>
  )
}
