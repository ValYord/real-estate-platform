'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeoSuggestion } from '@/lib/home-value/types'

interface AddressAutocompleteProps {
  onSelect: (geo: GeoSuggestion) => void
  initialLabel?: string
  hasError?: boolean
}

const DEBOUNCE_MS = 300

/**
 * Address autocomplete for the Input phase (docs §3.1). Debounced 300ms →
 * `GET /api/geo/autocomplete?q=`. `role="combobox"` + listbox/option pattern
 * with ↑/↓/Enter/Esc keyboard support (docs §7).
 */
export function AddressAutocomplete({ onSelect, initialLabel, hasError }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialLabel ?? '')
  const [items, setItems] = useState<GeoSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const requestId = useRef(0)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const runSearch = (q: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (q.trim().length < 2) {
      setItems([])
      setIsOpen(false)
      return
    }
    debounceTimer.current = setTimeout(async () => {
      const thisRequest = ++requestId.current
      setIsLoading(true)
      try {
        const res = await fetch(`/api/geo/autocomplete?q=${encodeURIComponent(q)}`)
        if (!res.ok) throw new Error('autocomplete_failed')
        const body = (await res.json()) as { items: GeoSuggestion[] }
        if (thisRequest !== requestId.current) return
        setItems(body.items)
        setIsOpen(body.items.length > 0)
        setActiveIndex(-1)
      } catch {
        if (thisRequest === requestId.current) {
          setItems([])
          setIsOpen(false)
        }
      } finally {
        if (thisRequest === requestId.current) setIsLoading(false)
      }
    }, DEBOUNCE_MS)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setQuery(next)
    runSearch(next)
  }

  const selectItem = (item: GeoSuggestion) => {
    setQuery(item.label)
    setIsOpen(false)
    setItems([])
    onSelect(item)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + items.length) % items.length)
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault()
        selectItem(items[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <MapPin
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="hv-address-listbox"
          aria-activedescendant={activeIndex >= 0 ? `hv-address-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-label="Property address"
          aria-invalid={hasError ? 'true' : 'false'}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => items.length > 0 && setIsOpen(true)}
          placeholder="Enter the address (city, street, building)"
          className={cn(
            'h-14 w-full rounded-xl border pl-11 pr-4 text-lg focus:outline-none focus:ring-2 ring-primary',
            hasError ? 'border-red-400' : 'border-gray-300',
          )}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" aria-hidden="true" />
        )}
      </div>

      {isOpen && (
        <ul
          id="hv-address-listbox"
          role="listbox"
          className="absolute z-40 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-72 overflow-y-auto"
        >
          {items.map((item, index) => (
            <li
              key={`${item.lat}-${item.lng}-${item.label}`}
              id={`hv-address-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault()
                selectItem(item)
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                'px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2',
                index === activeIndex ? 'bg-primary/5 text-primary' : 'text-gray-700',
              )}
            >
              <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
