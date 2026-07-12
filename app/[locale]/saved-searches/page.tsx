import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import SavedSearchesLoginWall from '@/components/saved-searches/SavedSearchesLoginWall'
import SavedSearchList from '@/components/saved-searches/SavedSearchList'

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Saved searches | RE Platform',
  // Personal, auth-gated page — no indexing needed
  robots: { index: false, follow: false },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SavedSearchesPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth check — show login wall (not a redirect) for guests, same pattern
  // as app/[locale]/favorites/page.tsx.
  if (!user) {
    return <SavedSearchesLoginWall />
  }

  const { count: savedSearchesCount } = await supabase
    .from('saved_searches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const count = savedSearchesCount ?? 0

  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        {/* Desktop: Home › Saved searches */}
        <ol className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
          <li>
            <Link
              href="/"
              className="hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="select-none">›</li>
          <li>
            <span className="text-gray-900 font-medium">Saved searches</span>
          </li>
        </ol>

        {/* Mobile: ‹ Back */}
        <Link
          href="/"
          className="sm:hidden inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <span aria-hidden="true">‹</span>
          Back
        </Link>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Saved searches
            {count > 0 && (
              <span className="text-base text-gray-500 font-normal ml-2">
                {count} {count === 1 ? 'saved search' : 'saved searches'}
              </span>
            )}
          </h1>
          {count > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Get notified when a new property matches your criteria
            </p>
          )}
        </div>

        {/* Cross-link */}
        <Link
          href="/favorites"
          className="flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
        >
          ♡ Favorites
        </Link>
      </div>

      {/* List — client component with React Query */}
      <Suspense
        fallback={
          <ul aria-label="Loading saved searches" className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="bg-gray-100 animate-pulse rounded-xl h-32" aria-hidden="true" />
            ))}
          </ul>
        }
      >
        <SavedSearchList />
      </Suspense>
    </main>
  )
}
