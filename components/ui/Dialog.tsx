'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useId,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from './variants'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

const DialogContext = createContext<{ titleId: string } | null>(null)

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Controlled modal dialog rendered via a portal, with overlay + Escape-to-close. */
export default function Dialog({ open, onOpenChange, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Focus restoration: remember what was focused before opening, restore on close/unmount.
  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    return () => {
      previouslyFocused?.focus?.()
    }
  }, [open])

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    panelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false)
        return
      }

      if (event.key === 'Tab') {
        const panel = panelRef.current
        if (!panel) return

        const focusable = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => el.offsetParent !== null || el === document.activeElement)

        if (focusable.length === 0) {
          event.preventDefault()
          panel.focus()
          return
        }

        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement

        if (event.shiftKey) {
          if (active === first || !panel.contains(active)) {
            event.preventDefault()
            last.focus()
          }
        } else {
          if (active === last || !panel.contains(active)) {
            event.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <DialogContext.Provider value={{ titleId }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          data-dialog-overlay
          className="fixed inset-0 bg-text/50"
          aria-hidden="true"
          onClick={() => onOpenChange(false)}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative rounded-lg bg-surface shadow-lg p-6 max-w-lg w-full focus:outline-none"
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>,
    document.body,
  )
}

export const DialogTitle = ({ className, id, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
  const context = useContext(DialogContext)
  return (
    <h2 id={id ?? context?.titleId} className={cn('text-lg font-semibold', className)} {...props} />
  )
}
DialogTitle.displayName = 'DialogTitle'

export const DialogBody = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-2', className)} {...props} />
)
DialogBody.displayName = 'DialogBody'
