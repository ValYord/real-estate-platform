import { describe, expect, it } from 'vitest'
import {
  buildAnnualSchedule,
  calculateMonthlyPayment,
  calculateTotals,
} from '@/lib/mortgage/calculations'

describe('calculateMonthlyPayment (PMT / annuity formula)', () => {
  it('matches a hand/spreadsheet-verified value: 40,000,000 @ 12% / 20yr', () => {
    // price 50,000,000 - down 10,000,000 = principal 40,000,000
    const monthly = calculateMonthlyPayment(40_000_000, 12, 20)
    expect(monthly).toBeCloseTo(440_434.45, 1)
  })

  it('matches a second representative set: 100,000 @ 5.5% / 30yr', () => {
    const monthly = calculateMonthlyPayment(100_000, 5.5, 30)
    expect(monthly).toBeCloseTo(567.79, 1)
  })

  it('0% rate edge case: linear division, no NaN/Infinity', () => {
    const monthly = calculateMonthlyPayment(120_000, 0, 10)
    expect(monthly).toBe(1_000) // 120,000 / (10 * 12)
    expect(Number.isFinite(monthly)).toBe(true)
  })

  it('minimum term edge case: termYears = 1 (n = 12)', () => {
    const monthly = calculateMonthlyPayment(12_000, 6, 1)
    expect(monthly).toBeCloseTo(1032.8, 1)
    expect(Number.isFinite(monthly)).toBe(true)
  })

  it('returns 0 for non-positive principal (defensive guard)', () => {
    expect(calculateMonthlyPayment(0, 10, 20)).toBe(0)
    expect(calculateMonthlyPayment(-5, 10, 20)).toBe(0)
  })

  it('returns 0 for non-positive term (defensive guard)', () => {
    expect(calculateMonthlyPayment(100_000, 10, 0)).toBe(0)
  })
})

describe('calculateTotals', () => {
  it('derives total interest and total cost from the monthly payment', () => {
    const principal = 40_000_000
    const downPayment = 10_000_000
    const termYears = 20
    const monthly = calculateMonthlyPayment(principal, 12, termYears)

    const { totalInterest, totalCost } = calculateTotals(principal, downPayment, monthly, termYears)

    const n = termYears * 12
    expect(totalInterest).toBeCloseTo(monthly * n - principal, 6)
    expect(totalCost).toBeCloseTo(downPayment + monthly * n, 6)
    // Sanity: for a 12%/20yr loan, total interest should exceed principal.
    expect(totalInterest).toBeGreaterThan(principal)
  })

  it('0% rate: total interest is 0, total cost equals down payment + principal', () => {
    const principal = 120_000
    const downPayment = 30_000
    const termYears = 10
    const monthly = calculateMonthlyPayment(principal, 0, termYears)

    const { totalInterest, totalCost } = calculateTotals(principal, downPayment, monthly, termYears)

    expect(totalInterest).toBeCloseTo(0, 6)
    expect(totalCost).toBeCloseTo(downPayment + principal, 6)
  })
})

describe('buildAnnualSchedule', () => {
  it('final year balance is exactly 0 (no floating-point residue)', () => {
    const schedule = buildAnnualSchedule(40_000_000, 12, 20)
    expect(schedule).toHaveLength(20)
    expect(schedule[schedule.length - 1].balance).toBe(0)
  })

  it('each year sums principal + interest to 12 * monthly payment', () => {
    const principal = 40_000_000
    const ratePct = 12
    const termYears = 20
    const monthly = calculateMonthlyPayment(principal, ratePct, termYears)
    const schedule = buildAnnualSchedule(principal, ratePct, termYears)

    for (const row of schedule) {
      expect(row.principalPaid + row.interestPaid).toBeCloseTo(12 * monthly, 4)
    }
  })

  it('balances are strictly decreasing year over year', () => {
    const schedule = buildAnnualSchedule(40_000_000, 12, 20)
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].balance).toBeLessThan(schedule[i - 1].balance)
    }
  })

  it('0% rate: interest column is always 0, principal is a flat P/n per month', () => {
    const principal = 120_000
    const termYears = 10
    const schedule = buildAnnualSchedule(principal, 0, termYears)

    expect(schedule).toHaveLength(10)
    for (const row of schedule) {
      expect(row.interestPaid).toBe(0)
      expect(row.principalPaid).toBeCloseTo(principal / termYears, 6)
    }
    expect(schedule[schedule.length - 1].balance).toBe(0)
  })

  it('minimum term edge case: termYears = 1 produces a single row', () => {
    const schedule = buildAnnualSchedule(12_000, 6, 1)
    expect(schedule).toHaveLength(1)
    expect(schedule[0].year).toBe(1)
    expect(schedule[0].balance).toBe(0)
  })

  it('returns an empty schedule for non-positive principal', () => {
    expect(buildAnnualSchedule(0, 10, 20)).toEqual([])
  })
})
