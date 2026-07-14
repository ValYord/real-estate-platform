/**
 * Boundary tests for `agentsQuerySchema` (docs/en/pages/11-find-agent.md §5) —
 * GET /api/agents query params.
 */
import { describe, it, expect } from 'vitest'
import { agentsQuerySchema } from '../lib/agent/schemas'

describe('agentsQuerySchema', () => {
  it('accepts an empty object and applies defaults (sort=rating, page=1)', () => {
    const result = agentsQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sort).toBe('rating')
      expect(result.data.page).toBe(1)
      expect(result.data.city).toBeUndefined()
    }
  })

  it('accepts a fully populated valid query', () => {
    const result = agentsQuerySchema.safeParse({
      city: 'Yerevan',
      specialty: 'apartments',
      lang: 'ru',
      minRating: 4.5,
      sort: 'newest',
      page: 2,
    })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown sort value', () => {
    const result = agentsQuerySchema.safeParse({ sort: 'promoted' })
    expect(result.success).toBe(false)
  })

  it('rejects a non-numeric minRating', () => {
    const result = agentsQuerySchema.safeParse({ minRating: 'excellent' })
    expect(result.success).toBe(false)
  })

  it('rejects minRating above 5', () => {
    const result = agentsQuerySchema.safeParse({ minRating: 5.1 })
    expect(result.success).toBe(false)
  })

  it('rejects minRating below 0', () => {
    const result = agentsQuerySchema.safeParse({ minRating: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts minRating at the 0 and 5 boundaries', () => {
    expect(agentsQuerySchema.safeParse({ minRating: 0 }).success).toBe(true)
    expect(agentsQuerySchema.safeParse({ minRating: 5 }).success).toBe(true)
  })

  it('rejects page 0 (must be positive)', () => {
    const result = agentsQuerySchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects a negative page', () => {
    const result = agentsQuerySchema.safeParse({ page: -3 })
    expect(result.success).toBe(false)
  })

  it('rejects a non-integer page', () => {
    const result = agentsQuerySchema.safeParse({ page: 1.5 })
    expect(result.success).toBe(false)
  })

  it('rejects a non-numeric page', () => {
    const result = agentsQuerySchema.safeParse({ page: 'two' })
    expect(result.success).toBe(false)
  })

  it('coerces string query values (as they arrive from URLSearchParams)', () => {
    const result = agentsQuerySchema.safeParse({ minRating: '4', page: '3' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.minRating).toBe(4)
      expect(result.data.page).toBe(3)
    }
  })

  it('rejects an empty city string (must be at least 1 char)', () => {
    const result = agentsQuerySchema.safeParse({ city: '' })
    expect(result.success).toBe(false)
  })
})
