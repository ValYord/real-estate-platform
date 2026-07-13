'use client'

import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import { paymentInputSchema, type PaymentInput } from '@/lib/mortgage/schemas'
import {
  CURRENCIES,
  DEFAULT_DOWN_PAYMENT_PCT,
  DEFAULT_PRICE_BY_CURRENCY,
  DEFAULT_RATE_BY_CURRENCY,
  DEFAULT_TERM_YEARS,
  DOWN_PAYMENT_PCT_MAX,
  DOWN_PAYMENT_PCT_MIN,
  RATE_MAX,
  RATE_MIN,
  TERM_MAX,
  TERM_MIN,
  TERM_PRESETS,
  type CalculatorCurrency,
} from '@/lib/mortgage/constants'
import {
  buildAnnualSchedule,
  calculateMonthlyPayment,
  calculateTotals,
} from '@/lib/mortgage/calculations'
import CompositionBar from '@/components/mortgage/CompositionBar'
import AmortizationTable from '@/components/mortgage/AmortizationTable'

const DEFAULT_CURRENCY: CalculatorCurrency = 'AMD'
const DEFAULT_PRICE = DEFAULT_PRICE_BY_CURRENCY[DEFAULT_CURRENCY]

const defaultValues: PaymentInput = {
  currency: DEFAULT_CURRENCY,
  price: DEFAULT_PRICE,
  downPayment: Math.round((DEFAULT_PRICE * DEFAULT_DOWN_PAYMENT_PCT) / 100),
  ratePct: DEFAULT_RATE_BY_CURRENCY[DEFAULT_CURRENCY],
  termYears: DEFAULT_TERM_YEARS,
}

function isPresetTerm(years: number): boolean {
  return (TERM_PRESETS as readonly number[]).includes(years)
}

/**
 * The Monthly Payment calculator — the single core calculator in scope for
 * this task (see docs/design/13-mortgage-calc-handoff.md). Owns all input
 * state via react-hook-form + zod; renders the two-column input/output
 * layout and computes results with `useMemo` from `lib/mortgage/calculations`.
 * Pure client-side math, no backend calls, no server-side persistence.
 */
export default function MortgagePaymentCalculator() {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentInputSchema),
    mode: 'onChange',
    defaultValues,
  })

  const [showCustomTerm, setShowCustomTerm] = useState(() => !isPresetTerm(DEFAULT_TERM_YEARS))

  const currency = watch('currency')
  const price = Number(watch('price')) || 0
  const downPayment = Number(watch('downPayment')) || 0
  const ratePct = Number(watch('ratePct')) || 0
  const termYears = Number(watch('termYears')) || 0

  const downPaymentPct =
    price > 0 ? Math.min(100, Math.max(0, (downPayment / price) * 100)) : 0

  const symbol = CURRENCIES.find((c) => c.value === currency)?.symbol ?? currency

  function formatAmount(amount: number): string {
    return `${symbol}${Math.round(amount).toLocaleString()}`
  }

  function handleDownPaymentPctChange(pct: number) {
    const amount = Math.round((price * pct) / 100)
    setValue('downPayment', amount, { shouldValidate: true, shouldDirty: true })
  }

  function handleCurrencyChange(next: CalculatorCurrency) {
    setValue('currency', next, { shouldValidate: true })
    // No FX conversion (D2) — only the sample rate resets, price/down payment stay as-typed.
    setValue('ratePct', DEFAULT_RATE_BY_CURRENCY[next], { shouldValidate: true })
  }

  const hasErrors = Object.keys(errors).length > 0

  const results = useMemo(() => {
    if (hasErrors) return null
    const principal = price - downPayment
    const monthly = calculateMonthlyPayment(principal, ratePct, termYears)
    const totals = calculateTotals(principal, downPayment, monthly, termYears)
    const schedule = buildAnnualSchedule(principal, ratePct, termYears)
    return { principal, monthly, schedule, ...totals }
  }, [hasErrors, price, downPayment, ratePct, termYears])

  return (
    <form noValidate onSubmit={(e) => e.preventDefault()} className="lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-8 lg:items-start">
      {/* ── Inputs ── */}
      <div className="space-y-6">
        {/* Home price + currency */}
        <div>
          <label htmlFor="price" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Home price
          </label>
          <div className="flex gap-2">
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <div
                  role="group"
                  aria-label="Currency"
                  className="flex border border-gray-300 rounded-lg overflow-hidden"
                >
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleCurrencyChange(c.value)}
                      aria-pressed={field.value === c.value}
                      className={cn(
                        'px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                        field.value === c.value
                          ? 'bg-primary text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      {c.symbol}
                    </button>
                  ))}
                </div>
              )}
            />
            <input
              id="price"
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              aria-required="true"
              aria-invalid={errors.price ? 'true' : 'false'}
              aria-describedby={errors.price ? 'price-error' : undefined}
              {...register('price')}
              className={cn(
                'h-11 w-full border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.price ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
              )}
            />
          </div>
          {errors.price && (
            <p id="price-error" role="alert" className="text-sm text-red-600 mt-1">
              {errors.price.message}
            </p>
          )}
        </div>

        {/* Down payment — percent slider synced with an amount input */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="downPaymentPct" className="text-sm font-medium text-gray-700">
              Down payment
            </label>
            <span className="text-sm text-gray-500">{Math.round(downPaymentPct)}%</span>
          </div>
          <input
            id="downPaymentPct"
            type="range"
            min={DOWN_PAYMENT_PCT_MIN}
            max={DOWN_PAYMENT_PCT_MAX}
            step={1}
            value={Math.round(downPaymentPct)}
            onChange={(e) => handleDownPaymentPctChange(Number(e.target.value))}
            aria-label="Down payment percent"
            className="h-1.5 accent-primary w-full"
          />
          <div className="mt-2">
            <label htmlFor="downPayment" className="sr-only">
              Down payment amount
            </label>
            <input
              id="downPayment"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              aria-invalid={errors.downPayment ? 'true' : 'false'}
              aria-describedby={errors.downPayment ? 'downPayment-error' : undefined}
              {...register('downPayment')}
              className={cn(
                'h-11 w-full border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.downPayment ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
              )}
            />
          </div>
          {errors.downPayment && (
            <p id="downPayment-error" role="alert" className="text-sm text-red-600 mt-1">
              {errors.downPayment.message}
            </p>
          )}
        </div>

        {/* Interest rate */}
        <div>
          <label htmlFor="ratePct" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Interest rate (annual)
          </label>
          <div className="relative">
            <input
              id="ratePct"
              type="number"
              min={RATE_MIN}
              max={RATE_MAX}
              step="0.1"
              inputMode="decimal"
              aria-invalid={errors.ratePct ? 'true' : 'false'}
              aria-describedby={errors.ratePct ? 'ratePct-error' : undefined}
              {...register('ratePct')}
              className={cn(
                'h-11 w-full border rounded-lg px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.ratePct ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
              )}
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
              aria-hidden="true"
            >
              %
            </span>
          </div>
          {errors.ratePct && (
            <p id="ratePct-error" role="alert" className="text-sm text-red-600 mt-1">
              {errors.ratePct.message}
            </p>
          )}
        </div>

        {/* Term */}
        <div>
          <span id="term-label" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Term
          </span>
          <Controller
            name="termYears"
            control={control}
            render={({ field }) => (
              <>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="term-label">
                  {TERM_PRESETS.map((yrs) => (
                    <button
                      key={yrs}
                      type="button"
                      aria-pressed={!showCustomTerm && field.value === yrs}
                      onClick={() => {
                        field.onChange(yrs)
                        setShowCustomTerm(false)
                      }}
                      className={cn(
                        'h-9 px-3 rounded-full text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        !showCustomTerm && field.value === yrs
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      {yrs} yr
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={showCustomTerm}
                    onClick={() => setShowCustomTerm(true)}
                    className={cn(
                      'h-9 px-3 rounded-full text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      showCustomTerm
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    Custom
                  </button>
                </div>
                {showCustomTerm && (
                  <div className="mt-2">
                    <label htmlFor="termYears" className="sr-only">
                      Custom term in years
                    </label>
                    <input
                      id="termYears"
                      type="number"
                      min={TERM_MIN}
                      max={TERM_MAX}
                      step="1"
                      inputMode="numeric"
                      aria-invalid={errors.termYears ? 'true' : 'false'}
                      aria-describedby={errors.termYears ? 'termYears-error' : undefined}
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className={cn(
                        'h-11 w-40 border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary',
                        errors.termYears ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
                      )}
                    />
                  </div>
                )}
              </>
            )}
          />
          {errors.termYears && (
            <p id="termYears-error" role="alert" className="text-sm text-red-600 mt-1">
              {errors.termYears.message}
            </p>
          )}
        </div>
      </div>

      {/* ── Output ── */}
      <div
        aria-live="polite"
        className="mt-8 lg:mt-0 shadow-sm border border-gray-200 rounded-xl p-5 lg:sticky lg:top-20"
      >
        <p className="text-sm text-gray-500 mb-1">Monthly payment</p>
        <p className="text-3xl font-bold text-gray-900">
          {results ? formatAmount(results.monthly) : '—'}
          <span className="text-base font-normal text-gray-500"> /mo</span>
        </p>

        {results && (
          <div className="mt-4">
            <CompositionBar principal={results.principal} interest={results.totalInterest} />
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100">
            <span className="text-gray-500">Loan amount</span>
            <span className="text-gray-900 font-medium">
              {results ? formatAmount(results.principal) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100">
            <span className="text-gray-500">Total interest</span>
            <span className="text-gray-900 font-medium">
              {results ? formatAmount(results.totalInterest) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm py-1.5">
            <span className="text-gray-500">Total cost</span>
            <span className="text-gray-900 font-medium">
              {results ? formatAmount(results.totalCost) : '—'}
            </span>
          </div>
        </div>

        {results && <AmortizationTable rows={results.schedule} formatAmount={formatAmount} />}
      </div>
    </form>
  )
}
