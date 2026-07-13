import { Link } from '@/i18n/navigation'
import { Home as HomeIcon, Search } from 'lucide-react'

/** Custom 404 for an unknown/expired estimate hash. */
export default function HomeValueSnapshotNotFound() {
  return (
    <main className="max-w-xl mx-auto px-4 py-24 flex flex-col items-center text-center">
      <div
        className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mb-8"
        aria-hidden="true"
      >
        <Search className="w-14 h-14 text-gray-300" />
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-3">This estimate was not found</h1>
      <p className="text-gray-500 mb-8">
        The link may be incorrect, or this estimate is no longer available.
      </p>

      <Link
        href="/home-value"
        className="flex items-center justify-center gap-2 h-12 px-6 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <HomeIcon className="w-4 h-4" aria-hidden="true" />
        Get your own estimate
      </Link>
    </main>
  )
}
