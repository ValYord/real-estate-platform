import { Link } from '@/i18n/navigation'
import { Home, Users } from 'lucide-react'

/**
 * Custom 404 page for the agent profile route (docs/en/pages/10 §4 "404 / not found").
 */
export default function AgentNotFound() {
  return (
    <main className="max-w-xl mx-auto px-4 py-24 flex flex-col items-center text-center">
      <div
        className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mb-8"
        aria-hidden="true"
      >
        <Users className="w-14 h-14 text-gray-300" />
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-3">This profile was not found</h1>
      <p className="text-gray-500 mb-8">
        The agent you are looking for may have moved or the link is incorrect.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/agents"
          className="flex items-center justify-center gap-2 h-12 px-6 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Users className="w-4 h-4" aria-hidden="true" />
          Find an Agent
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
