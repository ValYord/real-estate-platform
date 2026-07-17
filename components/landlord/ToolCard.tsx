import { Link } from '@/i18n/navigation'
import Card, { CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { LandlordTool } from '@/lib/landlord/tools'

/** Emoji glyph per tool — matches the spec's own iconography (§2 layout diagram). */
const TOOL_ICON: Record<LandlordTool['id'], string> = {
  rentals: '🏢',
  screening: '👤',
  lease: '📄',
  rent: '💳',
  list: '➕',
}

/**
 * One card in the `/landlord` hub's tool grid (§3.1). Live tools link out;
 * disabled tools render as a non-interactive card with a "Coming soon"
 * badge (country-gated copy for `rent`) instead of a dead link.
 */
export default function ToolCard({ tool }: { tool: LandlordTool }) {
  const icon = TOOL_ICON[tool.id]

  const content = (
    <CardBody className="flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-2">
        <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 text-xl" aria-hidden="true">
          {icon}
        </span>
        {tool.state === 'comingSoon' && (
          <Badge variant="neutral" className="text-muted">
            {tool.comingSoonLabel ?? 'Coming soon'}
          </Badge>
        )}
      </div>
      <div>
        <h3 className="text-base font-semibold text-text">{tool.name}</h3>
        <p className="text-sm text-muted mt-1">{tool.description}</p>
      </div>
      <span
        className={
          tool.state === 'live'
            ? 'mt-auto text-sm font-medium text-primary'
            : 'mt-auto text-sm font-medium text-muted'
        }
      >
        {tool.state === 'live' ? 'Open →' : 'Not available yet'}
      </span>
    </CardBody>
  )

  if (tool.state === 'comingSoon') {
    return (
      <Card
        aria-disabled="true"
        className="opacity-70 cursor-not-allowed h-full"
      >
        {content}
      </Card>
    )
  }

  return (
    <Link
      href={tool.href}
      className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      data-testid={`landlord-tool-${tool.id}`}
    >
      <Card variant="interactive" className="h-full">
        {content}
      </Card>
    </Link>
  )
}
