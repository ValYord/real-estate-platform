'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { DashboardOverview } from '@/lib/dashboard/types'

interface OverviewCardsProps {
  userRole: 'user' | 'agent' | 'admin'
  agentSlug?: string | null
}

interface CardConfig {
  icon: string
  label: string
  key: keyof DashboardOverview | 'rating'
  href: string
  agentOnly?: boolean
}

const CARDS: CardConfig[] = [
  { icon: '🏠', label: 'My listings', key: 'listings', href: '/dashboard/listings' },
  { icon: '👁', label: 'Total views', key: 'views', href: '/dashboard/listings?sort=views' },
  { icon: '💬', label: 'Unread', key: 'unread', href: '/messages' },
  { icon: '♡', label: 'Favorites', key: 'favorites', href: '/favorites' },
  { icon: '⭐', label: 'Rating', key: 'rating', href: '', agentOnly: true },
]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 h-24">
      <div className="bg-gray-100 animate-pulse rounded-lg h-6 w-12 mb-2" />
      <div className="bg-gray-100 animate-pulse rounded h-4 w-20" />
    </div>
  )
}

function OverviewCard({
  icon, label, value, onClick,
}: {
  icon: string
  label: string
  value: string | number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-4 text-left w-full',
        'hover:shadow-sm transition-shadow duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      <div className="text-2xl font-bold text-gray-900 leading-none mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-gray-500 flex items-center gap-1">
        <span aria-hidden="true">{icon}</span>
        {label}
      </div>
    </button>
  )
}

export default function OverviewCards({ userRole, agentSlug }: OverviewCardsProps) {
  const router = useRouter()

  const { data, isLoading, isError, refetch } = useQuery<DashboardOverview>({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/overview')
      if (!res.ok) throw new Error('Failed to fetch overview')
      return res.json() as Promise<DashboardOverview>
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
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

  const getValue = (key: CardConfig['key']): number | string => {
    if (key === 'rating') return data.agent?.rating?.toFixed(1) ?? '—'
    return data[key as keyof DashboardOverview] as number ?? 0
  }

  const getHref = (card: CardConfig): string => {
    if (card.key === 'rating' && data.agent?.slug) {
      return `/agent/${data.agent.slug}#reviews`
    }
    return card.href
  }

  const visibleCards = CARDS.filter(
    (card) => !card.agentOnly || (userRole === 'agent' && agentSlug),
  )

  return (
    <div className={cn(
      'grid gap-4',
      visibleCards.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3',
    )}>
      {visibleCards.map((card) => (
        <OverviewCard
          key={card.key}
          icon={card.icon}
          label={card.label}
          value={getValue(card.key)}
          onClick={() => router.push(getHref(card) as Parameters<typeof router.push>[0])}
        />
      ))}
    </div>
  )
}
