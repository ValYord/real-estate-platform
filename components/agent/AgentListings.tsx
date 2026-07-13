'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Home as HomeIcon } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { PropertyCard } from '@/components/search/PropertyCard'
import type { AgentListingsDeal, AgentListingsResponse, AgentListingsSort } from '@/lib/agent/types'

interface AgentListingsProps {
  agentId: string
}

const TABS: { value: AgentListingsDeal; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sale', label: 'For sale' },
  { value: 'rent', label: 'For rent' },
]

const SORT_OPTIONS: { value: AgentListingsSort; label: string }[] = [
  { value: 'new', label: 'Newest' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
]

async function fetchListings(
  agentId: string,
  deal: AgentListingsDeal,
  sort: AgentListingsSort,
): Promise<AgentListingsResponse> {
  const params = new URLSearchParams({ deal, sort, page: '1' })
  const res = await fetch(`/api/agents/${agentId}/listings?${params.toString()}`)
  if (!res.ok) throw new Error(`Listings fetch failed: ${res.status}`)
  return res.json() as Promise<AgentListingsResponse>
}

/**
 * Active listings grid — tabs [All]/[For sale]/[For rent] + sort, client-side
 * fetch via GET /api/agents/[id]/listings. Reuses <PropertyCard> from search.
 * docs/en/pages/10-agent-profile.md §3.5.
 */
export default function AgentListings({ agentId }: AgentListingsProps) {
  const [deal, setDeal] = useState<AgentListingsDeal>('all')
  const [sort, setSort] = useState<AgentListingsSort>('new')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agent-listings', agentId, deal, sort],
    queryFn: () => fetchListings(agentId, deal, sort),
  })

  return (
    <section id="listings" className="border-t border-gray-200 pt-6 mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Active listings</h2>

      {/* Tabs + sort */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-4 border-b border-gray-200 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setDeal(tab.value)}
              className={cn(
                'pb-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t',
                deal === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as AgentListingsSort)}
          aria-label="Sort listings"
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-64" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-500 text-center py-8">Failed to load listings.</p>
      )}

      {data && data.items.length === 0 && (
        <div className="flex flex-col items-center text-center py-10 text-gray-400">
          <HomeIcon className="w-10 h-10 mb-3" aria-hidden="true" />
          <p className="text-sm">No active listings at the moment</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.items.map((item) => (
              <PropertyCard key={item.id} property={item} />
            ))}
          </div>

          {data.total > data.items.length && (
            <div className="text-center mt-5">
              <Link
                href={`/search?agent=${agentId}`}
                className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                See all {data.total} listings
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  )
}
