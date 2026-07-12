'use client'

import { cn } from '@/lib/utils'

interface SaveBarProps {
  dirty: boolean
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

/**
 * Sticky Save/Cancel footer for the explicit dirty-state forms (Profile,
 * Account). Hidden entirely in the pristine state (§4 "Pristine (form)").
 * Sticky below the form on desktop, `fixed bottom-0` on mobile per §2/§6.
 */
export default function SaveBar({ dirty, saving, onSave, onCancel }: SaveBarProps) {
  if (!dirty) return null

  return (
    <div
      aria-live="polite"
      className={cn(
        'flex gap-3 justify-end',
        'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:static',
        'lg:border-t lg:border-gray-200 lg:pt-4 lg:mt-6 lg:p-0 lg:bg-transparent',
      )}
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="border border-gray-300 h-10 rounded-lg px-4 hover:bg-gray-50 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="bg-primary text-white h-10 rounded-lg px-4 disabled:opacity-50 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {saving ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Saving…
          </span>
        ) : (
          'Save'
        )}
      </button>
    </div>
  )
}
