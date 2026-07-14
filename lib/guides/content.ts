import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/locale'
import type { GuideBlock, GuideTocEntry } from './types'

/**
 * Per-locale fallback chain: `locale` → `en` → `hy` → first available key.
 * Mirrors the fallback chain already used by `property/[id]/[slug]/page.tsx`
 * (`property.title[locale] ?? property.title.en ?? property.title.hy`),
 * generalized to any locale-keyed map and any value type.
 *
 * Returns `undefined` only when the map has no keys at all.
 */
export function pickLocalized<T>(
  locale: Locale,
  map: Partial<Record<Locale, T>> | null | undefined,
): T | undefined {
  if (!map) return undefined
  if (map[locale] !== undefined) return map[locale]
  if (map.en !== undefined) return map.en
  if (map.hy !== undefined) return map.hy
  for (const key of LOCALES) {
    if (map[key] !== undefined) return map[key]
  }
  const firstKey = Object.keys(map)[0] as Locale | undefined
  return firstKey ? map[firstKey] : undefined
}

const WORDS_PER_MINUTE = 200

/**
 * Word-count-based reading time estimate, rounded up, never less than 1
 * minute (a guide with a handful of blocks should never claim "0 min read").
 */
export function readingTimeMinutes(blocks: GuideBlock[]): number {
  let wordCount = 0
  for (const block of blocks) {
    if (block.kind === 'paragraph' || block.kind === 'heading') {
      wordCount += block.text.trim().split(/\s+/).filter(Boolean).length
    } else if (block.kind === 'list') {
      wordCount += block.items.join(' ').trim().split(/\s+/).filter(Boolean).length
    } else if (block.kind === 'info' || block.kind === 'warning') {
      wordCount += block.text.trim().split(/\s+/).filter(Boolean).length
    }
  }
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))
}

/** Derives the precomputed TOC shape straight from a block array (seed-time helper, also reused by tests). */
export function buildTocFromBlocks(blocks: GuideBlock[]): GuideTocEntry[] {
  return blocks
    .filter((b): b is Extract<GuideBlock, { kind: 'heading' }> => b.kind === 'heading')
    .map((b) => ({ id: b.id, text: b.text, level: b.level }))
}

/**
 * A guide "has HowTo steps" (qualifies for `HowTo` JSON-LD, in addition to
 * the always-present `Article`) when it has at least 2 level-2 headings —
 * i.e. it actually reads as "Step 1 / Step 2 / …".
 */
export function hasHowToSteps(toc: GuideTocEntry[]): boolean {
  return toc.filter((entry) => entry.level === 2).length >= 2
}

/** Count of level-2 headings, used for the "N steps" card meta. */
export function stepCount(toc: GuideTocEntry[]): number {
  return toc.filter((entry) => entry.level === 2).length
}

export { DEFAULT_LOCALE }
