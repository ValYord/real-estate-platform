'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface StaleTargetToastProps {
  onDismiss: () => void
}

/**
 * "This content is no longer available" toast (doc §3.5 "Stale target").
 * Shown when a notification's target (a message/property) no longer exists
 * or is no longer accessible; the notification itself is still marked read.
 */
export default function StaleTargetToast({ onDismiss }: StaleTargetToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 5000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg"
    >
      <span>This content is no longer available</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="p-0.5 rounded hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
