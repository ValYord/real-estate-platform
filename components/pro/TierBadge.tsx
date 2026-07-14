import Badge from '@/components/ui/Badge'
import type { PlanTier } from '@/lib/plans/types'

interface TierBadgeProps {
  tier: PlanTier
}

/**
 * Small tier pill for the Pro Dashboard topbar, built on the shared `Badge`
 * primitive (docs/design/18-pro-dashboard-handoff.md §2.1). Renders nothing
 * for the `free` tier — same convention `AgentHeader.tsx` uses (`agent.tier
 * !== 'free'` gates the badge), since "Free" isn't a plan worth badging.
 *
 * Maps onto the two documented brand tokens rather than `AgentHeader.tsx`'s
 * violet/amber `TIER_STYLES` (violet has no token in `app/globals.css`'s
 * `@theme` block): Pro → `variant="primary"` (deep blue, base brand tier),
 * Premium → `variant="accent"` (amber, the highlighted upsell tier).
 */
export default function TierBadge({ tier }: TierBadgeProps) {
  if (tier === 'free') return null

  return (
    <Badge variant={tier === 'premium' ? 'accent' : 'primary'} className="h-6 font-semibold capitalize">
      {tier}
    </Badge>
  )
}
