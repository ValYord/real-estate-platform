'use client'

import { useEffect, useRef } from 'react'
import { X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FavoriteSort } from '@/lib/favorites/types'

interface SortOption {
  value: FavoriteSort
  label: string
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'recent', label: 'Recently added' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'price_drop', label: 'Price drop' },
]

interface SortBottomSheetProps {
  open: boolean
  current: FavoriteSort
  onSelect: (sort: FavoriteSort) => void
  onClose: () => void
}

/**
 * Mobile-only bottom-sheet for the sort selector.
 * Uses ARIA dialog + focus management + Escape to close.
 */
export default function SortBottomSheet({
  open,
  current,
  onSelect,
  onClose,
}: SortBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Trap focus / Escape
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Focus first option when opened
  useEffect(() => {
    if (open) {
      const first = sheetRef.current?.querySelector<HTMLElement>('[role="option"]')
      first?.focus()
    }
  }, [open])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sort favorites"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-base font-semibold text-gray-900">Sort by</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sort options"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <ul role="listbox" aria-label="Sort options" className="py-2">
          {SORT_OPTIONS.map((opt) => {
            const isSelected = opt.value === current
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(opt.value)
                    onClose()
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-5 py-3.5 text-sm',
                    'focus-visible:outline-none focus-visible:bg-gray-50',
                    'hover:bg-gray-50 transition-colors',
                    isSelected ? 'text-primary font-medium' : 'text-gray-700',
                  )}
                >
                  {opt.label}
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary" aria-hidden="true" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        {/* Safe area for mobile home bar */}
        <div className="h-safe-area-inset-bottom" aria-hidden="true" />
      </div>
    </>
  )
}
