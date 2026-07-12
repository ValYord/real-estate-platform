/**
 * Boundary tests for `agentReviewSchema` (docs/en/pages/10-agent-profile.md §5
 * "Validation (zod)") — POST /api/agents/[id]/reviews body.
 */
import { describe, it, expect } from 'vitest'
import { agentReviewSchema } from '../lib/agent/schemas'

describe('agentReviewSchema', () => {
  it('accepts a valid review (rating 1-5, text 10-1000 chars)', () => {
    const result = agentReviewSchema.safeParse({
      rating: 5,
      text: 'Very professional, helped quickly.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects rating 0 (below minimum)', () => {
    const result = agentReviewSchema.safeParse({ rating: 0, text: 'Great agent, very helpful!' })
    expect(result.success).toBe(false)
  })

  it('rejects rating 6 (above maximum)', () => {
    const result = agentReviewSchema.safeParse({ rating: 6, text: 'Great agent, very helpful!' })
    expect(result.success).toBe(false)
  })

  it('rejects a non-integer rating', () => {
    const result = agentReviewSchema.safeParse({ rating: 4.5, text: 'Great agent, very helpful!' })
    expect(result.success).toBe(false)
  })

  it('rejects text shorter than 10 characters (9 chars)', () => {
    const result = agentReviewSchema.safeParse({ rating: 4, text: '123456789' })
    expect(result.success).toBe(false)
  })

  it('accepts text at exactly the 10-character minimum', () => {
    const result = agentReviewSchema.safeParse({ rating: 4, text: '1234567890' })
    expect(result.success).toBe(true)
  })

  it('rejects text longer than 1000 characters (1001 chars)', () => {
    const result = agentReviewSchema.safeParse({ rating: 4, text: 'a'.repeat(1001) })
    expect(result.success).toBe(false)
  })

  it('accepts text at exactly the 1000-character maximum', () => {
    const result = agentReviewSchema.safeParse({ rating: 4, text: 'a'.repeat(1000) })
    expect(result.success).toBe(true)
  })

  it('rejects a missing rating', () => {
    const result = agentReviewSchema.safeParse({ text: 'Great agent, very helpful!' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing text', () => {
    const result = agentReviewSchema.safeParse({ rating: 5 })
    expect(result.success).toBe(false)
  })
})
