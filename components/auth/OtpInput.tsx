'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  error?: boolean
  disabled?: boolean
  'aria-label'?: string
}

/**
 * 6-box OTP input with:
 * - Auto-advance on digit entry
 * - Paste support (6 digits → fills all boxes)
 * - Backspace → moves focus to previous box
 */
export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
  'aria-label': ariaLabel,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const digits = value.padEnd(length, '').slice(0, length).split('')

  const focus = (index: number) => {
    inputsRef.current[index]?.focus()
    inputsRef.current[index]?.select()
  }

  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, '').slice(-1)
    const next = digits.slice()
    next[index] = digit

    const newValue = next.join('')
    onChange(newValue)

    if (digit && index < length - 1) {
      focus(index + 1)
    }
    if (newValue.replace(/\s/g, '').length === length) {
      onComplete?.(newValue)
    }
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        // Clear current box
        const next = digits.slice()
        next[index] = ''
        onChange(next.join(''))
      } else if (index > 0) {
        // Move to previous box
        focus(index - 1)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      focus(index - 1)
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      focus(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, length)
    if (!pasted) return

    onChange(pasted.padEnd(length, '').slice(0, length))
    const focusIndex = Math.min(pasted.length, length - 1)
    focus(focusIndex)
    if (pasted.length >= length) {
      onComplete?.(pasted.slice(0, length))
    }
  }

  return (
    <div
      className="flex gap-2 justify-center"
      role="group"
      aria-label={ariaLabel ?? 'Verification code'}
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digits[i] === ' ' ? '' : (digits[i] ?? '')}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`Verification code, digit ${i + 1}`}
          autoComplete="one-time-code"
          className={cn(
            'w-12 h-14 text-center text-2xl font-mono rounded-lg border transition-colors',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-red-500 focus:ring-red-200 bg-red-50'
              : 'border-gray-300 focus:ring-primary/40 focus:border-primary',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-100',
          )}
        />
      ))}
    </div>
  )
}
