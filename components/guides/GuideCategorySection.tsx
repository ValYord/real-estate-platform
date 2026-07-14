import type { GuideCardData } from '@/lib/guides/types'
import { GuideCard } from './GuideCard'

interface GuideCategorySectionProps {
  title: string
  guides: GuideCardData[]
}

/**
 * A thematic hub section (e.g. "For buyers"). Renders nothing at all —
 * not even the heading — when there are no guides in this category (doc
 * §3.4: "the entire section is hidden, no empty heading shown").
 */
export function GuideCategorySection({ title, guides }: GuideCategorySectionProps) {
  if (guides.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold border-t border-gray-200 pt-6 text-gray-900">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
        {guides.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} />
        ))}
      </div>
    </section>
  )
}
