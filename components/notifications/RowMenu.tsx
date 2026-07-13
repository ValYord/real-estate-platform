'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

interface RowMenuProps {
  read: boolean
  onMarkRead: () => void
  onMarkUnread: () => void
  onDelete: () => void
}

/**
 * The `[•••]` per-row menu on `/notifications` (doc §3.2): Mark read / Mark
 * unread / Delete. Keyboard-accessible, touch target ≥44px (doc §7).
 */
export default function RowMenu({ read, onMarkRead, onMarkUnread, onDelete }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOutsideClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="More actions"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="min-w-11 min-h-11 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Notification actions"
          className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10"
        >
          {read ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onMarkUnread()
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50"
            >
              Mark unread
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onMarkRead()
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50"
            >
              Mark read
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:bg-red-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
