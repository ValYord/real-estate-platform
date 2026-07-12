import { Edit, Eye, BarChart2, Star } from 'lucide-react'
import { Link } from '@/i18n/navigation'

/**
 * Owner manage bar — shown instead of the contact card when
 * `agent.user_id == current_user.id`. docs/en/pages/10-agent-profile.md §3.8.
 * Server Component (plain links, no client state needed for the MVP).
 */
export default function AgentOwnerManageBar() {
  return (
    <div className="shadow-sm border border-gray-200 rounded-xl p-5 space-y-3 sticky top-20">
      <p className="text-sm font-semibold text-gray-900 mb-1">Manage your profile</p>

      <Link
        href="/settings/agent"
        className="w-full h-12 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Edit className="w-4 h-4" aria-hidden="true" />
        Edit profile
      </Link>

      <Link
        href="?preview=1"
        className="w-full h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Eye className="w-4 h-4" aria-hidden="true" />
        Preview
      </Link>

      {/* Placeholder route — the Pro Dashboard page itself is a separate task. */}
      <Link
        href="/pro/dashboard"
        className="w-full h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <BarChart2 className="w-4 h-4" aria-hidden="true" />
        Pro Dashboard
      </Link>

      <Link
        href="/pro"
        className="w-full h-10 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Star className="w-4 h-4" aria-hidden="true" />
        Promote
      </Link>
    </div>
  )
}
