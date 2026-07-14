'use client'

import { useQuery } from '@tanstack/react-query'
import { Users, Home, AlertTriangle, LayoutDashboard } from 'lucide-react'
import StatCard from './StatCard'
import type { DashboardStats as DashboardStatsData } from '@/lib/admin/types'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 h-24">
      <div className="bg-gray-100 animate-pulse rounded-lg h-6 w-12 mb-2" />
      <div className="bg-gray-100 animate-pulse rounded h-4 w-20" />
    </div>
  )
}

export default function DashboardStats({ initialStats }: { initialStats: DashboardStatsData }) {
  const { data, isLoading, isError, refetch } = useQuery<DashboardStatsData>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json() as Promise<DashboardStatsData>
    },
    initialData: initialStats,
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-gray-200 p-4 text-center">
        <p className="text-sm text-gray-500 mb-2">Failed to load</p>
        <button
          onClick={() => refetch()}
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Retry
        </button>
      </div>
    )
  }

  const isEmpty = data.users === 0 && data.listings.total === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center px-6 py-16">
        <span className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded-full">
          <LayoutDashboard className="w-8 h-8 text-gray-300" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <p className="text-base font-medium text-gray-900">No data yet</p>
          <p className="text-sm text-gray-500">We&apos;re waiting for the first users and listings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard icon={Users} label="Users" value={data.users.toLocaleString()} index={0} />
      <StatCard
        icon={Home}
        label="Listings"
        value={data.listings.total.toLocaleString()}
        sub={`Active ${data.listings.active.toLocaleString()} · Pending ${data.listings.pending.toLocaleString()} · Sold ${data.listings.sold.toLocaleString()} · Archived ${data.listings.archived.toLocaleString()}`}
        index={1}
      />
      <StatCard
        icon={AlertTriangle}
        label="Attention"
        value={data.attention.toLocaleString()}
        index={2}
        warning={data.attention > 0}
        href={data.attention > 0 ? '/admin/moderation' : undefined}
      />
    </div>
  )
}
