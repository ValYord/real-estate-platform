'use client'

import { useState, useRef, useEffect } from 'react'
import { SlidersHorizontal, Bell, ChevronDown, Grid, Map, LayoutTemplate, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Filters } from '@/lib/search/filtersSchema'

export type ViewMode = 'list' | 'map' | 'split'

interface FilterBarProps {
  filters: Filters
  viewMode: ViewMode
  onFiltersChange: (updates: Partial<Filters>) => void
  onViewModeChange: (mode: ViewMode) => void
  onSaveSearch: () => void
}

const DEAL_OPTIONS = [
  { value: 'sale' as const, label: 'Buy' },
  { value: 'rent' as const, label: 'Rent' },
]

const BEDS_OPTIONS = [0, 1, 2, 3, 4, 5]
const SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Newest' },
  { value: 'price_asc' as const, label: 'Price ↑' },
  { value: 'price_desc' as const, label: 'Price ↓' },
  { value: 'area_desc' as const, label: 'Area ↓' },
]

const VIEW_OPTIONS: { value: ViewMode; icon: React.FC<{ className?: string }>; label: string }[] = [
  { value: 'list', icon: Grid, label: 'List' },
  { value: 'map', icon: Map, label: 'Map' },
  { value: 'split', icon: LayoutTemplate, label: 'Both' },
]

// ─── City autocomplete (text input with clear) ────────────────────────────────

interface CityInputProps {
  city?: string
  onChange: (city: string | undefined) => void
}

function CityInput({ city, onChange }: CityInputProps) {
  const [value, setValue] = useState(city ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep local value in sync if parent clears the filter
  useEffect(() => {
    setValue(city ?? '')
  }, [city])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setValue(next)
    if (commitTimer.current) clearTimeout(commitTimer.current)
    commitTimer.current = setTimeout(() => {
      onChange(next.trim() || undefined)
    }, 400)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (commitTimer.current) clearTimeout(commitTimer.current)
      onChange(value.trim() || undefined)
    }
  }

  return (
    <div className="relative flex-shrink-0">
      <MapPin
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="City or district"
        aria-label="Filter by city or district"
        className={cn(
          'border rounded-full h-9 pl-8 pr-3 text-sm w-40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
          value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 text-gray-700',
        )}
      />
    </div>
  )
}

// ─── Price dropdown ────────────────────────────────────────────────────────────

interface PriceDropdownProps {
  priceMin?: number
  priceMax?: number
  onChange: (min: number | undefined, max: number | undefined) => void
  onClose: () => void
}

function PriceDropdown({ priceMin, priceMax, onChange, onClose }: PriceDropdownProps) {
  const [localMin, setLocalMin] = useState(priceMin ? String(priceMin) : '')
  const [localMax, setLocalMax] = useState(priceMax ? String(priceMax) : '')

  const apply = () => {
    onChange(
      localMin ? parseInt(localMin, 10) : undefined,
      localMax ? parseInt(localMax, 10) : undefined,
    )
    onClose()
  }

  return (
    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-40">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Price range (֏)</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label htmlFor="price-min" className="text-xs text-gray-500 mb-1 block">Min</label>
          <input
            id="price-min"
            type="number"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            placeholder="0"
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="price-max" className="text-xs text-gray-500 mb-1 block">Max</label>
          <input
            id="price-max"
            type="number"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            placeholder="Any"
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <button
        onClick={apply}
        className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Apply
      </button>
    </div>
  )
}

export function FilterBar({
  filters,
  viewMode,
  onFiltersChange,
  onViewModeChange,
  onSaveSearch,
}: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const toggleDropdown = (name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name))
  }

  const hasPriceFilter = filters.priceMin !== undefined || filters.priceMax !== undefined

  const priceLabel = (() => {
    if (!hasPriceFilter) return 'Price'
    if (filters.priceMin && filters.priceMax) {
      return `${Math.round(filters.priceMin / 1e6)}–${Math.round(filters.priceMax / 1e6)}M ֏`
    }
    if (filters.priceMax) return `up to ${Math.round(filters.priceMax / 1e6)}M ֏`
    return `from ${Math.round((filters.priceMin ?? 0) / 1e6)}M ֏`
  })()

  const bedsLabel = filters.beds ? `${filters.beds}+ beds` : 'Beds'

  return (
    <div className="sticky top-16 h-14 bg-white border-b border-gray-200 flex items-center gap-2 px-4 z-30 overflow-x-auto">
      {/* Location */}
      <CityInput
        city={filters.city}
        onChange={(city) => onFiltersChange({ city, page: 1 })}
      />

      {/* Deal toggle */}
      <div className="flex border border-gray-300 rounded-full overflow-hidden flex-shrink-0">
        {DEAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFiltersChange({ deal: opt.value, page: 1 })}
            aria-pressed={filters.deal === opt.value}
            className={cn(
              'px-4 h-9 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
              filters.deal === opt.value
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Price dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => toggleDropdown('price')}
          aria-expanded={openDropdown === 'price'}
          className={cn(
            'border rounded-full h-9 px-4 text-sm flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            hasPriceFilter
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-gray-300 text-gray-700 hover:border-gray-400',
          )}
        >
          {priceLabel}
          <ChevronDown
            className={cn('w-3.5 h-3.5 transition-transform', openDropdown === 'price' && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
        {openDropdown === 'price' && (
          <PriceDropdown
            priceMin={filters.priceMin}
            priceMax={filters.priceMax}
            onChange={(min, max) => onFiltersChange({ priceMin: min, priceMax: max, page: 1 })}
            onClose={() => setOpenDropdown(null)}
          />
        )}
      </div>

      {/* Beds */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => toggleDropdown('beds')}
          aria-expanded={openDropdown === 'beds'}
          className={cn(
            'border rounded-full h-9 px-4 text-sm flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            filters.beds
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-gray-300 text-gray-700 hover:border-gray-400',
          )}
        >
          {bedsLabel}
          <ChevronDown
            className={cn('w-3.5 h-3.5 transition-transform', openDropdown === 'beds' && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
        {openDropdown === 'beds' && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-40">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bedrooms</p>
            <div className="flex gap-1.5">
              {BEDS_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    onFiltersChange({ beds: n === 0 ? undefined : n, page: 1 })
                    setOpenDropdown(null)
                  }}
                  className={cn(
                    'w-10 h-9 rounded-lg text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    (filters.beds ?? 0) === n
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-200 text-gray-700 hover:border-primary hover:text-primary',
                  )}
                >
                  {n === 0 ? 'Any' : `${n}+`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* More filters button */}
      <button
        className="border border-gray-300 rounded-full h-9 px-4 text-sm flex items-center gap-1.5 hover:border-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
        aria-label="More filters"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
        More
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sort */}
      <select
        value={filters.sort}
        onChange={(e) => onFiltersChange({ sort: e.target.value as Filters['sort'], page: 1 })}
        className="border border-gray-300 rounded-lg h-9 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary flex-shrink-0"
        aria-label="Sort properties"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* View toggle */}
      <div className="hidden lg:flex border border-gray-300 rounded-lg overflow-hidden flex-shrink-0">
        {VIEW_OPTIONS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => onViewModeChange(value)}
            aria-label={label}
            aria-pressed={viewMode === value}
            className={cn(
              'w-9 h-9 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
              viewMode === value ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
          </button>
        ))}
      </div>

      {/* Save search */}
      <button
        onClick={onSaveSearch}
        className="border border-primary text-primary rounded-full h-9 px-4 text-sm hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0 flex items-center gap-1.5"
      >
        <Bell className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Save search</span>
      </button>
    </div>
  )
}
