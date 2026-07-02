'use client'

import { useState } from 'react'
import { Edit, PauseCircle, Trash2, BarChart2, Loader2, X, Check } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { PropertyDetail } from '@/lib/property/types'

interface OwnerManageBarProps {
  property: PropertyDetail
}

/**
 * Bar shown to the property owner instead of the ContactCard.
 * Shows analytics stats and management actions.
 */
export default function OwnerManageBar({ property }: OwnerManageBarProps) {
  const [deactivating, setDeactivating] = useState(false)
  const [deactivated, setDeactivated] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isActive = property.status === 'active' && !deactivated

  const handleDeactivate = async () => {
    if (deactivating) return
    setDeactivating(true)
    // Optimistic update
    setDeactivated(true)
    try {
      await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      })
    } catch {
      // Revert on error
      setDeactivated(false)
    } finally {
      setDeactivating(false)
    }
  }

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        window.location.href = '/dashboard'
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
      <div className="shadow-sm border border-gray-200 rounded-xl p-5 space-y-5 sticky top-20">
        {/* Stats row */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-900">Your listing</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-gray-900">{property.viewsCount.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">views</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{property.favoritesCount.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">favorites</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">—</p>
              <p className="text-xs text-gray-500 mt-0.5">messages</p>
            </div>
          </div>
        </div>

        {/* Status microcopy */}
        {property.status === 'pending' && (
          <p
            role="status"
            className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2"
          >
            Moderation in progress, usually within 24 hours.
          </p>
        )}
        {deactivated && (
          <p
            role="status"
            className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
            Listing deactivated.
          </p>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          <Link
            href={`/listing/${property.id}/edit`}
            className="w-full h-12 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Edit className="w-4 h-4" aria-hidden="true" />
            Edit listing
          </Link>

          {isActive && (
            <button
              onClick={handleDeactivate}
              disabled={deactivating}
              className={cn(
                'w-full h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              )}
            >
              {deactivating ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <PauseCircle className="w-4 h-4" aria-hidden="true" />
              )}
              Deactivate
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full h-10 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Delete listing
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-80 mx-4"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 id="delete-title" className="font-semibold text-gray-900">
                Confirm deletion
              </h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                aria-label="Cancel"
                className="text-gray-400 hover:text-gray-600 focus-visible:outline-none"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to permanently delete this listing? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-10 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-10 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-70 flex items-center justify-center gap-1.5 focus-visible:outline-none"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
