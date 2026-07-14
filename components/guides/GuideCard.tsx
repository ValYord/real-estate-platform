import Image from 'next/image'
import { BookOpen } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { GuideCardData } from '@/lib/guides/types'

interface GuideCardProps {
  guide: GuideCardData
  /** Larger cover-first layout, used for the "Most popular guides" section. */
  featured?: boolean
}

/**
 * A single guide preview card. Mirrors the shell classes from
 * `components/search/PropertyCard.tsx` (rounded-xl border, hover:shadow-md,
 * whole-card <Link>), minus the client-only favorite/photo-nav bits — this
 * card is a pure server component.
 */
export function GuideCard({ guide, featured = false }: GuideCardProps) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group block bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {featured && (
        <div className="relative h-40 bg-gray-100">
          {guide.coverUrl ? (
            <Image
              src={guide.coverUrl}
              alt={guide.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary/30">
              <BookOpen className="w-10 h-10" aria-hidden="true" />
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        {!featured && (
          <div
            className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3"
            aria-hidden="true"
          >
            <BookOpen className="w-6 h-6" />
          </div>
        )}

        <h3 className="text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
          {guide.title}
        </h3>
        {guide.excerpt && (
          <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{guide.excerpt}</p>
        )}

        <p className="text-xs text-gray-400 mt-2">
          {guide.stepCount > 0 ? `${guide.stepCount} steps · ` : ''}
          {guide.readingTime} min read
        </p>
      </div>
    </Link>
  )
}
