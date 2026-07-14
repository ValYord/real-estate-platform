import { ExternalLink } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import AdminSignOutButton from './AdminSignOutButton'

function initials(name: string | null): string {
  const trimmed = name?.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'A'
}

/**
 * Server Component — brand + "To site" + avatar/sign-out. No global search,
 * no avatar dropdown (D5 in the design handoff: Users/audit-log pages don't
 * exist in this task, so a dropdown with dead entries would be worse than a
 * plain sign-out button).
 */
export default function AdminTopBar({ adminName }: { adminName: string | null }) {
  return (
    <header className="h-14 bg-gray-900 text-white px-4 flex items-center gap-4 flex-shrink-0">
      <span className="font-semibold text-sm tracking-wide">Admin</span>
      <div className="flex-1" />
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-gray-300 hover:text-white transition-colors duration-150 flex items-center gap-1"
      >
        <ExternalLink aria-hidden="true" className="w-4 h-4" />
        To site
      </Link>
      <div className="flex items-center gap-1">
        <span
          aria-hidden="true"
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
        >
          {initials(adminName)}
        </span>
        <AdminSignOutButton />
      </div>
    </header>
  )
}
