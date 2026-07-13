interface CompositionBarProps {
  /** Loan principal (home price − down payment). */
  principal: number
  /** Total interest paid over the life of the loan. */
  interest: number
}

/**
 * Two-segment horizontal bar showing principal-vs-interest composition of
 * the total loan cost. Stands in for the generic spec's pie chart — no
 * charting library is installed and the task explicitly excludes adding new
 * dependencies for one page (see docs/design/13-mortgage-calc-handoff.md D3).
 * Communicates the split via adjacent legend text, never color alone.
 */
export default function CompositionBar({ principal, interest }: CompositionBarProps) {
  const total = principal + interest
  const principalPct = total > 0 ? (principal / total) * 100 : 0
  const interestPct = total > 0 ? 100 - principalPct : 0

  return (
    <div>
      <div
        role="img"
        aria-label={`Loan composition: ${Math.round(principalPct)}% principal, ${Math.round(interestPct)}% interest`}
        className="h-3 rounded-full overflow-hidden flex w-full bg-gray-100"
      >
        <div className="bg-primary" style={{ width: `${principalPct}%` }} />
        <div className="bg-amber-400" style={{ width: `${interestPct}%` }} />
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" aria-hidden="true" />
          Principal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" aria-hidden="true" />
          Interest
        </span>
      </div>
    </div>
  )
}
