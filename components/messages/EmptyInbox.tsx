import { Inbox } from 'lucide-react'
import { Link } from '@/i18n/navigation'

/**
 * Shown (in the right pane on desktop, full-bleed on mobile — since the list
 * itself has nothing to show either) when the user has zero conversations.
 */
export default function EmptyInbox() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 py-16">
      <span className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded-full">
        <Inbox className="w-8 h-8 text-gray-300" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-medium text-gray-900">You don&apos;t have any messages yet</p>
        <p className="text-sm text-gray-500">Find a property and write to the seller</p>
      </div>
      <Link
        href="/search"
        className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Search properties
      </Link>
    </div>
  )
}
