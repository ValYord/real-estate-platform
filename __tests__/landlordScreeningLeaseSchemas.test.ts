/**
 * Unit tests for the Page 19 (Screening + Lease Generation) zod schemas in
 * lib/landlord/schemas.ts, mirroring docs/en/pages/19-landlord.md §5.
 */
import { describe, expect, it } from 'vitest'
import {
  applicationSchema,
  applicationPatchSchema,
  createApplicationLinkSchema,
  leaseFieldsSchema,
  createLeaseSchema,
} from '@/lib/landlord/schemas'

const VALID_APPLICATION = {
  applicantName: 'David Sargsyan',
  contact: 'david@example.com',
  employment: 'Software engineer',
  income: 450000,
  residence: 'Yerevan, Kentron',
  references: 'Ani Petrosyan, +37477000000',
  declaration: 'No prior evictions.',
  consent: true,
}

describe('applicationSchema — the public tenant application form', () => {
  it('accepts a fully valid application', () => {
    expect(applicationSchema.safeParse(VALID_APPLICATION).success).toBe(true)
  })

  it('accepts the minimal required fields only (all optionals omitted)', () => {
    const result = applicationSchema.safeParse({
      applicantName: 'David Sargsyan',
      contact: 'david@example.com',
      consent: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects when consent is missing — "Consent is required"', () => {
    const { consent: _consent, ...rest } = VALID_APPLICATION
    const result = applicationSchema.safeParse(rest)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'consent')
      expect(issue?.message).toBe('Consent is required')
    }
  })

  it('rejects when consent is explicitly false — "Consent is required"', () => {
    const result = applicationSchema.safeParse({ ...VALID_APPLICATION, consent: false })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'consent')
      expect(issue?.message).toBe('Consent is required')
    }
  })

  it('rejects a name shorter than 2 characters', () => {
    expect(applicationSchema.safeParse({ ...VALID_APPLICATION, applicantName: 'D' }).success).toBe(false)
  })

  it('rejects a contact shorter than 5 characters', () => {
    expect(applicationSchema.safeParse({ ...VALID_APPLICATION, contact: 'ab' }).success).toBe(false)
  })

  it('rejects a negative income', () => {
    expect(applicationSchema.safeParse({ ...VALID_APPLICATION, income: -1 }).success).toBe(false)
  })

  it('coerces a numeric-string income (e.g. from a form submit)', () => {
    const result = applicationSchema.safeParse({ ...VALID_APPLICATION, income: '450000' })
    expect(result.success).toBe(true)
  })
})

describe('applicationPatchSchema — [Approve]/[Reject] + notes', () => {
  it('accepts a valid status with notes', () => {
    expect(applicationPatchSchema.safeParse({ status: 'approved', notes: 'Looks good' }).success).toBe(true)
  })

  it('accepts a status with no notes', () => {
    expect(applicationPatchSchema.safeParse({ status: 'rejected' }).success).toBe(true)
  })

  it('rejects a status outside the 4-value enum', () => {
    expect(applicationPatchSchema.safeParse({ status: 'archived' }).success).toBe(false)
  })
})

describe('createApplicationLinkSchema', () => {
  it('accepts a valid UUID unitId', () => {
    expect(
      createApplicationLinkSchema.safeParse({ unitId: '11111111-1111-1111-1111-111111111111' }).success,
    ).toBe(true)
  })

  it('rejects a non-UUID unitId', () => {
    expect(createApplicationLinkSchema.safeParse({ unitId: 'not-a-uuid' }).success).toBe(false)
  })
})

const VALID_LEASE_FIELDS = {
  landlordName: 'Karen Avetisyan',
  landlordContact: 'karen@example.com',
  tenantName: 'David Sargsyan',
  tenantContact: 'david@example.com',
  propertyAddress: 'Arabkir, Komitas 12',
  propertyAreaM2: 75,
  startDate: '2026-08-01',
  endDate: '2027-08-01',
  rent: 250000,
  currency: 'AMD',
  paymentDay: 1,
  deposit: 250000,
  utilities: 'Tenant pays electricity/water',
  pets: 'not_allowed',
  subletting: 'not_allowed',
  smoking: 'not_allowed',
}

describe('leaseFieldsSchema — the /landlord/lease fillable form', () => {
  it('accepts a fully valid lease', () => {
    const result = leaseFieldsSchema.safeParse(VALID_LEASE_FIELDS)
    expect(result.success).toBe(true)
  })

  it('rejects endDate <= startDate with the spec-verbatim message on the endDate field', () => {
    const result = leaseFieldsSchema.safeParse({
      ...VALID_LEASE_FIELDS,
      startDate: '2026-08-01',
      endDate: '2026-08-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join('.') === 'endDate')
      expect(issue?.message).toBe('The end must be after the start')
    }
  })

  it('rejects endDate before startDate', () => {
    const result = leaseFieldsSchema.safeParse({
      ...VALID_LEASE_FIELDS,
      startDate: '2026-08-01',
      endDate: '2026-07-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join('.') === 'endDate')
      expect(issue?.message).toBe('The end must be after the start')
    }
  })

  it('accepts endDate one day after startDate', () => {
    const result = leaseFieldsSchema.safeParse({
      ...VALID_LEASE_FIELDS,
      startDate: '2026-08-01',
      endDate: '2026-08-02',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-positive rent', () => {
    expect(leaseFieldsSchema.safeParse({ ...VALID_LEASE_FIELDS, rent: 0 }).success).toBe(false)
  })

  it('rejects a payment day outside 1-31', () => {
    expect(leaseFieldsSchema.safeParse({ ...VALID_LEASE_FIELDS, paymentDay: 32 }).success).toBe(false)
    expect(leaseFieldsSchema.safeParse({ ...VALID_LEASE_FIELDS, paymentDay: 0 }).success).toBe(false)
  })

  it('rejects a currency outside the supported set', () => {
    expect(leaseFieldsSchema.safeParse({ ...VALID_LEASE_FIELDS, currency: 'GBP' }).success).toBe(false)
  })

  it('rejects an unrecognized pets policy', () => {
    expect(leaseFieldsSchema.safeParse({ ...VALID_LEASE_FIELDS, pets: 'sometimes' }).success).toBe(false)
  })
})

describe('createLeaseSchema — POST /api/landlord/leases body', () => {
  it('accepts a valid request', () => {
    const result = createLeaseSchema.safeParse({
      unitId: '11111111-1111-1111-1111-111111111111',
      templateId: '22222222-2222-2222-2222-222222222222',
      fields: VALID_LEASE_FIELDS,
    })
    expect(result.success).toBe(true)
  })

  it('propagates the nested endDate > startDate refinement', () => {
    const result = createLeaseSchema.safeParse({
      unitId: '11111111-1111-1111-1111-111111111111',
      templateId: '22222222-2222-2222-2222-222222222222',
      fields: { ...VALID_LEASE_FIELDS, startDate: '2026-08-01', endDate: '2026-08-01' },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join('.') === 'fields.endDate')
      expect(issue?.message).toBe('The end must be after the start')
    }
  })

  it('rejects a non-UUID unitId', () => {
    const result = createLeaseSchema.safeParse({
      unitId: 'not-a-uuid',
      templateId: '22222222-2222-2222-2222-222222222222',
      fields: VALID_LEASE_FIELDS,
    })
    expect(result.success).toBe(false)
  })
})
