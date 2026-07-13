/**
 * Legal disclaimer, required at every phase of the tool
 * (docs/en/pages/12-home-value.md §0, §3.3). Plain presentational component
 * — no hooks, no 'use client' — so it can be rendered from both Server
 * Components (Input phase, the read-only snapshot page) and the client
 * Details/Result phases without adding to the client bundle.
 */
export function HomeValueDisclaimer({ className }: { className?: string }) {
  return (
    <p role="note" className={`text-xs text-gray-400 leading-relaxed ${className ?? ''}`}>
      This is an automated estimate based on public data, and does not replace a professional
      appraisal. The actual price may differ.
    </p>
  )
}
