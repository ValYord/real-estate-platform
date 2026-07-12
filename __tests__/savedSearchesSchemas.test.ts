/**
 * Unit tests for lib/saved-searches/schemas.ts.
 */

import { describe, it, expect } from 'vitest'
import { alertFrequencySchema, savedSearchSchema, patchSavedSearchSchema } from '@/lib/saved-searches/schemas'

const VALID_FILTERS = { deal: 'sale', city: 'Yerevan', beds: 2, sort: 'newest', page: 1 }

describe('alertFrequencySchema', () => {
  it.each(['off', 'instant', 'daily', 'weekly'])('accepts "%s"', (value) => {
    expect(alertFrequencySchema.parse(value)).toBe(value)
  })

  it('rejects an unknown value', () => {
    expect(alertFrequencySchema.safeParse('hourly').success).toBe(false)
  })
})

describe('savedSearchSchema', () => {
  it('accepts a valid input and defaults alertFrequency to "daily"', () => {
    const result = savedSearchSchema.parse({ name: 'My search', filters: VALID_FILTERS })
    expect(result.alertFrequency).toBe('daily')
    expect(result.name).toBe('My search')
  })

  it('trims the name', () => {
    const result = savedSearchSchema.parse({ name: '  My search  ', filters: VALID_FILTERS })
    expect(result.name).toBe('My search')
  })

  it('rejects an empty name', () => {
    const result = savedSearchSchema.safeParse({ name: '', filters: VALID_FILTERS })
    expect(result.success).toBe(false)
  })

  it('rejects a name over 60 characters', () => {
    const result = savedSearchSchema.safeParse({ name: 'x'.repeat(61), filters: VALID_FILTERS })
    expect(result.success).toBe(false)
  })

  it('accepts a name of exactly 60 characters', () => {
    const result = savedSearchSchema.safeParse({ name: 'x'.repeat(60), filters: VALID_FILTERS })
    expect(result.success).toBe(true)
  })

  it('rejects invalid filters (reuses the /search filters schema)', () => {
    const result = savedSearchSchema.safeParse({ name: 'My search', filters: { deal: 'lease' } })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid alertFrequency', () => {
    const result = savedSearchSchema.safeParse({
      name: 'My search',
      filters: VALID_FILTERS,
      alertFrequency: 'hourly',
    })
    expect(result.success).toBe(false)
  })
})

describe('patchSavedSearchSchema', () => {
  it('accepts a name-only patch', () => {
    const result = patchSavedSearchSchema.parse({ name: 'Renamed' })
    expect(result.name).toBe('Renamed')
  })

  it('accepts an alertFrequency-only patch', () => {
    const result = patchSavedSearchSchema.parse({ alertFrequency: 'weekly' })
    expect(result.alertFrequency).toBe('weekly')
  })

  it('accepts a filters-only patch', () => {
    const result = patchSavedSearchSchema.parse({ filters: VALID_FILTERS })
    expect(result.filters?.city).toBe('Yerevan')
  })

  it('accepts newMatchCount: 0', () => {
    const result = patchSavedSearchSchema.parse({ newMatchCount: 0 })
    expect(result.newMatchCount).toBe(0)
  })

  it('rejects newMatchCount other than 0', () => {
    const result = patchSavedSearchSchema.safeParse({ newMatchCount: 5 })
    expect(result.success).toBe(false)
  })

  it('rejects an empty object (no fields to update)', () => {
    const result = patchSavedSearchSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects a name over 60 characters', () => {
    const result = patchSavedSearchSchema.safeParse({ name: 'x'.repeat(61) })
    expect(result.success).toBe(false)
  })
})
