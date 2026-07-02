'use client'

import { cn } from '@/lib/utils'

type Role = 'user' | 'agent'

interface RoleToggleProps {
  value: Role
  onChange: (role: Role) => void
  disabled?: boolean
}

const OPTIONS: { id: Role; icon: string; label: string; sub: string }[] = [
  {
    id: 'user',
    icon: '👤',
    label: 'As a person',
    sub: 'Search, save and list properties',
  },
  {
    id: 'agent',
    icon: '🏢',
    label: 'As an agent',
    sub: 'Pro tools, many listings',
  },
]

/**
 * Segmented role-select toggle: User / Agent.
 * Used at the top of the Register form.
 */
export default function RoleToggle({ value, onChange, disabled }: RoleToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Account type"
      className="grid grid-cols-2 gap-2"
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              'flex flex-col items-start gap-0.5 p-3 rounded-xl border-2 text-left transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-gray-200 hover:border-gray-400',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <span className="text-lg" aria-hidden="true">
              {opt.icon}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {opt.label}
            </span>
            <span className="text-xs text-gray-500 leading-tight">
              {opt.sub}
            </span>
          </button>
        )
      })}
    </div>
  )
}
