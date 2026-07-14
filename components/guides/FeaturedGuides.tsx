import type { GuideCardData } from '@/lib/guides/types'
import { GuideCard } from './GuideCard'

interface FeaturedGuidesProps {
  guides: GuideCardData[]
}

/**
 * "Most popular guides" — 3 large cards. Renders nothing when there is no
 * featured data (defensive; the hub page always tries to backfill to 3).
 *
 * Mobile: horizontal scroll-snap row (plain CSS, no JS carousel).
 */
export function FeaturedGuides({ guides }: FeaturedGuidesProps) {
  if (guides.length === 0) return null

  return (
    <section aria-labelledby="featured-guides-heading" className="mt-8">
      <h2 id="featured-guides-heading" className="text-xl font-semibold text-gray-900 mb-4">
        Most popular guides
      </h2>

      {/* Mobile: horizontal scroll-snap row */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2 sm:hidden">
        {guides.map((guide) => (
          <div key={guide.slug} className="w-64 flex-shrink-0 snap-start">
            <GuideCard guide={guide} featured />
          </div>
        ))}
      </div>

      {/* Desktop / tablet: grid */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-5">
        {guides.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} featured />
        ))}
      </div>
    </section>
  )
}
