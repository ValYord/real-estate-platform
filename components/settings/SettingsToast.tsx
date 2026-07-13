'use client'

import { useEffect } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error'

interface SettingsToastProps {
  message: string
  variant?: ToastVariant
  onDismiss: () => void
}

/**
 * Shared "Saved" / error toast for the instant-save tabs (Preferences,
 * Notifications, Privacy) and the explicit-Save forms (Profile, Account).
 * `aria-live="polite"` per the accessibility section (§7 "Save bar").
 */
export default function SettingsToast({ message, variant = 'success', onDismiss }: SettingsToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-3 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg max-w-xs',
        variant === 'success' ? 'bg-gray-900' : 'bg-red-600',
      )}
    >
      {variant === 'success' ? (
        <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      )}
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
