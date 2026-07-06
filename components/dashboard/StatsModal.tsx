'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Eye, Heart, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ListingStatsResponse, StatsRange, DailyViewPoint } from '@/lib/dashboard/types'

interface StatsModalProps {
  listingId: string
  listingTitle: string
  onClose: () => void
}

const RANGE_OPTIONS: { label: string; value: StatsRange }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
]

function LineChart({ data, height = 120 }: { data: DailyViewPoint[]; height?: number }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        Not enough data
      </div>
    )
  }

  const maxViews = Math.max(...data.map((d) => d.views), 1)
  const width = 400
  const paddingX = 8
  const paddingY = 12
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartWidth
    const y = paddingY + (1 - d.views / maxViews) * chartHeight
    return `${x},${y}`
  })

  const polylinePoints = points.join(' ')

  // Area fill path
  const firstX = paddingX
  const lastX = paddingX + chartWidth
  const bottomY = paddingY + chartHeight
  const areaPath = `M ${firstX} ${bottomY} L ${points[0]} L ${points.join(' L ')} L ${lastX} ${bottomY} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      aria-label="Views over time chart"
      role="img"
    >
      {/* Area fill */}
      <path
        d={areaPath.replace('L ', ' ')}
        fill="currentColor"
        className="text-primary/10"
      />
      {/* Line */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
      {/* Y-axis label: max value */}
      <text x={paddingX} y={paddingY - 2} fontSize="9" fill="#9CA3AF" textAnchor="start">
        {maxViews}
      </text>
      {/* Y-axis label: 0 */}
      <text x={paddingX} y={bottomY + 10} fontSize="9" fill="#9CA3AF" textAnchor="start">
        0
      </text>
    </svg>
  )
}

export default function StatsModal({ listingId, listingTitle, onClose }: StatsModalProps) {
  const [range, setRange] = useState<StatsRange>('30d')

  const { data, isLoading, isError } = useQuery<ListingStatsResponse>({
    queryKey: ['listing-stats', listingId, range],
    queryFn: async () => {
      const res = await fetch(`/api/listings/${listingId}/stats?range=${range}`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json() as Promise<ListingStatsResponse>
    },
  })

  // Close on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-modal-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 id="stats-modal-title" className="text-base font-semibold text-gray-900">
              Statistics
            </h2>
            <p className="text-sm text-gray-500 truncate max-w-xs">{listingTitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close statistics"
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Range selector */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors font-medium',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  range === opt.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="px-6 pt-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">Views</p>
          {isLoading && (
            <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />
          )}
          {isError && (
            <div className="h-32 flex items-center justify-center text-sm text-gray-400">
              Failed to load chart data
            </div>
          )}
          {data && !isLoading && (
            <LineChart data={data.viewsSeries} height={120} />
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-t border-gray-100 mt-2">
          {[
            { icon: Eye, label: 'Total views', value: data?.viewsSeries.reduce((s, d) => s + d.views, 0) ?? 0 },
            { icon: Heart, label: 'Favorites', value: data?.favorites ?? 0 },
            { icon: MessageSquare, label: 'Messages', value: data?.messages ?? 0 },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-0.5">
                <Icon aria-hidden="true" className="w-3 h-3" />
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
