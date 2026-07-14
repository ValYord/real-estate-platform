import { cn } from '@/lib/utils'
import type { PlanTier } from '@/lib/plans/types'

/** Verbatim copy of `AgentHeader.tsx`'s `TIER_STYLES` map (handoff D5). */
const TIER_STYLES: Record<'pro' | 'premium', string> = {
  pro: 'bg-violet-100 text-violet-700',
  premium: 'bg-amber-100 text-amber-700',
}

interface TierBadgeProps {
  tier: PlanTier
}

/**
 * Small tier pill for the Pro Dashboard topbar. Renders nothing for the
 * `free` tier — same convention `AgentHeader.tsx` uses (`agent.tier !== 'free'`
 * gates the badge), since "Free" isn't a plan worth badging.
 */
export default function TierBadge({ tier }: TierBadgeProps) {
  if (tier === 'free') return null

  return (
    <span
      className={cn(
        'inline-flex items-center h-6 px-2.5 rounded-full text-xs font-semibold capitalize',
        TIER_STYLES[tier],
      )}
    >
      {tier}
    </span>
  )
}
