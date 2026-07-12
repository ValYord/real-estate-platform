/**
 * Pure, currency-agnostic mortgage math for the Monthly Payment calculator
 * (Page 13 MVP — see docs/design/13-mortgage-calc-handoff.md §6).
 *
 * All functions operate on plain numbers; currency is a display-layer
 * concern handled by the calling component. No I/O, no React — safe to
 * unit-test directly and to call on every keystroke (debounce is unnecessary
 * without a chart to throttle, per handoff D3).
 */

/** One row of the annual amortization summary table. */
export interface AnnualScheduleRow {
  /** 1-indexed year of the loan term. */
  year: number
  /** Total principal paid down during this year. */
  principalPaid: number
  /** Total interest paid during this year. */
  interestPaid: number
  /** Remaining loan balance at the end of this year (never negative). */
  balance: number
}

export interface TotalsResult {
  /** Total interest paid over the life of the loan (M * n - principal). */
  totalInterest: number
  /** Total amount paid: down payment + all monthly payments. */
  totalCost: number
}

/**
 * Standard annuity (PMT) formula for a fixed-rate, fully-amortizing loan.
 *
 * ```
 * r = annualRatePct / 12 / 100          (monthly rate)
 * n = termYears * 12                    (number of payments)
 * M = P * r * (1+r)^n / ((1+r)^n - 1)
 * if r = 0 → M = P / n                  (linear, division-by-zero guard)
 * ```
 *
 * @param principal   Loan amount (home price − down payment). Must be > 0.
 * @param annualRatePct  Annual interest rate as a percentage (e.g. 13.5 for 13.5%).
 * @param termYears   Loan term in whole years. Must be > 0.
 * @returns Monthly payment amount. Returns 0 for non-positive principal/term
 *          (defensive guard — callers should validate inputs before this).
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRatePct: number,
  termYears: number,
): number {
  const n = Math.round(termYears * 12)
  if (!(principal > 0) || n <= 0) return 0

  const r = annualRatePct / 12 / 100
  if (r === 0) return principal / n

  const factor = Math.pow(1 + r, n)
  return (principal * r * factor) / (factor - 1)
}

/**
 * Derives total interest and total cost from a known monthly payment.
 *
 * ```
 * totalCost     = downPayment + M * n
 * totalInterest = M * n - principal
 * ```
 */
export function calculateTotals(
  principal: number,
  downPayment: number,
  monthlyPayment: number,
  termYears: number,
): TotalsResult {
  const n = Math.round(termYears * 12)
  const totalPaid = monthlyPayment * n
  return {
    totalInterest: totalPaid - principal,
    totalCost: downPayment + totalPaid,
  }
}

/**
 * Builds the annual amortization summary (one row per year of the term),
 * walking the standard month-by-month recurrence:
 *
 * ```
 * interestThisMonth  = balance * r
 * principalThisMonth = M - interestThisMonth
 * balance -= principalThisMonth
 * ```
 *
 * Handles the 0%-rate edge case (interest column is always 0, principal is a
 * flat `principal / n` per month) and clamps the final year's balance to
 * exactly 0 to avoid floating-point drift (e.g. `-0.0000003`).
 */
export function buildAnnualSchedule(
  principal: number,
  annualRatePct: number,
  termYears: number,
): AnnualScheduleRow[] {
  const n = Math.round(termYears * 12)
  if (!(principal > 0) || n <= 0) return []

  const r = annualRatePct / 12 / 100
  const monthlyPayment = calculateMonthlyPayment(principal, annualRatePct, termYears)
  const wholeYears = Math.floor(n / 12)
  const remainderMonths = n - wholeYears * 12
  const totalYears = wholeYears + (remainderMonths > 0 ? 1 : 0)

  const rows: AnnualScheduleRow[] = []
  let balance = principal

  for (let year = 1; year <= totalYears; year++) {
    const monthsThisYear = year <= wholeYears ? 12 : remainderMonths
    let yearPrincipal = 0
    let yearInterest = 0

    for (let m = 0; m < monthsThisYear; m++) {
      const interestThisMonth = r === 0 ? 0 : balance * r
      let principalThisMonth = monthlyPayment - interestThisMonth
      // Guard the final month against float overshoot past the remaining balance.
      if (principalThisMonth > balance) principalThisMonth = balance
      balance -= principalThisMonth
      yearPrincipal += principalThisMonth
      yearInterest += interestThisMonth
    }

    const isFinalYear = year === totalYears
    rows.push({
      year,
      principalPaid: yearPrincipal,
      interestPaid: yearInterest,
      // Clamp the last row to exactly 0 — never a stray negative/positive residue.
      balance: isFinalYear ? 0 : Math.max(balance, 0),
    })
  }

  return rows
}
