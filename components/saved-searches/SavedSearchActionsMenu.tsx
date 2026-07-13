'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MoreHorizontal, Pencil, TextCursorInput, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SavedSearchActionsMenuProps {
  searchId: string
  searchName: string
  onEdit: () => void
  onRename: () => void
  onDelete: () => void
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  action: () => void
  variant?: 'default' | 'danger'
}

/**
 * Mobile "⋯" menu collapsing Edit/Rename/Delete — directly modeled on
 * `components/dashboard/ListingActionsMenu.tsx` (same trigger, outside-click
 * + Escape close, arrow-key navigation, role="menu"/"menuitem").
 */
export default function SavedSearchActionsMenu({
  searchId,
  searchName,
  onEdit,
  onRename,
  onDelete,
}: SavedSearchActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = `saved-search-menu-${searchId}`

  const menuItems: MenuItem[] = [
    { icon: Pencil, label: 'Edit filters', action: onEdit },
    { icon: TextCursorInput, label: 'Rename', action: onRename },
    { icon: Trash2, label: 'Delete', action: onDelete, variant: 'danger' },
  ]

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, menuItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, close, menuItems.length])

  useEffect(() => {
    if (!open) return
    const items = menuRef.current?.querySelectorAll('[role="menuitem"]')
    if (items && items[focusedIndex]) {
      (items[focusedIndex] as HTMLElement).focus()
    }
  }, [open, focusedIndex])

  const handleOpen = () => {
    setOpen(true)
    setFocusedIndex(0)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-label={`More actions for ${searchName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={cn(
          'p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'min-w-[44px] min-h-[44px] flex items-center justify-center',
        )}
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${searchName}`}
          className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={focusedIndex === index ? 0 : -1}
                onClick={() => {
                  close()
                  item.action()
                }}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left',
                  'hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:bg-gray-50',
                  'min-h-[44px]',
                  item.variant === 'danger' ? 'text-red-600' : 'text-gray-700',
                )}
              >
                <Icon aria-hidden="true" className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
