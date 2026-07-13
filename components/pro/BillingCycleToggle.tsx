'use client'

import { useTranslations } from 'next-intl'
import type { BillingCycle } from '@/lib/plans/types'
import { cn } from '@/lib/utils'

interface BillingCycleToggleProps {
  value: BillingCycle
  onChange: (cycle: BillingCycle) => void
}

/**
 * Monthly / Annual segmented switch (docs/en/pages/17-pricing.md §3.2, §7).
 * `role="switch"` + `aria-checked` so screen readers announce state; native
 * `<button>` gives Enter/Space activation for free.
 */
export default function BillingCycleToggle({ value, onChange }: BillingCycleToggleProps) {
  const t = useTranslations('pro')
  const isAnnual = value === 'annual'

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 p-1 bg-gray-50">
      <button
        type="button"
        role="switch"
        aria-checked={!isAnnual}
        onClick={() => onChange('monthly')}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          !isAnnual ? 'bg-primary text-white shadow-sm' : 'text-gray-600',
        )}
      >
        {t('toggle.monthly')}
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={isAnnual}
        onClick={() => onChange('annual')}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
          isAnnual ? 'bg-primary text-white shadow-sm' : 'text-gray-600',
        )}
      >
        {t('toggle.annual')}
        <span
          className={cn(
            'text-xs font-medium px-1.5 py-0.5 rounded',
            isAnnual ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700',
          )}
        >
          {t('toggle.discountBadge')}
        </span>
      </button>
    </div>
  )
}
