'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCurrencyStore } from '@/store/currencyStore'
import type { BillingCycle, Plan, PlanTier } from '@/lib/plans/types'
import { FEATURE_ROW_KEYS, formatFeatureValue } from '@/lib/plans/featureRows'
import BillingCycleToggle from './BillingCycleToggle'
import PlanCtaButton from './PlanCtaButton'
import { cn } from '@/lib/utils'

interface PlanComparisonProps {
  plans: Plan[]
  /** null = guest (not logged in); otherwise the viewer's current `profiles.tier`. */
  currentTier: PlanTier | null
}

const CURRENCY_SYMBOL: Record<string, string> = {
  AMD: '֏',
  USD: '$',
  EUR: '€',
  RUB: '₽',
}

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  return currency === 'AMD' ? `${amount.toLocaleString('en-US')} ${symbol}` : `${symbol}${amount.toLocaleString('en-US')}`
}

const CTA_LABEL_KEY: Record<PlanTier, 'startFree' | 'choosePro' | 'choosePremium'> = {
  free: 'startFree',
  pro: 'choosePro',
  premium: 'choosePremium',
}

/**
 * Client component: owns the billing-cycle toggle state and reads the
 * global currency preference (store/currencyStore.ts, already mounted in the
 * header — no live FX conversion, docs/design/17-pricing-handoff.md D3).
 * Renders a single component tree — desktop <table> (>=768px) and mobile
 * stacked cards (<768px) share the same billingCycle/currency state, so
 * neither view can drift out of sync (docs/en/pages/17-pricing.md §6).
 */
export default function PlanComparison({ plans, currentTier }: PlanComparisonProps) {
  const t = useTranslations('pro')
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const { currency } = useCurrencyStore()
  const isLoggedIn = currentTier !== null

  return (
    <section id="plans" className="mt-10 scroll-mt-20">
      <div className="flex justify-center">
        <BillingCycleToggle value={cycle} onChange={setCycle} />
      </div>
      <p className="text-center text-xs text-gray-500 mt-2" aria-live="polite">
        {cycle === 'annual' ? t('toggle.annualNote') : ' '}
      </p>

      {/* ── Desktop: comparison table (>=768px) ── */}
      <div className="hidden md:block mt-8 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className="p-3" />
              {plans.map((plan) => (
                <th key={plan.tier} scope="col" className="p-3 align-bottom relative">
                  <PlanHeaderCell plan={plan} cycle={cycle} currency={currency} t={t} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURE_ROW_KEYS.map((key) => (
              <tr key={key} className="hover:bg-gray-50">
                <th scope="row" className="text-sm text-gray-600 text-left p-3 border-b border-gray-100 font-normal">
                  {t(`features.${key}`)}
                </th>
                {plans.map((plan) => (
                  <td key={plan.tier} className="text-sm text-center p-3 border-b border-gray-100">
                    <FeatureCellView plan={plan} rowKey={key} t={t} />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="p-3" />
              {plans.map((plan) => (
                <td key={plan.tier} className="p-3">
                  <PlanCtaButton
                    tier={plan.tier}
                    cycle={cycle}
                    label={t(`cta.${CTA_LABEL_KEY[plan.tier]}`)}
                    isLoggedIn={isLoggedIn}
                    isCurrentTier={currentTier === plan.tier}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Mobile: stacked tier cards (<768px) ── */}
      <div className="md:hidden mt-8 space-y-4">
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={cn(
              'bg-white border border-gray-200 rounded-2xl p-6 relative',
              plan.isPopular && 'ring-2 ring-primary shadow-lg',
            )}
          >
            <PlanHeaderCell plan={plan} cycle={cycle} currency={currency} t={t} />
            <ul className="mt-4 space-y-2">
              {FEATURE_ROW_KEYS.map((key) => {
                const cell = formatFeatureValue(key, plan)
                if (cell.kind === 'dash') return null
                return (
                  <li key={key} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
                    <span>
                      {t(`features.${key}`)}
                      {cell.kind === 'number' && `: ${cell.value}`}
                      {cell.kind === 'text' && `: ${t(`featureValues.${cell.value}`)}`}
                    </span>
                  </li>
                )
              })}
            </ul>
            <div className="mt-5">
              <PlanCtaButton
                tier={plan.tier}
                cycle={cycle}
                label={t(`cta.${CTA_LABEL_KEY[plan.tier]}`)}
                isLoggedIn={isLoggedIn}
                isCurrentTier={currentTier === plan.tier}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Sub-renderers ────────────────────────────────────────────────────────────

interface CellCommonProps {
  plan: Plan
  t: ReturnType<typeof useTranslations>
}

function PlanHeaderCell({
  plan,
  cycle,
  currency,
  t,
}: CellCommonProps & { cycle: BillingCycle; currency: string }) {
  const cyclePrice = plan.prices[currency as keyof Plan['prices']] ?? plan.prices.AMD
  const monthlyDisplay = cycle === 'annual' ? Math.round(cyclePrice.annual / 12) : cyclePrice.monthly

  return (
    <div className="text-left md:text-center">
      {plan.isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
          {t('popularBadge')}
        </span>
      )}
      <p className="text-lg font-semibold text-gray-900">{t(`tiers.${plan.tier}`)}</p>
      <p className="mt-1" aria-live="polite">
        <span className="text-3xl font-bold text-gray-900">{formatAmount(monthlyDisplay, currency)}</span>
        <span className="text-base font-normal text-gray-500 ml-1">{t('perMonth')}</span>
      </p>
      {cycle === 'annual' && (
        <p className="text-xs text-gray-500 mt-0.5">{t('perYear', { amount: formatAmount(cyclePrice.annual, currency) })}</p>
      )}
    </div>
  )
}

function FeatureCellView({ plan, rowKey, t }: CellCommonProps & { rowKey: (typeof FEATURE_ROW_KEYS)[number] }) {
  const cell = formatFeatureValue(rowKey, plan)
  switch (cell.kind) {
    case 'check':
      return <Check className="w-5 h-5 text-green-600 inline" aria-label={t('included')} />
    case 'dash':
      return (
        <span className="text-gray-300" aria-label={t('notIncluded')}>
          —
        </span>
      )
    case 'number':
      return <span>{cell.value}</span>
    case 'text':
      return <span>{t(`featureValues.${cell.value}`)}</span>
    default:
      return null
  }
}
