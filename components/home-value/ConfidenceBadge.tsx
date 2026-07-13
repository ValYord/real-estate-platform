import type { Confidence } from '@/lib/home-value/types'

const STYLES: Record<Confidence, string> = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

const LABELS: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

/** Confidence indicates by icon/text as well as color (docs §7 — never color alone). */
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-md font-medium ${STYLES[confidence]}`}>
      {LABELS[confidence]}
    </span>
  )
}
