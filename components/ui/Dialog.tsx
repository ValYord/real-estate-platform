'use client'

import {
  useEffect,
  useRef,
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

/** Controlled modal dialog rendered via a portal, with overlay + Escape-to-close. */
export default function Dialog({ open, onOpenChange, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    panelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
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
        tabIndex={-1}
        className="relative rounded-lg bg-surface shadow-lg p-6 max-w-lg w-full focus:outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export const DialogTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('text-lg font-semibold', className)} {...props} />
)
DialogTitle.displayName = 'DialogTitle'

export const DialogBody = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-2', className)} {...props} />
)
DialogBody.displayName = 'DialogBody'
