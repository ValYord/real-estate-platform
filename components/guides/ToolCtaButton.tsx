import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'

const TOOL_HREF = {
  mortgage: '/mortgage-calculators',
  home_value: '/home-value',
  search: '/search',
} as const

export type GuideTool = keyof typeof TOOL_HREF

interface ToolCtaButtonProps {
  tool: GuideTool
  label: string
}

/**
 * Inline in-body CTA linking to an already-built tool page. Only these 3
 * fixed targets are allowed — all verified to exist as real, SSR,
 * locale-prefixed routes (`app/[locale]/mortgage-calculators/page.tsx`,
 * `app/[locale]/home-value/page.tsx`, `app/[locale]/search/page.tsx`). No
 * new tool integration is built here, per the acceptance criteria.
 */
export function ToolCtaButton({ tool, label }: ToolCtaButtonProps) {
  return (
    <Link
      href={TOOL_HREF[tool]}
      className="inline-flex items-center gap-1.5 border border-primary text-primary h-11 rounded-lg px-5 font-medium hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {label}
      <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </Link>
  )
}
