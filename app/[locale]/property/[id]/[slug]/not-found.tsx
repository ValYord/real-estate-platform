import { Link } from '@/i18n/navigation'
import { Home, Search } from 'lucide-react'

/**
 * Custom 404 page for the property detail route.
 * Shown when notFound() is called from the page.
 */
export default function PropertyNotFound() {
  return (
    <main className="max-w-xl mx-auto px-4 py-24 flex flex-col items-center text-center">
      {/* Illustration */}
      <div
        className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mb-8"
        aria-hidden="true"
      >
        <Search className="w-14 h-14 text-gray-300" />
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-3">Property not found</h1>
      <p className="text-gray-500 mb-8">
        This listing may have been removed or the link you followed is incorrect.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/search"
          className="flex items-center justify-center gap-2 h-12 px-6 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          Back to search
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 h-12 px-6 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          Home page
        </Link>
      </div>
    </main>
  )
}
