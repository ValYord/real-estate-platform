import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { favoriteSortSchema } from '@/lib/favorites/schemas'
import type { FavoriteSort } from '@/lib/favorites/types'
import FavoritesLoginWall from '@/components/favorites/FavoritesLoginWall'
import FavoritesToolbar from '@/components/favorites/FavoritesToolbar'
import FavoritesGrid from '@/components/favorites/FavoritesGrid'

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Favorites | RE Platform',
  // Personal, auth-gated page — no indexing needed
  robots: { index: false, follow: false },
  alternates: {
    // Canonical strips the ?sort= query param
    canonical: '/favorites',
  },
}

// ── Page ──────────────────────────────────────────────────────────────────────

type FavoritesPageSearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: FavoritesPageSearchParams
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth check — show login wall (not a redirect) for guests
  if (!user) {
    return <FavoritesLoginWall />
  }

  // Parse sort from URL
  const sp = await searchParams
  const rawSort = typeof sp.sort === 'string' ? sp.sort : undefined
  const sort: FavoriteSort = favoriteSortSchema.catch('recent').parse(rawSort)

  // Fetch initial favorites count for the heading (lightweight — head:true count only)
  const { count: favoritesCount } = await supabase
    .from('favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const count = favoritesCount ?? 0

  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        {/* Desktop: Home › Favorites */}
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
            <span className="text-gray-900 font-medium">Favorites</span>
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Favorites
          {count > 0 && (
            <span className="text-base text-gray-500 font-normal ml-2">
              {count} {count === 1 ? 'property' : 'properties'}
            </span>
          )}
        </h1>
        {count > 0 && (
          <p className="text-sm text-gray-500 mt-1">Your saved properties</p>
        )}
      </div>

      {/* Toolbar — sticky on desktop */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur border-b border-gray-100 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <FavoritesToolbar currentSort={sort} />
      </div>

      {/* Grid — client component with React Query + infinite scroll */}
      <Suspense
        fallback={
          <ul
            aria-label="Loading favorites"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-2"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <li
                key={i}
                className="bg-gray-100 animate-pulse rounded-xl h-72"
                aria-hidden="true"
              />
            ))}
          </ul>
        }
      >
        <FavoritesGrid />
      </Suspense>
    </main>
  )
}
