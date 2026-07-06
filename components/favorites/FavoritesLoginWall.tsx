'use client'

import { Link } from '@/i18n/navigation'
import { Heart } from 'lucide-react'

/**
 * Shown to unauthenticated guests who navigate directly to /favorites.
 * NOT a redirect — the login wall is rendered in place so the URL stays clean.
 */
export default function FavoritesLoginWall() {
  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <span className="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full">
            <Heart className="w-8 h-8 text-red-400" aria-hidden="true" />
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-gray-900">
            Sign in to see your favorites
          </h1>
          <p className="text-sm text-gray-500">
            Save properties with ♡ and find them all here.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/login?next=/favorites"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  )
}
