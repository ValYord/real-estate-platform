'use client'

import { useState, forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 0 = empty, 1–4 = weak→strong */
function getPasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const
const STRENGTH_COLOR = [
  '',
  'bg-red-500',
  'bg-orange-400',
  'bg-yellow-400',
  'bg-green-500',
] as const

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  label?: string
  error?: string
  showStrength?: boolean
  /** Display value for the strength meter (uses this.value from input attrs). */
  currentValue?: string
}

/**
 * Password input with show/hide toggle and optional strength meter.
 * Uses forwardRef so react-hook-form can register it directly.
 */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { id, label, error, showStrength = false, currentValue, ...inputProps },
    ref
  ) {
    const [visible, setVisible] = useState(false)
    const valueForStrength =
      currentValue ?? (typeof inputProps.value === 'string' ? inputProps.value : '')
    const strength = showStrength ? getPasswordStrength(valueForStrength) : 0

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={visible ? 'text' : 'password'}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-invalid={!!error}
            className={cn(
              'h-11 w-full rounded-lg border px-3 pr-10 text-sm transition-colors',
              'focus:outline-none focus:ring-2',
              error
                ? 'border-red-500 focus:ring-red-200'
                : 'border-gray-300 focus:ring-primary/40 focus:border-primary',
              inputProps.disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            )}
            {...inputProps}
          />

          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-r-lg"
          >
            {visible ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Strength meter */}
        {showStrength && valueForStrength.length > 0 && (
          <div className="mt-1.5 space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors duration-300',
                    strength >= bar ? STRENGTH_COLOR[strength] : 'bg-gray-200',
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500">
              {strength > 0 && (
                <span className="font-medium">{STRENGTH_LABEL[strength]} — </span>
              )}
              At least 8 characters, a letter and a number
            </p>
          </div>
        )}

        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-xs text-red-600 mt-1"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

export default PasswordInput
