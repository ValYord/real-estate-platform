import { cn } from '@/lib/utils'

interface PriceDropChipProps {
  /** Decimal fraction, e.g. -0.05 for −5%, +0.03 for +3%. */
  priceChangePct: number
}

/**
 * Renders a compact price-change chip on a FavoriteCard.
 *
 * - Drop (≤ −1%): red chip "🔻 −5%"
 * - Rise (≥ +1%): gray chip "+3%"
 * - Between −1% and +1%: not rendered (caller should check threshold)
 */
export default function PriceDropChip({ priceChangePct }: PriceDropChipProps) {
  const isDrop = priceChangePct <= -0.01
  const absFormatted = `${Math.round(Math.abs(priceChangePct) * 100)}%`

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-md',
        isDrop
          ? 'bg-red-50 text-red-600'
          : 'bg-gray-100 text-gray-500',
      )}
      aria-label={isDrop ? `Price dropped ${absFormatted}` : `Price up ${absFormatted}`}
    >
      {isDrop ? (
        <>
          <span aria-hidden="true">🔻</span>
          &minus;{absFormatted}
        </>
      ) : (
        <>+{absFormatted}</>
      )}
    </span>
  )
}
