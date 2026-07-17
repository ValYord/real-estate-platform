import { Link } from '@/i18n/navigation'
import { Search } from 'lucide-react'

/**
 * Invalid/expired `/apply/[token]` link (docs/en/pages/19-landlord.md §3.3 —
 * a share link the landlord generated). Same empty-state anatomy as
 * components/landlord/RentalsDashboard.tsx's "no units yet" state, using
 * theme tokens throughout (unlike the older app/[locale]/home-value/
 * [estimateHash]/not-found.tsx precedent, which predates DESIGN_SYSTEM.md
 * and uses raw gray classes).
 */
export default function ApplyTokenNotFound() {
  return (
    <main className="max-w-xl mx-auto px-4 py-24 flex flex-col items-center text-center">
      <div
        className="w-32 h-32 rounded-full bg-neutral-100 flex items-center justify-center mb-8"
        aria-hidden="true"
      >
        <Search className="w-14 h-14 text-muted" />
      </div>

      <h1 className="text-2xl font-semibold text-text mb-3">This application link isn&apos;t valid</h1>
      <p className="text-muted mb-8">It may have been removed by the landlord. Ask them to resend it.</p>

      <Link
        href="/"
        className="flex items-center justify-center gap-2 h-12 px-6 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Go to homepage
      </Link>
    </main>
  )
}
