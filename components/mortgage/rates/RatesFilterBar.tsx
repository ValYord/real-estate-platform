'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { COUNTRIES, LOAN_TYPES } from '@/lib/mortgage/rates/constants'
import { CURRENCIES, TERM_PRESETS } from '@/lib/mortgage/constants'
import { ratesFilterToParams, type RatesFilter } from '@/lib/mortgage/rates/schemas'

interface RatesFilterBarProps {
  values: RatesFilter
}

/**
 * Country/Currency/Loan type/Term/Amount filter bar. `[Apply]` syncs the URL
 * query (the single source of truth, D6); `[Clear]` resets to the bare
 * route. No down-payment field (D10 — not in the task brief's field list).
 */
export default function RatesFilterBar({ values }: RatesFilterBarProps) {
  const router = useRouter()
  const [country, setCountry] = useState(values.country ?? '')
  const [currency, setCurrency] = useState(values.currency ?? '')
  const [type, setType] = useState(values.type ?? '')
  const [term, setTerm] = useState(values.term !== undefined ? String(values.term) : '')
  const [amount, setAmount] = useState(values.amount !== undefined ? String(values.amount) : '')

  const navigateTo = (params: URLSearchParams) => {
    const qs = params.toString()
    const href = qs ? `/mortgage/rates?${qs}` : '/mortgage/rates'
    router.push(href as Parameters<typeof router.push>[0])
  }

  const handleApply = () => {
    const params = ratesFilterToParams({
      country: country || undefined,
      currency: (currency || undefined) as RatesFilter['currency'],
      type: (type || undefined) as RatesFilter['type'],
      term: term ? Number(term) : undefined,
      amount: amount ? Number(amount) : undefined,
    })
    navigateTo(params)
  }

  const handleClear = () => {
    setCountry('')
    setCurrency('')
    setType('')
    setTerm('')
    setAmount('')
    navigateTo(new URLSearchParams())
  }

  const fieldClass =
    'h-11 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const labelClass = 'text-xs font-medium text-gray-700 mb-1 block'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label htmlFor="rates-country" className={labelClass}>
          Country
        </label>
        <select
          id="rates-country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={fieldClass}
        >
          <option value="">All countries</option>
          {COUNTRIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="rates-currency" className={labelClass}>
          Currency
        </label>
        <select
          id="rates-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className={fieldClass}
        >
          <option value="">Any currency</option>
          {CURRENCIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="rates-type" className={labelClass}>
          Loan type
        </label>
        <select
          id="rates-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={fieldClass}
        >
          <option value="">Any type</option>
          {LOAN_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="rates-term" className={labelClass}>
          Term
        </label>
        <select
          id="rates-term"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className={fieldClass}
        >
          <option value="">Any term</option>
          {TERM_PRESETS.map((t) => (
            <option key={t} value={t}>
              {t} yr
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="rates-amount" className={labelClass}>
          Loan amount
        </label>
        <input
          id="rates-amount"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="e.g. 40,000,000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`${fieldClass} w-40`}
        />
      </div>

      <div className="flex gap-2 ml-auto">
        <button
          type="button"
          onClick={handleClear}
          className="h-11 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="h-11 px-5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  )
}
