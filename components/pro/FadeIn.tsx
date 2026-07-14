'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FadeInProps {
  children: ReactNode
  delayMs?: number
  className?: string
}

/**
 * One-time opacity fade-in on mount for KPI cards / chart panels (page spec
 * §5 "Entrance"). Built only from Tailwind's built-in `transition-opacity`
 * utility — no animation library exists in this codebase (handoff D1) — and
 * kept subtle (opacity only, ≤300ms, no transform/scale).
 *
 * `motion-reduce:` disables the transition and shows content immediately,
 * so `prefers-reduced-motion: reduce` users never wait on it — the one
 * addition this page makes beyond the handoff's baseline (§5 "Reduced
 * motion" flags this as a possible platform-wide follow-up; scoping it to
 * this component costs nothing and doesn't require a design-system change).
 */
export default function FadeIn({ children, delayMs = 0, className }: FadeInProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), 0)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div
      className={cn(
        'transition-opacity duration-300 motion-reduce:transition-none motion-reduce:opacity-100',
        visible ? 'opacity-100' : 'opacity-0',
        className,
      )}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  )
}
