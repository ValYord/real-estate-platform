import { Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CURRENCIES } from '@/lib/mortgage/constants'
import { loanTypeLabel } from '@/lib/mortgage/rates/constants'
import { resolveMonthlyPayment } from '@/lib/mortgage/rates/calc'
import { formatRateDate } from '@/lib/mortgage/rates/format'
import type { RateOffer } from '@/lib/mortgage/rates/types'
import type { RatesFilter } from '@/lib/mortgage/rates/schemas'

interface RateRowProps {
  offer: RateOffer
  filters: Pick<RatesFilter, 'amount' | 'term'>
  /** 'row' renders a <tr> (desktop table); 'card' renders a stacked <div> (mobile). Forked from components/admin/ModerationRow.tsx's variant pattern (handoff D5). */
  variant: 'row' | 'card'
}

function currencySymbol(currency: string): string {
  return CURRENCIES.find((c) => c.value === currency)?.symbol ?? currency
}

function formatMonthly(amount: number, currency: string): string {
  return `${Math.round(amount).toLocaleString()} ${currencySymbol(currency)}`
}

function BankLogo({ logo, name }: { logo: string | null; name: string }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element -- external/manually-seeded bank logo paths, not part of next/image's optimized domain list
    return <img src={logo} alt={name} className="w-10 h-10 rounded object-contain flex-shrink-0 bg-gray-50" />
  }
  return (
    <div
      className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-lg flex-shrink-0"
      aria-hidden="true"
    >
      <Landmark className="w-5 h-5 text-gray-400" />
    </div>
  )
}

function StaleBadge() {
  return (
    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-md inline-flex items-center gap-1">
      ⚠️ May be outdated
    </span>
  )
}

function DownLtv({ minDownPct, maxLtv }: { minDownPct: number | null; maxLtv: number | null }) {
  if (minDownPct == null && maxLtv == null) return <span className="text-gray-400">—</span>
  return (
    <span>
      {minDownPct != null ? `${minDownPct}% down` : '—'}
      {maxLtv != null ? ` / ${maxLtv}% LTV` : ''}
    </span>
  )
}

export default function RateRow({ offer, filters, variant }: RateRowProps) {
  const monthly = resolveMonthlyPayment(offer, filters)
  const updatedLabel = formatRateDate(offer.updatedAt)

  if (variant === 'row') {
    return (
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100">
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <BankLogo logo={offer.logo} name={offer.bankName} />
            <span className="text-sm font-medium text-gray-900">{offer.bankName}</span>
          </div>
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <span className="text-xs text-gray-400 font-normal">from </span>
          <span className="text-lg font-semibold text-gray-900">{offer.ratePct}%</span>
        </td>
        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{loanTypeLabel(offer.loanType)}</td>
        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
          {offer.termMin}–{offer.termMax} yr
        </td>
        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
          <DownLtv minDownPct={offer.minDownPct} maxLtv={offer.maxLtv} />
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <span className="text-sm font-medium text-gray-900">{formatMonthly(monthly, offer.currency)}</span>
          <span className="text-gray-500 font-normal">/mo</span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="text-gray-700">{updatedLabel}</div>
          {offer.stale && <div className="mt-1">{<StaleBadge />}</div>}
        </td>
        <td className="px-3 py-2">
          <a
            href="#preapproval"
            aria-label={`Apply to ${offer.bankName}`}
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Apply
          </a>
        </td>
      </tr>
    )
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BankLogo logo={offer.logo} name={offer.bankName} />
          <h3 className="text-sm font-medium text-gray-900 truncate">{offer.bankName}</h3>
        </div>
        <div className="text-right whitespace-nowrap">
          <span className="text-xs text-gray-400 font-normal">from </span>
          <span className="text-lg font-semibold text-gray-900">{offer.ratePct}%</span>
        </div>
      </div>
      <p className="text-sm text-gray-700 mt-2">
        {loanTypeLabel(offer.loanType)} · {offer.termMin}–{offer.termMax} yr
      </p>
      <p className="text-sm text-gray-700 mt-0.5">
        <DownLtv minDownPct={offer.minDownPct} maxLtv={offer.maxLtv} />
      </p>
      <p className="text-sm font-medium text-gray-900 mt-1">
        ~{formatMonthly(monthly, offer.currency)}
        <span className="text-gray-500 font-normal">/mo</span>
      </p>
      <p className={cn('text-xs mt-1 flex items-center gap-2 flex-wrap', offer.stale ? 'text-amber-700' : 'text-gray-500')}>
        <span>Updated {updatedLabel}</span>
        {offer.stale && <StaleBadge />}
      </p>
      <a
        href="#preapproval"
        aria-label={`Apply to ${offer.bankName}`}
        className="mt-3 inline-flex w-full items-center justify-center h-9 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Apply
      </a>
    </div>
  )
}
