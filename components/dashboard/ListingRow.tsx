'use client'

import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { Eye, Heart, MessageSquare, Edit2, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import ListingActionsMenu from './ListingActionsMenu'
import type { ListingSummary, MyListingStatus } from '@/lib/dashboard/types'

interface ListingRowProps {
  listing: ListingSummary
  onEdit: () => void
  onToggleStatus: () => void
  onStats: () => void
  onDelete: () => void
}

const STATUS_STYLES: Record<MyListingStatus, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-200 text-gray-500',
}

const STATUS_LABELS: Record<MyListingStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  pending: 'Pending',
  archived: 'Archived',
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  const diff = new Date(expiresAt).getTime() - Date.now()
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000 // 3 days in ms
}

function getTitle(title: ListingSummary['title']): string {
  return title.en ?? title.hy ?? title.ru ?? 'Untitled'
}

export default function ListingRow({
  listing,
  onEdit,
  onToggleStatus,
  onStats,
  onDelete,
}: ListingRowProps) {
  const title = getTitle(listing.title)
  const expiring = isExpiringSoon(listing.expiresAt)

  return (
    <div className="flex gap-4 p-3 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow bg-white">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-24 h-20 rounded-lg overflow-hidden bg-gray-100">
        {listing.thumbnail ? (
          <Image
            src={listing.thumbnail}
            alt={title}
            width={96}
            height={80}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
            🏠
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <Link
              href={`/listing/${listing.id}/edit` as Parameters<typeof Link>[0]['href']}
              className="text-sm font-medium text-gray-900 hover:text-primary truncate block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
            >
              {title}
            </Link>
            <p className="text-sm text-gray-600 mt-0.5">
              {listing.price.toLocaleString()} {listing.currency}
            </p>
          </div>

          {/* Status + expiry badges */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {expiring && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium whitespace-nowrap">
                Expires in 3 days
              </span>
            )}
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                STATUS_STYLES[listing.status],
              )}
            >
              {STATUS_LABELS[listing.status]}
            </span>
          </div>
        </div>

        {/* Stats + actions row */}
        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Eye aria-hidden="true" className="w-3.5 h-3.5" />
              {listing.stats.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart aria-hidden="true" className="w-3.5 h-3.5" />
              {listing.stats.favorites}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare aria-hidden="true" className="w-3.5 h-3.5" />
              {listing.stats.messages}
            </span>
          </div>

          {/* Desktop inline actions + overflow menu */}
          <div className="flex items-center gap-1">
            {/* Desktop only inline buttons */}
            <div className="hidden lg:flex items-center gap-1">
              <button
                onClick={onEdit}
                aria-label={`Edit ${title}`}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              >
                <Edit2 aria-hidden="true" className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={onToggleStatus}
                aria-label={listing.status === 'active' ? `Deactivate ${title}` : `Activate ${title}`}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
              >
                {listing.status === 'active' ? (
                  <><Pause aria-hidden="true" className="w-3.5 h-3.5" />Deactivate</>
                ) : (
                  <><Play aria-hidden="true" className="w-3.5 h-3.5" />Activate</>
                )}
              </button>
            </div>

            {/* Always shown overflow menu */}
            <ListingActionsMenu
              listingId={listing.id}
              listingTitle={title}
              status={listing.status}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
              onStats={onStats}
              onDelete={onDelete}
            />
          </div>
        </div>

        {/* Draft: Continue editing CTA */}
        {listing.status === 'draft' && (
          <div className="mt-1.5">
            <Link
              href={`/listing/${listing.id}/edit` as Parameters<typeof Link>[0]['href']}
              className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
            >
              Continue editing →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
