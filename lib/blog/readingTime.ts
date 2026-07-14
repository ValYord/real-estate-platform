/** Average adult silent-reading speed used across the industry for "N min read" estimates. */
const WORDS_PER_MINUTE = 200

/**
 * Estimates reading time (in whole minutes, minimum 1) from an article
 * body's HTML by stripping tags and counting words.
 */
export function computeReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ')
  const words = text.split(/\s+/).filter(Boolean)
  return Math.max(1, Math.round(words.length / WORDS_PER_MINUTE))
}
