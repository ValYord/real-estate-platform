'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROPERTY_TYPES, filtersSchema, type Filters, type PropertyTypeFilter } from '@/lib/search/filtersSchema'

interface EditFiltersModalProps {
  filters: Filters
  onSave: (filters: Filters) => void
  onCancel: () => void
  isSaving?: boolean
}

const TYPE_LABELS: Record<PropertyTypeFilter, string> = {
  apartment: 'Apartment',
  house: 'House',
  land: 'Land',
  commercial: 'Commercial',
  newdev: 'New development',
  garage: 'Garage',
}

/**
 * Edit-filters modal for a saved search — same fields/validation as
 * `/search`'s filter bar, stacked vertically (a modal needs a different
 * layout, not different fields or validation). Lazy-loaded from
 * `SavedSearchCard` via `dynamic(..., { ssr: false })`.
 */
export default function EditFiltersModal({ filters, onSave, onCancel, isSaving = false }: EditFiltersModalProps) {
  const [draft, setDraft] = useState<Filters>(filters)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel()
  }

  const toggleType = (type: PropertyTypeFilter) => {
    setDraft((d) => {
      const current = d.type ?? []
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type]
      return { ...d, type: next.length > 0 ? next : undefined }
    })
  }

  const handleSave = () => {
    const parsed = filtersSchema.safeParse(draft)
    if (!parsed.success) {
      setError('Please check the values above')
      return
    }
    setError(null)
    onSave(parsed.data)
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-filters-modal-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="edit-filters-modal-title" className="text-base font-semibold text-gray-900">
            Edit filters
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Deal */}
          <div>
            <span className="text-xs text-gray-500 mb-1 block">Deal</span>
            <div className="flex border border-gray-300 rounded-full overflow-hidden w-fit">
              {(['sale', 'rent'] as const).map((deal, i) => (
                <button
                  key={deal}
                  type="button"
                  ref={i === 0 ? firstFieldRef : undefined}
                  onClick={() => setDraft((d) => ({ ...d, deal }))}
                  aria-pressed={draft.deal === deal}
                  className={cn(
                    'px-4 h-9 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                    draft.deal === deal ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  {deal === 'sale' ? 'Buy' : 'Rent'}
                </button>
              ))}
            </div>
          </div>

          {/* Property type */}
          <div>
            <span className="text-xs text-gray-500 mb-1 block">Property type</span>
            <div className="flex flex-wrap gap-1.5">
              {PROPERTY_TYPES.map((type) => {
                const active = (draft.type ?? []).includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    aria-pressed={active}
                    className={cn(
                      'px-3 h-9 rounded-lg text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      active ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-700 hover:border-primary hover:text-primary',
                    )}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* City / district */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="edit-city" className="text-xs text-gray-500 mb-1 block">City</label>
              <input
                id="edit-city"
                type="text"
                value={draft.city ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value || undefined }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="edit-district" className="text-xs text-gray-500 mb-1 block">District</label>
              <input
                id="edit-district"
                type="text"
                value={draft.district ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, district: e.target.value || undefined }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="edit-price-min" className="text-xs text-gray-500 mb-1 block">Min price (֏)</label>
              <input
                id="edit-price-min"
                type="number"
                min={0}
                value={draft.priceMin ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, priceMin: e.target.value ? Number(e.target.value) : undefined }))
                }
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="edit-price-max" className="text-xs text-gray-500 mb-1 block">Max price (֏)</label>
              <input
                id="edit-price-max"
                type="number"
                min={0}
                value={draft.priceMax ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, priceMax: e.target.value ? Number(e.target.value) : undefined }))
                }
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Beds / baths / area */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="edit-beds" className="text-xs text-gray-500 mb-1 block">Beds</label>
              <input
                id="edit-beds"
                type="number"
                min={0}
                max={10}
                value={draft.beds ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, beds: e.target.value ? Number(e.target.value) : undefined }))
                }
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="edit-baths" className="text-xs text-gray-500 mb-1 block">Baths</label>
              <input
                id="edit-baths"
                type="number"
                min={0}
                max={10}
                value={draft.baths ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, baths: e.target.value ? Number(e.target.value) : undefined }))
                }
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="edit-area-min" className="text-xs text-gray-500 mb-1 block">Min m²</label>
              <input
                id="edit-area-min"
                type="number"
                min={0}
                value={draft.areaMin ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, areaMin: e.target.value ? Number(e.target.value) : undefined }))
                }
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]',
              isSaving && 'opacity-60 cursor-not-allowed',
            )}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
