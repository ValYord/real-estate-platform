'use client'

import { useEffect, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: ComponentType<{ className?: string }>
  label: string
  value: ReactNode
  sub?: ReactNode
  /** 0/1/2 — staggers the entrance transition via inline transitionDelay. */
  index: number
  warning?: boolean
  /** When set, the whole card becomes a <Link> (Attention card, when > 0). */
  href?: string
}

export default function StatCard({ icon: Icon, label, value, sub, index, warning = false, href }: StatCardProps) {
  const [mounted, setMounted] = useState(false)

  // Entrance micro-interaction (§4.3 of the design handoff): flips true one
  // tick after mount so the initial opacity-0/translate-y-2 classes are
  // actually painted before the transition-to classes apply.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const shellClass = cn(
    'block rounded-xl border border-gray-200 p-5 shadow-sm transition-all duration-300 ease-out',
    warning ? 'bg-amber-50' : 'bg-white',
    href && 'hover:shadow-md transition-shadow duration-150',
    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
  )

  const style = { transitionDelay: `${index * 60}ms` }

  const content = (
    <>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Icon aria-hidden="true" className={cn('w-4 h-4', warning && 'text-amber-500')} />
        {label}
      </div>
      <div className={cn('text-3xl font-bold', warning ? 'text-amber-700' : 'text-gray-900')}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </>
  )

  if (href) {
    return (
      <Link href={href as Parameters<typeof Link>[0]['href']} className={shellClass} style={style}>
        {content}
      </Link>
    )
  }

  return (
    <div className={shellClass} style={style}>
      {content}
    </div>
  )
}
