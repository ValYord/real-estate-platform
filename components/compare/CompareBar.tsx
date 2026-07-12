'use client'

import { Scale, X } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { useCompareStore } from '@/store/compareStore'
import { MIN_COMPARE } from '@/lib/compare/schemas'

/**
 * Floating "N selected · [Compare →]" bar, mounted once from the search
 * results page. Appears as soon as at least one property is selected;
 * the CTA stays disabled until MIN_COMPARE is reached.
 */
export function CompareBar() {
  const router = useRouter()
  const ids = useCompareStore((s) => s.ids)
  const clear = useCompareStore((s) => s.clear)

  if (ids.length === 0) return null

  const canCompare = ids.length >= MIN_COMPARE

  const handleCompare = () => {
    if (!canCompare) return
    router.push(`/compare?ids=${ids.join(',')}`)
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 inset-x-4 z-40 flex items-center justify-between gap-3',
        'bg-gray-900 text-white rounded-xl px-4 py-3 shadow-lg',
        'sm:inset-x-auto sm:left-auto sm:right-6 sm:w-auto sm:min-w-[280px]',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Scale className="w-4 h-4" aria-hidden="true" />
        {ids.length} selected
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCompare}
          disabled={!canCompare}
          aria-disabled={!canCompare}
          className="h-9 px-4 rounded-lg bg-white text-gray-900 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Compare →
        </button>
        <button
          type="button"
          onClick={clear}
          aria-label="Clear comparison selection"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
