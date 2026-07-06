'use client'

import type { WizardFormData } from '@/lib/listings/types'
import type { SaveStatus } from '@/lib/listings/types'
import { CheckCircle, Loader2, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WizardSummaryProps {
  data: Partial<WizardFormData>
  saveStatus: SaveStatus
  savedAt: string | null
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartment',
  house: 'House',
  land: 'Land',
  commercial: 'Commercial',
  newdev: 'New development',
  garage: 'Garage',
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  AMD: '֏',
  USD: '$',
  EUR: '€',
  RUB: '₽',
}

/**
 * Sticky desktop sidebar showing a live summary of the wizard data.
 * Hidden on mobile (<lg).
 */
export default function WizardSummary({
  data,
  saveStatus,
  savedAt,
}: WizardSummaryProps) {
  const savedTime = savedAt
    ? new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  const priceStr =
    data.price && data.currency
      ? `${CURRENCY_SYMBOLS[data.currency] ?? data.currency}${data.price.toLocaleString()}`
      : null

  const titleStr = data.title?.hy || null

  return (
    <aside
      className="hidden lg:block w-72 flex-shrink-0"
      aria-label="Listing summary"
    >
      <div className="sticky top-6 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Your listing</h2>

        <dl className="space-y-2 text-sm">
          {data.dealType && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Deal</dt>
              <dd className="font-medium text-gray-800 capitalize">{data.dealType}</dd>
            </div>
          )}
          {data.propertyType && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Type</dt>
              <dd className="font-medium text-gray-800">
                {PROPERTY_TYPE_LABELS[data.propertyType] ?? data.propertyType}
              </dd>
            </div>
          )}
          {data.city && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Location</dt>
              <dd className="font-medium text-gray-800 text-right">
                {data.city}
                {data.district ? `, ${data.district}` : ''}
              </dd>
            </div>
          )}
          {data.areaM2 && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Area</dt>
              <dd className="font-medium text-gray-800">{data.areaM2} m²</dd>
            </div>
          )}
          {titleStr && (
            <div>
              <dt className="text-gray-500 mb-1">Title</dt>
              <dd className="font-medium text-gray-800 text-sm leading-snug line-clamp-2">
                {titleStr}
              </dd>
            </div>
          )}
          {data.media && data.media.length > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Photos</dt>
              <dd className="font-medium text-gray-800">{data.media.length}</dd>
            </div>
          )}
          {priceStr && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Price</dt>
              <dd className="font-medium text-gray-800">{priceStr}</dd>
            </div>
          )}
        </dl>

        {/* Autosave status */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            'flex items-center gap-1.5 text-xs pt-3 border-t border-gray-100',
            saveStatus === 'error' ? 'text-amber-600' : 'text-gray-400',
          )}
        >
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
              <span>Saving…</span>
            </>
          )}
          {saveStatus === 'saved' && savedTime && (
            <>
              <CheckCircle className="w-3 h-3 text-green-500" aria-hidden="true" />
              <span>💾 Auto-saved {savedTime}</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <WifiOff className="w-3 h-3" aria-hidden="true" />
              <span>⚠ Not saved — retrying</span>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
