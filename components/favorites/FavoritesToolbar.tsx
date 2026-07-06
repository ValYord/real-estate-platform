'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Scale, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import SortBottomSheet from './SortBottomSheet'
import type { FavoriteSort } from '@/lib/favorites/types'

const SORT_OPTIONS: { value: FavoriteSort; label: string }[] = [
  { value: 'recent', label: 'Recently added' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'price_drop', label: 'Price drop' },
]

interface FavoritesToolbarProps {
  currentSort: FavoriteSort
}

/**
 * Toolbar for the Favorites page.
 *
 * - Sort dropdown (desktop): URL-driven, aria-listbox, ✓ next to selected option.
 * - Sort button (mobile <768px): opens SortBottomSheet.
 * - [⚖ Compare] — Phase 2, disabled/grayed.
 * - [🔔 Saved searches] — cross-link to /saved-searches.
 */
export default function FavoritesToolbar({ currentSort }: FavoritesToolbarProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? 'Sort'

  // Close desktop dropdown on outside click
  useEffect(() => {
    const onOutsideClick = (e: MouseEvent) => {
      if (
        dropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [dropdownOpen])

  const handleSortSelect = (sort: FavoriteSort) => {
    setDropdownOpen(false)
    const params = new URLSearchParams()
    if (sort !== 'recent') params.set('sort', sort)
    const qs = params.toString()
    router.replace((qs ? `/favorites?${qs}` : '/favorites') as Parameters<typeof router.replace>[0])
  }

  return (
    <div className="flex items-center justify-between h-14 gap-3 flex-wrap">
      {/* Left: Sort controls */}
      <div className="flex items-center gap-2">
        {/* Desktop dropdown */}
        <div ref={dropdownRef} className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            aria-label={`Sort by: ${currentLabel}`}
            className={cn(
              'flex items-center gap-2 border border-gray-200 rounded-lg h-10 px-3 text-sm bg-white',
              'hover:border-gray-300 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              dropdownOpen && 'border-primary ring-1 ring-primary',
            )}
          >
            <span className="text-gray-700">{currentLabel}</span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform duration-150',
                dropdownOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>

          {/* Dropdown panel */}
          {dropdownOpen && (
            <ul
              role="listbox"
              aria-label="Sort options"
              className="absolute top-12 left-0 z-30 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => {
                const isSelected = opt.value === currentSort
                return (
                  <li key={opt.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => handleSortSelect(opt.value)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 text-sm text-left',
                        'hover:bg-gray-50 transition-colors',
                        'focus-visible:outline-none focus-visible:bg-gray-50',
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
          )}
        </div>

        {/* Mobile sort button */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-label={`Sort by: ${currentLabel}`}
          className={cn(
            'flex md:hidden items-center gap-2 border border-gray-200 rounded-lg h-10 px-3 text-sm bg-white',
            'hover:border-gray-300 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <span className="text-gray-700">{currentLabel}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
        </button>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {/* Compare — Phase 2, disabled */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Compare selected (coming soon)"
          className="flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm text-gray-300 border border-gray-100 cursor-not-allowed select-none"
        >
          <Scale className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Compare</span>
        </button>

        {/* Saved searches cross-link */}
        <Link
          href="/saved-searches"
          className={cn(
            'flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm border border-gray-200',
            'text-gray-700 hover:bg-gray-50 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <Bell className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Saved searches</span>
        </Link>
      </div>

      {/* Mobile bottom-sheet */}
      <SortBottomSheet
        open={sheetOpen}
        current={currentSort}
        onSelect={handleSortSelect}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  )
}
