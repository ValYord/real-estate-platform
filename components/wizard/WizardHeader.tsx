'use client'

import { Link } from '@/i18n/navigation'
import { Loader2, CheckCircle, WifiOff } from 'lucide-react'
import type { SaveStatus } from '@/lib/listings/types'
import { cn } from '@/lib/utils'

interface WizardHeaderProps {
  saveStatus: SaveStatus
  savedAt: string | null
}

/**
 * Minimal wizard header: logo + autosave status badge.
 * Replaces the main site header for the wizard pages.
 */
export default function WizardHeader({ saveStatus, savedAt }: WizardHeaderProps) {
  const savedTime = savedAt
    ? new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <header className="h-14 lg:h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 max-w-full">
      <Link
        href="/"
        className="text-xl font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        aria-label="RE Platform — Home"
      >
        RE Platform
      </Link>

      {/* Auto-save badge */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          'flex items-center gap-1.5 text-xs',
          saveStatus === 'error' ? 'text-amber-600' : 'text-gray-400',
        )}
      >
        {saveStatus === 'saving' && (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            <span>Saving…</span>
          </>
        )}
        {saveStatus === 'saved' && savedTime && (
          <>
            <CheckCircle className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
            <span>💾 Saved {savedTime}</span>
          </>
        )}
        {saveStatus === 'error' && (
          <>
            <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
            <span>⚠ Not saved — retrying</span>
          </>
        )}
      </div>
    </header>
  )
}
