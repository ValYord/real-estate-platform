'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import Stagger from '@/components/motion/Stagger'
import ApplicationDetailPanel from './ApplicationDetailPanel'
import { formatDate } from '@/lib/landlord/format'
import type { ApplicationsResponse, LandlordUnitOption, TenantApplicationSummary } from '@/lib/landlord/types'
import type { TenantApplicationStatus } from '@/types/database'

const STATUS_LABEL: Record<TenantApplicationStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_VARIANT: Record<TenantApplicationStatus, 'primary' | 'warning' | 'success' | 'neutral'> = {
  new: 'primary',
  reviewing: 'warning',
  approved: 'success',
  rejected: 'neutral',
}

const APPLICATIONS_KEY = ['landlord-applications']

async function fetchApplications(): Promise<ApplicationsResponse> {
  const res = await fetch('/api/landlord/applications')
  if (!res.ok) throw new Error('Failed to fetch applications')
  return res.json() as Promise<ApplicationsResponse>
}

/**
 * `/landlord/screening` "Applications inbox" (§3.3: "Received applications
 * by unit: status (New / Reviewing / Approved / Rejected)"). Hydrated with
 * `initialItems` from the server component, same pattern as
 * components/landlord/RentalsDashboard.tsx.
 */
export default function ApplicationsInbox({
  initialItems,
  units,
}: {
  initialItems: TenantApplicationSummary[]
  units: LandlordUnitOption[]
}) {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | TenantApplicationStatus>('all')
  const [unitFilter, setUnitFilter] = useState<'all' | string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery<ApplicationsResponse>({
    queryKey: APPLICATIONS_KEY,
    queryFn: fetchApplications,
    initialData: { items: initialItems },
  })

  const items = useMemo(() => data?.items ?? [], [data])
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (statusFilter === 'all' || item.status === statusFilter) &&
          (unitFilter === 'all' || item.unitId === unitFilter),
      ),
    [items, statusFilter, unitFilter],
  )
  const selected = items.find((item) => item.id === selectedId) ?? null

  const handleUpdated = (updated: TenantApplicationSummary) => {
    queryClient.setQueryData<ApplicationsResponse>(APPLICATIONS_KEY, (old) => ({
      items: (old?.items ?? []).map((item) => (item.id === updated.id ? updated : item)),
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-text">Applications inbox</h2>
        <div className="flex gap-2">
          <Select
            aria-label="Filter by unit"
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">All units</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.address}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-36"
          >
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_LABEL) as TenantApplicationStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-neutral-100 animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className="text-center py-8">
          <p className="text-sm text-muted mb-2">Something went wrong loading applications.</p>
          <button
            onClick={() => refetch()}
            className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 text-center px-6 py-16 rounded-lg border border-border bg-surface">
          <p className="text-base font-medium text-text">No applications yet</p>
          <p className="text-sm text-muted">Create an application link above and share it with a prospective tenant.</p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div role="list" aria-label="Applications" className="rounded-lg border border-border bg-surface overflow-hidden">
          <Stagger gap={0.06}>
            {filtered.map((item) => (
              <div key={item.id} role="listitem" className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">{item.applicantName}</p>
                    <p className="text-xs text-muted truncate">{item.unitAddress} · {formatDate(item.createdAt.slice(0, 10))}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                </button>
              </div>
            ))}
          </Stagger>
        </div>
      )}

      {selected && (
        <ApplicationDetailPanel
          application={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
