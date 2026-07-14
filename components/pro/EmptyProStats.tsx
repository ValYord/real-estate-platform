import { TrendingUp } from 'lucide-react'
import Card from '@/components/ui/Card'

/**
 * "Not enough data yet" empty state, shared by Overview and Analytics for a
 * brand-new Pro/Premium agent with no listings/stats yet (page spec §3.2 /
 * §4). Wrapped in `Card` so it reads as a deliberate, "designed" panel
 * rather than content floating directly on `bg-bg` — costs nothing extra
 * since both sections it replaces are already sets of `Card`s.
 */
export default function EmptyProStats() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 text-center px-6 py-14">
      {/* Decorative icon tint — a raw neutral-scale step, not a semantic
       * token: `text-muted` (neutral-500) would read too dark/prominent for
       * a purely decorative glyph, and there's no dedicated "faint icon
       * tint" token (DESIGN_SYSTEM.md's "use semantic tokens" is a
       * preference, not an absolute ban, per its own wording). */}
      <span
        aria-hidden="true"
        className="w-14 h-14 flex items-center justify-center bg-neutral-100 rounded-full"
      >
        <TrendingUp className="w-7 h-7 text-neutral-300" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-medium text-text">Not enough data yet</p>
        <p className="text-sm text-muted">
          Listings start collecting statistics after they&apos;re published.
        </p>
      </div>
    </Card>
  )
}
