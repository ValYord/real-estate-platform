'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getListingTitle, formatPrice, formatCreatedDate, formatWaiting } from '@/lib/admin/format'
import type { ModerationListItem } from '@/lib/admin/types'

interface ModerationRowProps {
  listing: ModerationListItem
  /** 'row' renders a <tr> (desktop table); 'card' renders a stacked <div> (mobile, §4.4). */
  variant: 'row' | 'card'
  onOpen: () => void
  onApprove: () => void
  onReject: () => void
  busy: boolean
}

function Thumbnail({ url, alt }: { url: string | null; alt: string }) {
  if (url) {
    return (
      <Image
        src={url}
        alt={alt}
        width={64}
        height={48}
        className="w-16 h-12 rounded object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-16 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-lg flex-shrink-0">
      🏠
    </div>
  )
}

export default function ModerationRow({ listing, variant, onOpen, onApprove, onReject, busy }: ModerationRowProps) {
  const title = getListingTitle(listing.title)
  const waiting = formatWaiting(listing.createdAt)

  if (variant === 'row') {
    return (
      <tr
        onClick={onOpen}
        className="hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors duration-100"
      >
        <td className="px-3 py-2 w-20">
          <Thumbnail url={listing.thumbnail} alt={title} />
        </td>
        <td className="px-3 py-2 max-w-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
            aria-label={`Preview ${title}`}
            className="text-gray-900 font-medium truncate block w-full text-left hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
          >
            {title}
          </button>
        </td>
        <td className="px-3 py-2 text-gray-700">{listing.ownerName}</td>
        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatPrice(listing.price, listing.currency)}</td>
        <td className="px-3 py-2">
          <div className="text-gray-700 whitespace-nowrap">{formatCreatedDate(listing.createdAt)}</div>
          <div className={cn('text-xs whitespace-nowrap', waiting.isStale ? 'text-amber-600 font-medium' : 'text-gray-500')}>
            ⏱ {waiting.text}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="flex gap-3 p-3 border border-gray-200 rounded-xl bg-white">
      <Thumbnail url={listing.thumbnail} alt={title} />
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpen}
          className="text-sm font-medium text-gray-900 truncate block w-full text-left hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
        >
          {title}
        </button>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{listing.ownerName}</p>
        <p className="text-sm text-gray-700 mt-0.5">{formatPrice(listing.price, listing.currency)}</p>
        <p className={cn('text-xs mt-0.5', waiting.isStale ? 'text-amber-600 font-medium' : 'text-gray-500')}>
          ⏱ {waiting.text}
        </p>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            aria-label={`Approve ${title}`}
            className="flex items-center gap-1 bg-green-600 text-white h-9 px-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
          >
            ✅ Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            aria-label={`Reject ${title}`}
            className="flex items-center gap-1 bg-red-600 text-white h-9 px-3 rounded-md hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            ❌ Reject
          </button>
        </div>
      </div>
    </div>
  )
}
