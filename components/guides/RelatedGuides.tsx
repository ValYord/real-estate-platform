import type { GuideCardData } from '@/lib/guides/types'
import { GuideCard } from './GuideCard'

interface RelatedGuidesProps {
  guides: GuideCardData[]
}

/**
 * "Related guides" block (doc §3.12) — same category, most recently updated.
 * Data is fetched by the page's own direct Supabase query and passed in as
 * plain props (no client-side React Query — see
 * docs/design/16-guides-handoff.md D6).
 */
export function RelatedGuides({ guides }: RelatedGuidesProps) {
  if (guides.length === 0) return null

  return (
    <section aria-labelledby="related-guides-heading" className="mt-10">
      <h2 id="related-guides-heading" className="text-xl font-semibold mt-10 mb-4 text-gray-900">
        Related guides
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {guides.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} />
        ))}
      </div>
    </section>
  )
}
