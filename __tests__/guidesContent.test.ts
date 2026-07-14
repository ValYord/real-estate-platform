import { describe, it, expect } from 'vitest'
import {
  pickLocalized,
  readingTimeMinutes,
  buildTocFromBlocks,
  hasHowToSteps,
  stepCount,
} from '../lib/guides/content'
import type { GuideBlock } from '../lib/guides/types'

describe('pickLocalized()', () => {
  it('returns the value for the requested locale when present', () => {
    expect(pickLocalized('ru', { hy: 'a', ru: 'b', en: 'c' })).toBe('b')
  })

  it('falls back to en when the requested locale is missing', () => {
    expect(pickLocalized('ru', { hy: 'a', en: 'c' })).toBe('c')
  })

  it('falls back to hy when locale and en are both missing', () => {
    expect(pickLocalized('ru', { hy: 'a' })).toBe('a')
  })

  it('returns undefined for an empty or nullish map', () => {
    expect(pickLocalized('en', {})).toBeUndefined()
    expect(pickLocalized('en', null)).toBeUndefined()
    expect(pickLocalized('en', undefined)).toBeUndefined()
  })
})

describe('readingTimeMinutes()', () => {
  it('never returns less than 1 minute for non-empty content', () => {
    const blocks: GuideBlock[] = [{ kind: 'paragraph', text: 'A short sentence.' }]
    expect(readingTimeMinutes(blocks)).toBeGreaterThanOrEqual(1)
  })

  it('scales roughly with word count (200 wpm)', () => {
    const words = Array.from({ length: 400 }, () => 'word').join(' ')
    const blocks: GuideBlock[] = [{ kind: 'paragraph', text: words }]
    expect(readingTimeMinutes(blocks)).toBe(2)
  })

  it('counts words across paragraph, heading, list, info, and warning blocks', () => {
    const blocks: GuideBlock[] = [
      { kind: 'heading', id: 'h', level: 2, text: 'one two three' },
      { kind: 'list', items: ['four five', 'six'] },
      { kind: 'info', text: 'seven eight' },
      { kind: 'warning', text: 'nine' },
      { kind: 'tool_cta', tool: 'search', label: 'ignored, not counted' },
    ]
    // 3 + 3 + 2 + 1 = 9 words → still rounds up to 1 minute
    expect(readingTimeMinutes(blocks)).toBe(1)
  })
})

describe('buildTocFromBlocks()', () => {
  it('extracts only heading blocks, in order', () => {
    const blocks: GuideBlock[] = [
      { kind: 'paragraph', text: 'intro' },
      { kind: 'heading', id: 'step-1', level: 2, text: 'Step 1' },
      { kind: 'paragraph', text: 'body' },
      { kind: 'heading', id: 'step-1a', level: 3, text: 'Step 1a' },
      { kind: 'heading', id: 'step-2', level: 2, text: 'Step 2' },
    ]
    expect(buildTocFromBlocks(blocks)).toEqual([
      { id: 'step-1', text: 'Step 1', level: 2 },
      { id: 'step-1a', text: 'Step 1a', level: 3 },
      { id: 'step-2', text: 'Step 2', level: 2 },
    ])
  })

  it('returns an empty array when there are no headings', () => {
    expect(buildTocFromBlocks([{ kind: 'paragraph', text: 'no headings here' }])).toEqual([])
  })
})

describe('hasHowToSteps()', () => {
  it('is true with 2 or more level-2 headings', () => {
    expect(
      hasHowToSteps([
        { id: 'a', text: 'A', level: 2 },
        { id: 'b', text: 'B', level: 2 },
      ]),
    ).toBe(true)
  })

  it('is false with fewer than 2 level-2 headings, even if level-3 headings exist', () => {
    expect(
      hasHowToSteps([
        { id: 'a', text: 'A', level: 2 },
        { id: 'a1', text: 'A1', level: 3 },
        { id: 'a2', text: 'A2', level: 3 },
      ]),
    ).toBe(false)
    expect(hasHowToSteps([])).toBe(false)
  })
})

describe('stepCount()', () => {
  it('counts only level-2 headings', () => {
    expect(
      stepCount([
        { id: 'a', text: 'A', level: 2 },
        { id: 'a1', text: 'A1', level: 3 },
        { id: 'b', text: 'B', level: 2 },
      ]),
    ).toBe(2)
  })
})
