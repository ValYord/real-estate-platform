/**
 * Unit tests for lib/blog/readingTime.ts.
 */
import { describe, expect, it } from 'vitest'
import { computeReadingTime } from '@/lib/blog/readingTime'

describe('computeReadingTime', () => {
  it('returns a minimum of 1 minute for very short bodies', () => {
    expect(computeReadingTime('<p>Hi.</p>')).toBe(1)
  })

  it('strips HTML tags before counting words', () => {
    const words = Array.from({ length: 400 }, () => 'word').join(' ')
    expect(computeReadingTime(`<h2>Title</h2><p>${words}</p>`)).toBe(2)
  })

  it('scales roughly with word count (200 wpm)', () => {
    const words600 = Array.from({ length: 600 }, () => 'word').join(' ')
    expect(computeReadingTime(`<p>${words600}</p>`)).toBe(3)
  })
})
