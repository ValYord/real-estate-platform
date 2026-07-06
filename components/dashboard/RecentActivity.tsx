'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@/i18n/navigation'
import { Eye, MessageSquare, CheckCircle, XCircle, Heart, Loader2, type LucideProps } from 'lucide-react'
import type { ActivityItem, ActivityResponse, ActivityEventType } from '@/lib/dashboard/types'

const EVENT_ICONS: Record<ActivityEventType, React.ComponentType<LucideProps>> = {
  view_burst: Eye,
  new_message: MessageSquare,
  listing_approved: CheckCircle,
  listing_rejected: XCircle,
  favorited: Heart,
}

const EVENT_ICON_COLORS: Record<ActivityEventType, string> = {
  view_burst: 'text-blue-500',
  new_message: 'text-green-500',
  listing_approved: 'text-green-600',
  listing_rejected: 'text-red-500',
  favorited: 'text-pink-500',
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function getEventText(item: ActivityItem): string {
  switch (item.type) {
    case 'view_burst':
      return item.count
        ? `${item.count} people viewed your "${item.listingTitle ?? 'listing'}"`
        : `Someone viewed your "${item.listingTitle ?? 'listing'}"`
    case 'new_message':
      return `New message${item.actorName ? ` from ${item.actorName}` : ''}`
    case 'listing_approved':
      return `Your "${item.listingTitle ?? 'listing'}" was approved`
    case 'listing_rejected':
      return `"${item.listingTitle ?? 'listing'}" was rejected — see the reason`
    case 'favorited':
      return `${item.actorName ?? 'Someone'} favorited your property`
  }
}

function getEventHref(item: ActivityItem): string | null {
  switch (item.type) {
    case 'new_message':
      return item.conversationId ? `/messages/${item.conversationId}` : '/messages'
    case 'listing_approved':
      return item.listingId ? `/property/${item.listingId}` : null
    case 'listing_rejected':
      return item.listingId ? `/listing/${item.listingId}/edit` : null
    default:
      return null
  }
}

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const Icon = EVENT_ICONS[item.type]
  const colorClass = EVENT_ICON_COLORS[item.type]
  const text = getEventText(item)
  const href = getEventHref(item)

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className={`mt-0.5 flex-shrink-0 ${colorClass}`}>
        <Icon aria-hidden="true" className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        {href ? (
          <Link
            href={href as Parameters<typeof Link>[0]['href']}
            className="text-sm text-gray-800 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
          >
            {text}
          </Link>
        ) : (
          <span className="text-sm text-gray-800">{text}</span>
        )}
      </div>
      <time
        dateTime={item.at}
        className="flex-shrink-0 text-xs text-gray-400 mt-0.5"
      >
        {formatRelativeTime(item.at)}
      </time>
    </div>
  )
}

export default function RecentActivity() {
  const [cursor, setCursor] = useState<string | null>(null)
  const [allItems, setAllItems] = useState<ActivityItem[]>([])

  const { data, isLoading, isFetching } = useQuery<ActivityResponse>({
    queryKey: ['dashboard-activity', cursor ?? 'initial'],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' })
      if (cursor) params.set('cursor', cursor)
      const res = await fetch(`/api/dashboard/activity?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch activity')
      return res.json() as Promise<ActivityResponse>
    },
    enabled: true,
    staleTime: 30000,
  })

  // Accumulate items across cursor pages
  const items = cursor ? allItems : (data?.items ?? [])

  const handleLoadMore = () => {
    if (data?.items) {
      setAllItems((prev) => [...prev, ...data.items])
    }
    if (data?.nextCursor) {
      setCursor(data.nextCursor)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 py-3">
            <div className="w-4 h-4 rounded-full bg-gray-100 animate-pulse flex-shrink-0 mt-0.5" />
            <div className="flex-1 bg-gray-100 animate-pulse rounded h-4" />
          </div>
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <p className="text-sm text-gray-500 py-4">
        No activity yet. Post your first listing.
      </p>
    )
  }

  return (
    <div>
      <div>
        {items.map((item) => (
          <ActivityItemRow key={item.id} item={item} />
        ))}
      </div>

      {/* See more */}
      {data?.nextCursor && (
        <button
          onClick={handleLoadMore}
          disabled={isFetching}
          className="mt-3 text-sm text-primary hover:underline flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          {isFetching && <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />}
          See more
        </button>
      )}
    </div>
  )
}
