'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MoreHorizontal, Edit2, Pause, Play, BarChart2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MyListingStatus } from '@/lib/dashboard/types'

interface ListingActionsMenuProps {
  listingId: string
  listingTitle: string
  status: MyListingStatus
  onEdit: () => void
  onToggleStatus: () => void
  onStats: () => void
  onDelete: () => void
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  action: () => void
  variant?: 'default' | 'danger'
}

export default function ListingActionsMenu({
  listingId,
  listingTitle,
  status,
  onEdit,
  onToggleStatus,
  onStats,
  onDelete,
}: ListingActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = `listing-menu-${listingId}`

  const menuItems: MenuItem[] = [
    { icon: Edit2, label: 'Edit', action: onEdit },
    {
      icon: status === 'active' ? Pause : Play,
      label: status === 'active' ? 'Deactivate' : 'Activate',
      action: onToggleStatus,
    },
    { icon: BarChart2, label: 'Statistics', action: onStats },
    { icon: Trash2, label: 'Delete', action: onDelete, variant: 'danger' },
  ]

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  // Close on outside click or Escape
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

  // Focus the focused menu item
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
        onClick={handleOpen}
        aria-label={`More actions for ${listingTitle}`}
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
          aria-label={`Actions for ${listingTitle}`}
          className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
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
