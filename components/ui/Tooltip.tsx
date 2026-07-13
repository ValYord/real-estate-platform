'use client'

import { cloneElement, isValidElement, useId, useState, type ReactElement, type ReactNode } from 'react'
import { cn } from './variants'

export interface TooltipProps {
  content: string
  children: ReactNode
  className?: string
}

interface TriggerHandlers {
  onFocus?: (...args: unknown[]) => void
  onBlur?: (...args: unknown[]) => void
  onMouseEnter?: (...args: unknown[]) => void
  onMouseLeave?: (...args: unknown[]) => void
  'aria-describedby'?: string
}

/** Minimal state-based tooltip: shows `content` in a `role="tooltip"` element on hover/focus. */
export default function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  if (!isValidElement<TriggerHandlers>(children)) return <>{children}</>

  const trigger = children as ReactElement<TriggerHandlers>

  const triggerWithHandlers = cloneElement(trigger, {
    onFocus: (...args: unknown[]) => {
      trigger.props.onFocus?.(...args)
      setVisible(true)
    },
    onBlur: (...args: unknown[]) => {
      trigger.props.onBlur?.(...args)
      setVisible(false)
    },
    onMouseEnter: (...args: unknown[]) => {
      trigger.props.onMouseEnter?.(...args)
      setVisible(true)
    },
    onMouseLeave: (...args: unknown[]) => {
      trigger.props.onMouseLeave?.(...args)
      setVisible(false)
    },
    'aria-describedby': visible ? id : undefined,
  })

  return (
    <span className="relative inline-block">
      {triggerWithHandlers}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-text px-2 py-1 text-xs text-surface shadow-lg',
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
