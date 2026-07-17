'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '@/components/ui/Button'
import UnitCard from './UnitCard'
import AddUnitDialog from './AddUnitDialog'
import UnitDetailPanel from './UnitDetailPanel'
import type { RentalUnitsResponse, RentalUnitSummary } from '@/lib/landlord/types'

const UNITS_KEY = ['landlord-rental-units']

async function fetchUnits(): Promise<RentalUnitsResponse> {
  const res = await fetch('/api/landlord/rentals')
  if (!res.ok) throw new Error('Failed to fetch rental units')
  return res.json() as Promise<RentalUnitsResponse>
}

/**
 * `/landlord/rentals` client dashboard (§3.2): units grid + `[+ Add unit]`
 * + unit detail. Hydrated with `initialUnits` from the server component so
 * the first paint has data, then react-query owns subsequent fetches/cache
 * updates (same pattern as components/admin/ModerationQueue.tsx).
 */
export default function RentalsDashboard({ initialUnits }: { initialUnits: RentalUnitSummary[] }) {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery<RentalUnitsResponse>({
    queryKey: UNITS_KEY,
    queryFn: fetchUnits,
    initialData: { units: initialUnits },
  })

  const units = data?.units ?? []
  const selectedUnit = units.find((u) => u.id === selectedId) ?? null

  const handleCreated = (unit: RentalUnitSummary) => {
    queryClient.setQueryData<RentalUnitsResponse>(UNITS_KEY, (old) => ({
      units: [unit, ...(old?.units ?? [])],
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-text">Your rental units</h2>
        <Button onClick={() => setAddOpen(true)}>+ Add unit</Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-neutral-100 animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className="text-center py-8">
          <p className="text-sm text-muted mb-2">Something went wrong loading your units.</p>
          <button
            onClick={() => refetch()}
            className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && units.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 text-center px-6 py-16 rounded-lg border border-border bg-surface">
          <p className="text-base font-medium text-text">You don&apos;t have any units yet</p>
          <p className="text-sm text-muted">Add your first rental unit to start tracking it here.</p>
          <Button onClick={() => setAddOpen(true)}>+ Add unit</Button>
        </div>
      )}

      {!isLoading && !isError && units.length > 0 && (
        <div
          role="list"
          aria-label="Rental units"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {units.map((unit) => (
            <div role="listitem" key={unit.id}>
              <UnitCard unit={unit} onOpen={() => setSelectedId(unit.id)} />
            </div>
          ))}
        </div>
      )}

      <AddUnitDialog open={addOpen} onOpenChange={setAddOpen} onCreated={handleCreated} />

      {selectedUnit && <UnitDetailPanel unit={selectedUnit} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
