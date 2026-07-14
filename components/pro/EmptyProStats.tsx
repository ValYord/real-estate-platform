import { TrendingUp } from 'lucide-react'

/**
 * "Not enough data yet" empty state, shared by Overview and Analytics for a
 * brand-new Pro/Premium agent with no listings/stats yet (page spec §3.2 /
 * §4). Shape copied from `EmptyInbox.tsx` (handoff, layout tokens §4).
 */
export default function EmptyProStats() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center px-6 py-14">
      <span
        aria-hidden="true"
        className="w-14 h-14 flex items-center justify-center bg-gray-50 rounded-full"
      >
        <TrendingUp className="w-7 h-7 text-gray-300" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-medium text-gray-900">Not enough data yet</p>
        <p className="text-sm text-gray-500">
          Listings start collecting statistics after they&apos;re published.
        </p>
      </div>
    </div>
  )
}
