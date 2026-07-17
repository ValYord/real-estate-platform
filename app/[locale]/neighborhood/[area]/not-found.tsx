import { MapPin, Search } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import Button from '@/components/ui/Button'

/**
 * 404 for an unregistered `/neighborhood/[area]` slug (product doc §4 "404
 * (bad area)"). Reached both via `dynamicParams = false` (any slug not
 * returned by `generateStaticParams` 404s automatically) and the explicit
 * `notFound()` call in `page.tsx` for the aggregate-fetch-failed case.
 * Built from `components/ui` — unlike some legacy 404s elsewhere in this
 * codebase, this is new code with no raw-Tailwind markup to preserve.
 */
export default function NeighborhoodNotFound() {
  return (
    <main className="max-w-xl mx-auto px-4 py-24 flex flex-col items-center text-center">
      <div className="w-32 h-32 rounded-full bg-neutral-100 flex items-center justify-center mb-8" aria-hidden="true">
        <MapPin className="w-14 h-14 text-muted" />
      </div>

      <h1 className="text-2xl font-semibold text-text mb-3">This area was not found</h1>
      <p className="text-muted mb-8">
        We don&apos;t have market data for this neighborhood yet. Try searching instead.
      </p>

      <Link href="/search">
        <Button variant="primary" size="lg">
          <Search className="w-4 h-4" aria-hidden="true" />
          Back to search
        </Button>
      </Link>
    </main>
  )
}
