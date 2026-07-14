import { describe, expect, it } from 'vitest'
import { calculateMonthlyPayment } from '@/lib/mortgage/calculations'
import { resolveMonthlyPayment } from '@/lib/mortgage/rates/calc'
import { DEFAULT_LOAN_AMOUNT_BY_CURRENCY } from '@/lib/mortgage/rates/constants'

const amdRow = { currency: 'AMD', ratePct: 11.9, termMin: 15, termMax: 20 }
const rubRow = { currency: 'RUB', ratePct: 16.5, termMin: 15, termMax: 30 }

describe('resolveMonthlyPayment', () => {
  it('delegates to calculateMonthlyPayment with an explicit amount/term (no reimplementation)', () => {
    const result = resolveMonthlyPayment(amdRow, { amount: 40_000_000, term: 20 })
    expect(result).toBeCloseTo(calculateMonthlyPayment(40_000_000, 11.9, 20), 6)
  })

  it('falls back to DEFAULT_LOAN_AMOUNT_BY_CURRENCY and termMax when filters are empty (AMD row)', () => {
    const result = resolveMonthlyPayment(amdRow, {})
    const expected = calculateMonthlyPayment(DEFAULT_LOAN_AMOUNT_BY_CURRENCY.AMD, 11.9, 20)
    expect(result).toBeCloseTo(expected, 6)
  })

  it('falls back to DEFAULT_LOAN_AMOUNT_BY_CURRENCY and termMax when filters are empty (RUB row — multi-currency default, D11)', () => {
    const result = resolveMonthlyPayment(rubRow, {})
    const expected = calculateMonthlyPayment(DEFAULT_LOAN_AMOUNT_BY_CURRENCY.RUB, 16.5, 30)
    expect(result).toBeCloseTo(expected, 6)
  })

  it('prefers row.termMax over row.termMin when no filter term is set (AMD/RUB fallback tests above already assert this — termMin ≠ termMax in both fixtures)', () => {
    expect(amdRow.termMax).not.toBe(amdRow.termMin)
    const result = resolveMonthlyPayment(amdRow, {})
    const usingTermMin = calculateMonthlyPayment(DEFAULT_LOAN_AMOUNT_BY_CURRENCY.AMD, 11.9, amdRow.termMin)
    expect(result).not.toBeCloseTo(usingTermMin, 6)
  })

  it('uses the explicit filter amount regardless of the row currency (D11 — one global amount applies across all rows)', () => {
    const result = resolveMonthlyPayment(rubRow, { amount: 5_000_000, term: 15 })
    expect(result).toBeCloseTo(calculateMonthlyPayment(5_000_000, 16.5, 15), 6)
  })
})
