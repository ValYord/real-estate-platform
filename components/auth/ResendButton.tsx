'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface ResendButtonProps {
  /** Cooldown in seconds after clicking (default 60). */
  cooldownSec?: number
  onResend: () => Promise<void>
  disabled?: boolean
  label?: string
}

/**
 * "Resend code" button with a countdown timer.
 * Disabled for `cooldownSec` seconds after each click.
 */
export default function ResendButton({
  cooldownSec = 60,
  onResend,
  disabled = false,
  label = 'Resend code',
}: ResendButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [secondsLeft])

  const handleClick = useCallback(async () => {
    if (secondsLeft > 0 || loading || disabled) return
    setLoading(true)
    try {
      await onResend()
      setSecondsLeft(cooldownSec)
    } finally {
      setLoading(false)
    }
  }, [secondsLeft, loading, disabled, onResend, cooldownSec])

  const isBusy = loading || secondsLeft > 0 || disabled

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      aria-disabled={isBusy}
      className={cn(
        'text-sm font-medium transition-colors',
        isBusy
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-primary hover:underline',
      )}
    >
      {secondsLeft > 0
        ? `Resend in 0:${String(secondsLeft).padStart(2, '0')}`
        : loading
          ? 'Sending…'
          : label}
    </button>
  )
}
