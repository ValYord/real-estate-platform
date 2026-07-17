import FadeIn from '@/components/motion/FadeIn'
import SlideIn from '@/components/motion/SlideIn'
import DisclaimerBanner from './DisclaimerBanner'
import ApplicationLinkGenerator from './ApplicationLinkGenerator'
import ApplicationsInbox from './ApplicationsInbox'
import type { LandlordUnitOption, TenantApplicationSummary } from '@/lib/landlord/types'

/**
 * `/landlord/screening` (§3.3). Server Component wrapper — the two
 * interactive pieces (link generator, inbox) are client components; this
 * shell just lays them out and carries the always-visible disclaimer copy.
 */
export default function ScreeningDashboard({
  units,
  initialApplications,
}: {
  units: LandlordUnitOption[]
  initialApplications: TenantApplicationSummary[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Screen tenants</h1>
        <p className="text-muted mt-1">Application + self-declaration, reviewed manually — no automatic background check.</p>
      </div>

      <FadeIn>
        <DisclaimerBanner>
          <p>
            Background/credit checks are limited or prohibited in many countries without consent. In
            Armenia/CIS the full credit-check infrastructure is limited, so screening is
            application + self-declaration + manual review by you — no automatic background pull.
          </p>
          <p>Follow local law; discrimination is prohibited; screening requires the tenant&apos;s consent.</p>
        </DisclaimerBanner>
      </FadeIn>

      <SlideIn direction="up">
        <ApplicationLinkGenerator units={units} />
      </SlideIn>
      <ApplicationsInbox initialItems={initialApplications} units={units} />
    </div>
  )
}
