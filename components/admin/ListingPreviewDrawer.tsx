'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { getListingTitle, formatPrice, formatCreatedDate } from '@/lib/admin/format'
import type { ModerationListItem } from '@/lib/admin/types'

interface ListingPreviewDrawerProps {
  listing: ModerationListItem
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  busy: boolean
}

/**
 * Row-click preview drawer (D6 in the design handoff: a simplified detail
 * panel showing only the key fields already available on the queue row —
 * no gallery/map, no extra fetch — rather than the generic page spec's full
 * property-page-style preview).
 */
export default function ListingPreviewDrawer({ listing, onClose, onApprove, onReject, busy }: ListingPreviewDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const title = getListingTitle(listing.title)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-50 transition-opacity duration-300"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${title}`}
        className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 translate-x-0"
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 flex-shrink-0">
          <span className="text-base font-semibold text-gray-900 truncate">{title}</span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close preview"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {listing.thumbnail ? (
            <Image
              src={listing.thumbnail}
              alt={title}
              width={448}
              height={252}
              className="w-full aspect-video rounded-lg object-cover bg-gray-100"
            />
          ) : (
            <div className="w-full aspect-video rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-3xl">
              🏠
            </div>
          )}

          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Owner</dt>
              <dd className="text-sm text-gray-900 mt-0.5">{listing.ownerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Price</dt>
              <dd className="text-sm text-gray-900 mt-0.5">{formatPrice(listing.price, listing.currency)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Status</dt>
              <dd className="text-sm mt-0.5">
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded">Pending</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Created</dt>
              <dd className="text-sm text-gray-900 mt-0.5">{formatCreatedDate(listing.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white h-9 px-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
          >
            ✅ Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1 bg-red-600 text-white h-9 px-3 rounded-md hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            ❌ Reject
          </button>
        </div>
      </div>
    </>
  )
}
