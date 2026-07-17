import type { ReactNode } from 'react'

/**
 * Legal disclaimer banner (docs/en/pages/19-landlord.md §2 design tokens:
 * "Disclaimer | text-xs text-gray-400 bg-amber-50 border border-amber-200
 * rounded p-3") — reused verbatim on `/landlord/screening` and
 * `/landlord/lease` (§3.3, §3.4). Plain presentational component, same
 * shape as components/home-value/HomeValueDisclaimer.tsx and
 * components/mortgage/rates/RatesDisclaimer.tsx, but those two predate
 * DESIGN_SYSTEM.md's tokens-only rule and use the raw amber/gray classes
 * verbatim — this component instead uses the tokenized translation
 * (`text-muted`, `bg-warning/10`, `border-warning/30`) per that rule, same
 * intent as the spec's own swatch.
 */
export default function DisclaimerBanner({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="text-xs text-muted leading-relaxed bg-warning/10 border border-warning/30 rounded-md p-4 space-y-1">
      {children}
    </div>
  )
}
