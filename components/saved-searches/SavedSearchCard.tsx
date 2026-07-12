'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Search as SearchIcon, Pencil, TextCursorInput, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import FilterChips from './FilterChips'
import NewMatchBadge from './NewMatchBadge'
import FrequencyToggle from './FrequencyToggle'
import SavedSearchActionsMenu from './SavedSearchActionsMenu'
import RenameModal from './RenameModal'
import type { AlertFrequency, SavedSearchItem } from '@/lib/saved-searches/types'
import type { Filters } from '@/lib/search/filtersSchema'

// Lazy-loaded — same pattern as components/property/Lightbox.tsx.
const EditFiltersModal = dynamic(() => import('./EditFiltersModal'), { ssr: false })

interface SavedSearchCardProps {
  search: SavedSearchItem
  isFading?: boolean
  onFrequencyChange: (id: string, next: AlertFrequency) => void
  onOpen: (search: SavedSearchItem) => void
  onEditSave: (id: string, filters: Filters) => void
  onRenameSave: (id: string, name: string) => void
  onDelete: (id: string) => void
}

function formatLastAlerted(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function SavedSearchCard({
  search,
  isFading = false,
  onFrequencyChange,
  onOpen,
  onEditSave,
  onRenameSave,
  onDelete,
}: SavedSearchCardProps) {
  const [renaming, setRenaming] = useState(false)
  const [editing, setEditing] = useState(false)

  const idPrefix = `saved-search-${search.id}`

  return (
    <li
      className={cn(
        'shadow-sm border border-gray-200 rounded-xl p-4 transition-opacity duration-200 list-none',
        isFading && 'opacity-0',
      )}
    >
      {/* Name row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-base font-medium text-gray-900">{search.name}</h3>
        <NewMatchBadge count={search.newMatchCount} />
      </div>

      {/* Filter chips */}
      <div className="mb-3">
        <FilterChips filters={search.filters} />
      </div>

      {/* Alert frequency + last check time */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <FrequencyToggle
          idPrefix={idPrefix}
          value={search.alertFrequency}
          onChange={(next) => onFrequencyChange(search.id, next)}
        />
        <span className="text-xs text-gray-400">last: {formatLastAlerted(search.lastAlertedAt)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpen(search)}
          className="bg-primary text-white h-9 rounded-lg px-4 text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1.5"
        >
          <SearchIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Open search
        </button>

        {/* Desktop: inline actions */}
        <div className="hidden md:flex items-center gap-3 ml-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <TextCursorInput className="w-3.5 h-3.5" aria-hidden="true" />
            Rename
          </button>
          <button
            type="button"
            onClick={() => onDelete(search.id)}
            aria-label="Delete saved search"
            className="text-gray-400 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Mobile: "⋯" menu */}
        <div className="md:hidden ml-auto">
          <SavedSearchActionsMenu
            searchId={search.id}
            searchName={search.name}
            onEdit={() => setEditing(true)}
            onRename={() => setRenaming(true)}
            onDelete={() => onDelete(search.id)}
          />
        </div>
      </div>

      {renaming && (
        <RenameModal
          currentName={search.name}
          onCancel={() => setRenaming(false)}
          onSave={(name) => {
            setRenaming(false)
            onRenameSave(search.id, name)
          }}
        />
      )}

      {editing && (
        <EditFiltersModal
          filters={search.filters}
          onCancel={() => setEditing(false)}
          onSave={(filters) => {
            setEditing(false)
            onEditSave(search.id, filters)
          }}
        />
      )}
    </li>
  )
}
