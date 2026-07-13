'use client'

import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
  /** Hides the visible label text while keeping it for screen readers. */
  labelHidden?: boolean
}

/**
 * Instant-save toggle switch (design tokens §2: on = `bg-primary`,
 * off = `bg-gray-300`). `role="switch" aria-checked` per §7 accessibility.
 */
export default function Switch({ checked, onChange, label, disabled, labelHidden }: SwitchProps) {
  return (
    <label className={cn('flex items-center gap-2 cursor-pointer', disabled && 'cursor-not-allowed opacity-50')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={labelHidden ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          checked ? 'bg-primary' : 'bg-gray-300',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
      {!labelHidden && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}
