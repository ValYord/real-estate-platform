'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from '@/i18n/navigation'
import type { Filters } from '@/lib/search/filtersSchema'
import { autoSavedSearchName } from '@/lib/saved-searches/filterLabels'
import { filtersHash } from '@/lib/saved-searches/filtersHash'
import type { AlertFrequency, SavedSearchesResponse } from '@/lib/saved-searches/types'

interface SaveSearchModalProps {
  filters: Filters
  onClose: () => void
  onSaved: () => void
  /** Called on a 409 (filters-hash dedupe) so the caller can show the "already saved" toast. */
  onDuplicate: () => void
}

const FREQUENCY_OPTIONS: { value: AlertFrequency; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'instant', label: 'Instant' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
]

const NAME_MAX_LENGTH = 60

async function fetchSavedSearches(): Promise<SavedSearchesResponse> {
  const res = await fetch('/api/saved-searches')
  if (!res.ok) throw new Error(`Saved searches fetch failed: ${res.status}`)
  return res.json() as Promise<SavedSearchesResponse>
}

/**
 * The `/search` toolbar's [💾 Save search] modal, for authenticated users
 * only (the guest flow is `<SignInPromptModal>`, rendered by the caller).
 *
 * Name + alert-frequency form → `POST /api/saved-searches`.
 */
export default function SaveSearchModal({ filters, onClose, onSaved, onDuplicate }: SaveSearchModalProps) {
  const [name, setName] = useState(() => autoSavedSearchName(filters))
  const [frequency, setFrequency] = useState<AlertFrequency>('daily')
  const [isSaving, setIsSaving] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Nice-to-have client-side dedupe pre-check — the server-side unique
  // constraint remains authoritative (see lib/saved-searches/filtersHash.ts).
  const { data: existing } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: fetchSavedSearches,
    staleTime: 30_000,
  })

  const currentHash = useMemo(() => filtersHash(filters), [filters])
  const alreadySaved = useMemo(
    () => (existing?.items ?? []).some((item) => filtersHash(item.filters) === currentHash),
    [existing, currentHash],
  )

  useEffect(() => {
    nameInputRef.current?.focus()
    nameInputRef.current?.select()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && trimmedName.length <= NAME_MAX_LENGTH && !isSaving

  const handleSave = async () => {
    if (!canSave) return
    setIsSaving(true)
    setLimitReached(false)
    setServerError(null)

    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, filters, alertFrequency: frequency }),
      })

      if (res.status === 201) {
        onSaved()
        return
      }

      const body = (await res.json().catch(() => ({}))) as { error?: string }

      if (res.status === 409 || body.error === 'duplicate') {
        // Duplicate — no need to keep the modal open, close and let the
        // caller show the "already saved" toast.
        onDuplicate()
        return
      }

      if (res.status === 422 && body.error === 'limit_reached') {
        setLimitReached(true)
        return
      }

      setServerError('Something went wrong, please try again')
    } catch {
      setServerError('Something went wrong, please try again')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-search-modal-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="save-search-modal-title" className="text-base font-semibold text-gray-900">
            Save search
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {alreadySaved && !limitReached && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">
            This search is already saved.
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="save-search-name" className="text-xs text-gray-500 mb-1 block">
              Name
            </label>
            <input
              ref={nameInputRef}
              id="save-search-name"
              type="text"
              value={name}
              maxLength={NAME_MAX_LENGTH}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <fieldset>
            <legend className="text-xs text-gray-500 mb-1 block">Alert frequency</legend>
            <div className="flex flex-col gap-1.5">
              {FREQUENCY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="save-search-frequency"
                    value={opt.value}
                    checked={frequency === opt.value}
                    onChange={() => setFrequency(opt.value)}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {limitReached && (
            <div className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 space-y-1">
              <p>You&apos;ve reached the limit of 10 saved searches.</p>
              <Link href="/saved-searches" className="underline font-medium">
                Manage saved searches
              </Link>
            </div>
          )}

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]',
              !canSave && 'opacity-60 cursor-not-allowed',
            )}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
