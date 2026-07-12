'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter, Link } from '@/i18n/navigation'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { FilterBar } from './FilterBar'
import type { ViewMode } from './FilterBar'
import { ListingsPanel } from './ListingsPanel'
import { SearchMap } from './SearchMap'
import { ResultsHeader } from './ResultsHeader'
import SaveSearchModal from './SaveSearchModal'
import SignInPromptModal from './SignInPromptModal'
import type { Filters } from '@/lib/search/filtersSchema'
import { filtersToParams } from '@/lib/search/filtersSchema'
import type { PropertiesResponse } from '@/lib/search/types'
import { hasSessionCookie } from '@/lib/auth/hasSessionCookie'
import { Map, List, X } from 'lucide-react'
import { cn } from '@/lib/utils'

async function fetchProperties(filters: Filters): Promise<PropertiesResponse> {
  const params = filtersToParams(filters)
  const res = await fetch(`/api/properties?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch properties')
  return res.json() as Promise<PropertiesResponse>
}

interface SearchPageClientProps {
  initialData: PropertiesResponse
  initialFilters: Filters
}

export function SearchPageClient({
  initialData,
  initialFilters,
}: SearchPageClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [saveSearchModalOpen, setSaveSearchModalOpen] = useState(false)
  const [signInPromptOpen, setSignInPromptOpen] = useState(false)
  const [saveSearchToast, setSaveSearchToast] = useState<'saved' | 'duplicate' | null>(null)

  // Shared data query — ResultsHeader, SearchMap, and ListingsPanel all read from here
  const queryKey = ['properties', filtersToParams(filters).toString()]

  const { data, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchProperties(filters),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })

  const pushFilters = useCallback(
    (next: Filters) => {
      const params = filtersToParams(next)
      startTransition(() => {
        router.push(`/search?${params.toString()}`, { scroll: false })
      })
    },
    [router],
  )

  const handleFiltersChange = useCallback(
    (updates: Partial<Filters>) => {
      const next = { ...filters, ...updates }
      setFilters(next)
      pushFilters(next)
    },
    [filters, pushFilters],
  )

  const handleClearFilters = useCallback(() => {
    const next: Filters = { deal: 'sale', sort: 'newest', page: 1 }
    setFilters(next)
    pushFilters(next)
  }, [pushFilters])

  const handleRemoveFilter = useCallback(
    (key: keyof Filters) => {
      const next = { ...filters }
      delete next[key]
      next.page = 1
      setFilters(next)
      pushFilters(next)
    },
    [filters, pushFilters],
  )

  const handlePageChange = useCallback(
    (page: number) => {
      const next = { ...filters, page }
      setFilters(next)
      pushFilters(next)
    },
    [filters, pushFilters],
  )

  const handleBoundsChange = useCallback(
    (bounds: string) => {
      const next = { ...filters, bounds, page: 1 }
      setFilters(next)
      pushFilters(next)
    },
    [filters, pushFilters],
  )

  const handleSaveSearch = useCallback(() => {
    if (hasSessionCookie()) {
      setSaveSearchModalOpen(true)
    } else {
      setSignInPromptOpen(true)
    }
  }, [])

  const showList = viewMode === 'list' || viewMode === 'split'
  const showMap = viewMode === 'map' || viewMode === 'split'

  return (
    <>
      <FilterBar
        filters={filters}
        viewMode={viewMode}
        onFiltersChange={handleFiltersChange}
        onViewModeChange={setViewMode}
        onSaveSearch={handleSaveSearch}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Listings column — rendered only when showList is true (viewMode ∈ {list, split}) */}
        {showList && (
          <div
            className={cn(
              'overflow-y-auto',
              viewMode === 'split' ? 'w-full lg:w-[58%]' : 'w-full',
            )}
          >
            <ResultsHeader
              total={data.total}
              filters={filters}
              isLoading={isFetching}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearFilters}
            />
            <ListingsPanel
              data={data}
              isFetching={isFetching}
              filters={filters}
              hoveredId={hoveredId}
              onCardHover={setHoveredId}
              onPageChange={handlePageChange}
              onClearFilters={handleClearFilters}
            />
          </div>
        )}

        {/* Map column:
            - split: hidden on mobile, 42% on desktop
            - map-only: full width on all breakpoints           */}
        {showMap && (
          <div
            className={cn(
              viewMode === 'split'
                ? 'hidden lg:block lg:w-[42%]'
                : 'block w-full',
            )}
          >
            <SearchMap
              pins={data.mapPins}
              hoveredPinId={hoveredId}
              onPinHover={setHoveredId}
              onBoundsChange={handleBoundsChange}
              className="sticky top-[120px] h-[calc(100vh-120px)]"
            />
          </div>
        )}
      </div>

      {/* Mobile floating toggle — list ↔ map */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden">
        <button
          onClick={() => setViewMode((v) => (v === 'map' ? 'list' : 'map'))}
          className="bg-gray-900 text-white rounded-full px-5 h-11 flex items-center gap-2 shadow-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={viewMode === 'map' ? 'Switch to list view' : 'Switch to map view'}
        >
          {viewMode === 'map' ? (
            <>
              <List className="w-4 h-4" aria-hidden="true" />
              List
            </>
          ) : (
            <>
              <Map className="w-4 h-4" aria-hidden="true" />
              Map
            </>
          )}
        </button>
      </div>

      {/* Save-search touch point — the one new piece of UI on this page */}
      {saveSearchModalOpen && (
        <SaveSearchModal
          filters={filters}
          onClose={() => setSaveSearchModalOpen(false)}
          onSaved={() => {
            setSaveSearchModalOpen(false)
            setSaveSearchToast('saved')
          }}
          onDuplicate={() => {
            setSaveSearchModalOpen(false)
            setSaveSearchToast('duplicate')
          }}
        />
      )}

      {signInPromptOpen && (
        <SignInPromptModal
          redirectTo={`/search?${filtersToParams(filters).toString()}`}
          onClose={() => setSignInPromptOpen(false)}
        />
      )}

      {saveSearchToast && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm w-full mx-4 bg-gray-900 text-white"
        >
          <span className="flex-1">
            {saveSearchToast === 'duplicate' ? 'This search is already saved' : 'Search saved'}
          </span>
          {saveSearchToast === 'saved' && (
            <Link
              href="/saved-searches"
              className="text-xs font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded shrink-0"
            >
              View saved searches
            </Link>
          )}
          <button
            type="button"
            onClick={() => setSaveSearchToast(null)}
            aria-label="Dismiss notification"
            className="shrink-0 text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  )
}
