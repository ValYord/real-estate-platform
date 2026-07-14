/**
 * Rendering test for <KpiCard> (components/pro/KpiCard.tsx) — verifies the
 * icon + color + aria-label convey trend direction (page spec §7: "not by
 * color alone"), for all four states: up / down / neutral (trend === 0) /
 * no comparison data at all (trend === undefined).
 *
 * Rendered with `react-dom/server`'s `renderToStaticMarkup` (no DOM/jsdom
 * needed — this repo has no testing-library dependency) and asserted on the
 * resulting HTML string.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import KpiCard from '../components/pro/KpiCard'

describe('KpiCard — trend direction (icon + text, not color alone)', () => {
  it('renders an "Up" aria-label and success-token styling for a positive trend', () => {
    const html = renderToStaticMarkup(<KpiCard label="Total views" value="1,240" trend={0.12} />)
    expect(html).toContain('Up 12% versus previous period')
    expect(html).toContain('text-success')
    expect(html).toContain('+12%')
  })

  it('renders a "Down" aria-label and danger-token styling for a negative trend', () => {
    const html = renderToStaticMarkup(<KpiCard label="Contact clicks" value="54" trend={-0.03} />)
    expect(html).toContain('Down 3% versus previous period')
    expect(html).toContain('text-danger')
    expect(html).toContain('-3%')
  })

  it('renders a "No change" aria-label and muted-token styling for a zero trend', () => {
    const html = renderToStaticMarkup(<KpiCard label="Favorites" value="86" trend={0} />)
    expect(html).toContain('No change versus previous period')
    expect(html).toContain('text-muted')
  })

  it('renders a decorative dash (no aria-label) when there is no trend data at all', () => {
    const html = renderToStaticMarkup(<KpiCard label="Active listings" value="24" />)
    expect(html).not.toContain('versus previous period')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('—')
  })

  it('renders the sparkline only when provided with at least 2 points', () => {
    // The trend arrow itself is also an `<svg>` (lucide-react), so assert on
    // the sparkline's own marker class (`Sparkline.tsx`'s `w-full h-8`)
    // rather than the presence of any `<svg>` at all.
    const withSparkline = renderToStaticMarkup(
      <KpiCard label="Total views" value="1,240" trend={0.12} sparkline={[1, 2, 3]} />,
    )
    expect(withSparkline).toContain('w-full h-8')

    const withoutSparkline = renderToStaticMarkup(
      <KpiCard label="Total views" value="1,240" trend={0.12} />,
    )
    expect(withoutSparkline).not.toContain('w-full h-8')
  })
})
