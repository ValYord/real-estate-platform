import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { EstimateFactor } from '@/lib/home-value/types'

const DIRECTION_STYLE = {
  up: 'text-green-600',
  down: 'text-red-500',
  neutral: 'text-gray-400',
} as const

const DIRECTION_ICON = {
  up: ArrowUp,
  down: ArrowDown,
  neutral: Minus,
} as const

/**
 * "Why this estimate" transparency list (docs §3.6). Direction is conveyed
 * by icon + text, not color alone (accessibility §7).
 */
export function ValueFactorsList({ factors }: { factors: EstimateFactor[] }) {
  return (
    <ul className="space-y-2.5">
      {factors.map((factor) => {
        const Icon = DIRECTION_ICON[factor.direction]
        return (
          <li key={factor.key} className="flex items-start gap-2.5 text-sm" title={factor.tooltip}>
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${DIRECTION_STYLE[factor.direction]}`} aria-hidden="true" />
            <span className="text-gray-700">
              {factor.label}
              {factor.weightPct !== 0 && (
                <span className={`ml-1.5 font-medium ${DIRECTION_STYLE[factor.direction]}`}>
                  {factor.weightPct > 0 ? '+' : ''}
                  {factor.weightPct}%
                </span>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
