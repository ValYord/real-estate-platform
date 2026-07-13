'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { BillingCycle, PlanTier } from '@/lib/plans/types'
import { cn } from '@/lib/utils'

interface PlanCtaButtonProps {
  tier: PlanTier
  cycle: BillingCycle
  label: string
  isLoggedIn: boolean
  isCurrentTier: boolean
}

const BASE_CLASS =
  'w-full h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'

/**
 * Per-tier CTA (docs/en/pages/17-pricing.md §3.3):
 *  - Guest             → <Link> to /auth/login?next=/pro (no fetch call).
 *  - Logged in, current → disabled "Your current plan" button.
 *  - Logged in, other  → POST /api/plans/checkout (zod-validated, session-
 *    checked stub), then an inline status message — no navigation, no
 *    real Stripe checkout in this MVP.
 */
export default function PlanCtaButton({ tier, cycle, label, isLoggedIn, isCurrentTier }: PlanCtaButtonProps) {
  const t = useTranslations('pro')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (isCurrentTier) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={cn(BASE_CLASS, 'bg-gray-100 text-gray-400 cursor-not-allowed')}
      >
        {t('cta.currentPlan')}
      </button>
    )
  }

  if (!isLoggedIn) {
    return (
      <Link href="/auth/login?next=%2Fpro" className={cn(BASE_CLASS, 'bg-primary text-white hover:bg-primary/90')}>
        {label}
      </Link>
    )
  }

  const handleClick = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/plans/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, cycle }),
      })
      if (res.status === 401) {
        window.location.href = '/auth/login?next=%2Fpro'
        return
      }
      if (res.ok) {
        setMessage(t('cta.notImplemented'))
      } else {
        setMessage(t('cta.error'))
      }
    } catch {
      setMessage(t('cta.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className={cn(BASE_CLASS, 'bg-primary text-white hover:bg-primary/90 disabled:opacity-70')}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {t('cta.loading')}
          </>
        ) : (
          label
        )}
      </button>
      {message && (
        <p role="status" className="text-xs text-gray-500 mt-2 text-center">
          {message}
        </p>
      )}
    </div>
  )
}
