/**
 * Tests for lib/admin/schemas.ts's rejectSchema — the zod validation for
 * POST /api/admin/listings/[id]/reject, per docs/en/pages/24-admin.md §5.
 */
import { describe, it, expect } from 'vitest'
import { rejectSchema, rejectReasonEnum } from '@/lib/admin/schemas'

describe('rejectSchema', () => {
  it('accepts a valid reason with no note', () => {
    expect(rejectSchema.safeParse({ reason: 'bad_photos' }).success).toBe(true)
  })

  it('accepts a valid reason with a note under 500 chars', () => {
    expect(rejectSchema.safeParse({ reason: 'other', note: 'Looks staged' }).success).toBe(true)
  })

  it('rejects a missing reason', () => {
    expect(rejectSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an unknown reason value', () => {
    expect(rejectSchema.safeParse({ reason: 'not_a_real_reason' }).success).toBe(false)
  })

  it('rejects a note over 500 characters', () => {
    expect(rejectSchema.safeParse({ reason: 'duplicate', note: 'x'.repeat(501) }).success).toBe(false)
  })

  it('accepts all five documented reason values', () => {
    for (const reason of ['bad_photos', 'duplicate', 'suspicious_price', 'rule_violation', 'other']) {
      expect(rejectReasonEnum.safeParse(reason).success).toBe(true)
    }
  })

  it('ignores unrelated extra fields without throwing (zod default: strips unknown keys)', () => {
    const result = rejectSchema.safeParse({ reason: 'other', bogus: 'field' })
    expect(result.success).toBe(true)
  })
})
