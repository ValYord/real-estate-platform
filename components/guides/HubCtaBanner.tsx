import { Link } from '@/i18n/navigation'

interface HubCtaBannerProps {
  title?: string
  subtitle?: string
}

/**
 * Bottom CTA banner, reused on both the hub (doc §3.6, "Not sure where to
 * start?") and the guide page's end-of-article CTA (doc §3.12, "Ready for
 * the next step") — same shell, swappable copy via props.
 *
 * The design doc specifies "Talk to an agent" → `/agents`, but no `/agents`
 * directory page exists anywhere in this codebase yet (`/agent/[slug]` is a
 * per-agent profile only — verified via `find app -iname "*agent*"`).
 * Linking to it here would violate the acceptance criterion "no placeholder
 * 404 links", so this CTA instead points at the two tool routes that are
 * confirmed to exist (`/search`, `/mortgage-calculators`) — the same
 * reuse-only constraint already applied to the in-body tool CTAs.
 */
export function HubCtaBanner({
  title = 'Not sure where to start?',
  subtitle = 'Browse available properties or estimate your monthly mortgage payment.',
}: HubCtaBannerProps) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mt-10">
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      <div className="flex gap-3 flex-shrink-0">
        <Link
          href="/search"
          className="inline-flex items-center h-11 px-5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Search properties
        </Link>
        <Link
          href="/mortgage-calculators"
          className="inline-flex items-center h-11 px-5 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Calculate my mortgage
        </Link>
      </div>
    </div>
  )
}
