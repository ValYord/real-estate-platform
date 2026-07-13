'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { ExternalLink } from 'lucide-react'

interface MortgageMiniCalcProps {
  price: number
  currency: string
}

const CURRENCY_SYMBOL: Record<string, string> = {
  AMD: '֏',
  USD: '$',
  EUR: '€',
  RUB: '₽',
}

function calcMonthly(price: number, downPct: number, years: number, rate: number): number {
  const principal = price * (1 - downPct / 100)
  const monthlyRate = rate / 100 / 12
  const n = years * 12
  if (monthlyRate === 0) return principal / n
  return (principal * (monthlyRate * Math.pow(1 + monthlyRate, n))) / (Math.pow(1 + monthlyRate, n) - 1)
}

/**
 * Mortgage mini-calculator card.
 * All state is local — no API calls.
 */
export default function MortgageMiniCalc({ price, currency }: MortgageMiniCalcProps) {
  const [downPct, setDownPct] = useState(20)
  const [years, setYears] = useState(10)
  const [rate, setRate] = useState(14)

  const monthly = calcMonthly(price, downPct, years, rate)
  const symbol = CURRENCY_SYMBOL[currency] ?? currency

  const formatAmount = (n: number) => {
    if (currency === 'AMD') {
      return `${Math.round(n / 1000).toLocaleString()}K ${symbol}`
    }
    return `${symbol}${Math.round(n).toLocaleString()}`
  }

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Mortgage calculator</h2>
      <div className="bg-gray-50 rounded-xl p-5 space-y-5">
        {/* Monthly payment */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Approximate monthly payment</p>
          <p className="text-3xl font-bold text-primary">~{formatAmount(monthly)}</p>
        </div>

        {/* Down payment */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1.5">
            <label htmlFor="mortgage-down" className="font-medium">
              Down payment
            </label>
            <span>{downPct}%</span>
          </div>
          <input
            id="mortgage-down"
            type="range"
            min={10}
            max={90}
            step={5}
            value={downPct}
            onChange={(e) => setDownPct(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Down payment percentage"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>10%</span>
            <span>90%</span>
          </div>
        </div>

        {/* Term */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1.5">
            <label htmlFor="mortgage-years" className="font-medium">
              Loan term
            </label>
            <span>{years} yr</span>
          </div>
          <input
            id="mortgage-years"
            type="range"
            min={1}
            max={30}
            step={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Loan term in years"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>1 yr</span>
            <span>30 yr</span>
          </div>
        </div>

        {/* Rate */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1.5">
            <label htmlFor="mortgage-rate" className="font-medium">
              Interest rate
            </label>
            <span>{rate}%</span>
          </div>
          <input
            id="mortgage-rate"
            type="range"
            min={1}
            max={30}
            step={0.5}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Interest rate percentage"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>1%</span>
            <span>30%</span>
          </div>
        </div>

        {/* CTA to full calculator */}
        <Link
          href={`/mortgage-calculators?price=${price}&currency=${currency}`}
          className="flex items-center justify-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Detailed calculator
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
