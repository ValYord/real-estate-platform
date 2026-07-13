'use client'

import { Scale, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCompareStore } from '@/store/compareStore'
import { MAX_COMPARE } from '@/lib/compare/schemas'

interface CompareCheckboxProps {
  propertyId: string
  title: string
}

/**
 * Small reusable "⚖ Compare" checkbox pill, mounted inside `PropertyCard`'s
 * photo overlay (bottom-left). Reads/writes the shared `useCompareStore`.
 *
 * Lives inside the card's enclosing `<Link>` (same pattern as the favorite
 * heart button), so the click handler must `preventDefault`/`stopPropagation`.
 */
export function CompareCheckbox({ propertyId, title }: CompareCheckboxProps) {
  const ids = useCompareStore((s) => s.ids)
  const toggle = useCompareStore((s) => s.toggle)

  const isSelected = ids.includes(propertyId)
  const isMaxReached = !isSelected && ids.length >= MAX_COMPARE

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isMaxReached) return
    toggle(propertyId)
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`Compare: ${title}`}
      aria-disabled={isMaxReached || undefined}
      title={isMaxReached ? 'You can compare up to 4 properties' : undefined}
      onClick={handleClick}
      className={cn(
        'absolute bottom-3 left-3 flex items-center gap-1 h-8 px-2.5 rounded-full text-xs font-medium shadow transition-colors',
        isSelected ? 'bg-primary text-white' : 'bg-white/90 text-gray-600 hover:bg-white',
        isMaxReached && 'opacity-50 cursor-not-allowed pointer-events-none',
      )}
    >
      {isSelected ? (
        <Check className="w-3.5 h-3.5" aria-hidden="true" />
      ) : (
        <Scale className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      Compare
    </button>
  )
}
