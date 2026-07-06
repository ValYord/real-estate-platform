/**
 * Tests for listing wizard Zod schemas.
 */

import { describe, it, expect } from 'vitest'
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  publishSchema,
  patchListingSchema,
} from '../lib/listings/schemas'

// ── Step 1 ───────────────────────────────────────────────────────────────────

describe('step1Schema', () => {
  it('accepts valid sale + apartment', () => {
    const result = step1Schema.safeParse({ dealType: 'sale', propertyType: 'apartment' })
    expect(result.success).toBe(true)
  })

  it('accepts rent + land', () => {
    const result = step1Schema.safeParse({ dealType: 'rent', propertyType: 'land' })
    expect(result.success).toBe(true)
  })

  it('rejects missing dealType', () => {
    const result = step1Schema.safeParse({ propertyType: 'apartment' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid propertyType', () => {
    const result = step1Schema.safeParse({ dealType: 'sale', propertyType: 'condo' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid dealType', () => {
    const result = step1Schema.safeParse({ dealType: 'lease', propertyType: 'apartment' })
    expect(result.success).toBe(false)
  })

  it('accepts all 6 property types', () => {
    const types = ['apartment', 'house', 'land', 'commercial', 'newdev', 'garage']
    for (const pt of types) {
      const result = step1Schema.safeParse({ dealType: 'sale', propertyType: pt })
      expect(result.success, `propertyType=${pt}`).toBe(true)
    }
  })
})

// ── Step 2 ───────────────────────────────────────────────────────────────────

describe('step2Schema', () => {
  const valid = {
    country: 'AM',
    city: 'Yerevan',
    lat: 40.1872,
    lng: 44.5152,
    hideExact: false,
  }

  it('accepts valid location with pin', () => {
    expect(step2Schema.safeParse(valid).success).toBe(true)
  })

  it('rejects empty city', () => {
    const result = step2Schema.safeParse({ ...valid, city: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing lat', () => {
    const { lat: _lat, ...rest } = valid
    const result = step2Schema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing lng', () => {
    const { lng: _lng, ...rest } = valid
    const result = step2Schema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('applies default country AM', () => {
    const { country: _c, ...rest } = valid
    const result = step2Schema.safeParse(rest)
    if (result.success) {
      expect(result.data.country).toBe('AM')
    }
  })

  it('allows optional district and address', () => {
    const result = step2Schema.safeParse({ ...valid, district: 'Arabkir', address: 'Main St' })
    expect(result.success).toBe(true)
  })
})

// ── Step 3 ───────────────────────────────────────────────────────────────────

describe('step3Schema', () => {
  const valid = {
    areaM2: 75,
    title: { hy: 'Երկու սենյականոց բնակարան' },
    description: { hy: 'Հիանալի բնակարան Արաբկիրում, լավ վիճակ, կահույքով' },
  }

  it('accepts minimal valid data', () => {
    expect(step3Schema.safeParse(valid).success).toBe(true)
  })

  it('rejects areaM2 = 0', () => {
    const result = step3Schema.safeParse({ ...valid, areaM2: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative area', () => {
    const result = step3Schema.safeParse({ ...valid, areaM2: -10 })
    expect(result.success).toBe(false)
  })

  it('rejects title.hy shorter than 5 chars', () => {
    const result = step3Schema.safeParse({ ...valid, title: { hy: 'Hi' } })
    expect(result.success).toBe(false)
  })

  it('rejects title.hy longer than 120 chars', () => {
    const result = step3Schema.safeParse({ ...valid, title: { hy: 'x'.repeat(121) } })
    expect(result.success).toBe(false)
  })

  it('rejects description.hy shorter than 30 chars', () => {
    const result = step3Schema.safeParse({ ...valid, description: { hy: 'Short' } })
    expect(result.success).toBe(false)
  })

  it('rejects description.hy longer than 5000 chars', () => {
    const result = step3Schema.safeParse({ ...valid, description: { hy: 'x'.repeat(5001) } })
    expect(result.success).toBe(false)
  })

  it('accepts optional ru/en translations', () => {
    const result = step3Schema.safeParse({
      ...valid,
      title: { hy: 'Երկու սենյականոց', ru: 'Двухкомнатная', en: 'Two-room' },
    })
    expect(result.success).toBe(true)
  })

  it('coerces string area to number', () => {
    const result = step3Schema.safeParse({ ...valid, areaM2: '75' })
    if (result.success) {
      expect(typeof result.data.areaM2).toBe('number')
    }
  })
})

// ── Step 4 ───────────────────────────────────────────────────────────────────

describe('step4Schema', () => {
  const validPhoto = { mediaId: '00000000-0000-0000-0000-000000000001', url: 'https://cdn.example.com/img.jpg', order: 0 }

  it('accepts one photo', () => {
    expect(step4Schema.safeParse({ media: [validPhoto] }).success).toBe(true)
  })

  it('rejects empty media array', () => {
    const result = step4Schema.safeParse({ media: [] })
    expect(result.success).toBe(false)
  })

  it('rejects more than 30 photos', () => {
    const photos = Array.from({ length: 31 }, (_, i) => ({
      mediaId: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
      url: `https://cdn.example.com/img${i}.jpg`,
      order: i,
    }))
    const result = step4Schema.safeParse({ media: photos })
    expect(result.success).toBe(false)
  })

  it('rejects invalid photo URL', () => {
    const result = step4Schema.safeParse({ media: [{ ...validPhoto, url: 'not-a-url' }] })
    expect(result.success).toBe(false)
  })

  it('accepts optional videoUrl', () => {
    const result = step4Schema.safeParse({ media: [validPhoto], videoUrl: 'https://youtube.com/watch?v=xyz' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid videoUrl', () => {
    const result = step4Schema.safeParse({ media: [validPhoto], videoUrl: 'not-a-url' })
    expect(result.success).toBe(false)
  })
})

// ── Step 5 ───────────────────────────────────────────────────────────────────

describe('step5Schema', () => {
  const valid = { price: 50000000, currency: 'AMD', negotiable: false }

  it('accepts valid price + currency', () => {
    expect(step5Schema.safeParse(valid).success).toBe(true)
  })

  it('rejects price = 0', () => {
    expect(step5Schema.safeParse({ ...valid, price: 0 }).success).toBe(false)
  })

  it('rejects negative price', () => {
    expect(step5Schema.safeParse({ ...valid, price: -100 }).success).toBe(false)
  })

  it('rejects invalid currency', () => {
    expect(step5Schema.safeParse({ ...valid, currency: 'GBP' }).success).toBe(false)
  })

  it('accepts all 4 currencies', () => {
    for (const currency of ['AMD', 'RUB', 'USD', 'EUR']) {
      expect(step5Schema.safeParse({ ...valid, currency }).success, currency).toBe(true)
    }
  })

  it('accepts rent extras', () => {
    const result = step5Schema.safeParse({
      ...valid,
      utilitiesIncluded: true,
      deposit: 100000,
      minRentTermMonths: 3,
    })
    expect(result.success).toBe(true)
  })

  it('coerces string price to number', () => {
    const result = step5Schema.safeParse({ ...valid, price: '50000000' })
    if (result.success) {
      expect(typeof result.data.price).toBe('number')
    }
  })
})

// ── Step 6 ───────────────────────────────────────────────────────────────────

describe('step6Schema', () => {
  const valid = {
    contactName: 'Hovhannes',
    contactPhone: '+37412345678',
    contactPreference: 'phone_and_chat',
    termsAccepted: true as const,
  }

  it('accepts valid contact info', () => {
    expect(step6Schema.safeParse(valid).success).toBe(true)
  })

  it('rejects missing termsAccepted', () => {
    const { termsAccepted: _t, ...rest } = valid
    expect(step6Schema.safeParse(rest).success).toBe(false)
  })

  it('rejects termsAccepted = false', () => {
    expect(step6Schema.safeParse({ ...valid, termsAccepted: false }).success).toBe(false)
  })

  it('rejects invalid phone', () => {
    expect(step6Schema.safeParse({ ...valid, contactPhone: '012345678' }).success).toBe(false)
  })

  it('rejects name shorter than 2 chars', () => {
    expect(step6Schema.safeParse({ ...valid, contactName: 'A' }).success).toBe(false)
  })

  it('rejects name longer than 50 chars', () => {
    expect(step6Schema.safeParse({ ...valid, contactName: 'A'.repeat(51) }).success).toBe(false)
  })

  it('accepts chat_only preference', () => {
    expect(step6Schema.safeParse({ ...valid, contactPreference: 'chat_only' }).success).toBe(true)
  })
})

// ── publishSchema ─────────────────────────────────────────────────────────────

describe('publishSchema', () => {
  const validFull = {
    dealType: 'sale',
    propertyType: 'apartment',
    country: 'AM',
    city: 'Yerevan',
    lat: 40.1872,
    lng: 44.5152,
    hideExact: false,
    areaM2: 75,
    title: { hy: 'Երկու սենյականոց բնակարան' },
    description: { hy: 'Հիանալի բնակարան Արաբկիրում, լավ վիճակ, կահույքով' },
    media: [{ mediaId: '00000000-0000-0000-0000-000000000001', url: 'https://cdn.example.com/img.jpg', order: 0 }],
    price: 50000000,
    currency: 'AMD',
    negotiable: false,
    contactName: 'Hovhannes',
    contactPhone: '+37412345678',
    contactPreference: 'phone_and_chat',
    termsAccepted: true as const,
  }

  it('accepts fully valid listing data', () => {
    expect(publishSchema.safeParse(validFull).success).toBe(true)
  })

  it('rejects when media is empty', () => {
    expect(publishSchema.safeParse({ ...validFull, media: [] }).success).toBe(false)
  })

  it('rejects when terms not accepted', () => {
    const { termsAccepted: _t, ...rest } = validFull
    expect(publishSchema.safeParse(rest).success).toBe(false)
  })
})

// ── patchListingSchema ────────────────────────────────────────────────────────

describe('patchListingSchema', () => {
  it('accepts empty object (full partial)', () => {
    expect(patchListingSchema.safeParse({}).success).toBe(true)
  })

  it('accepts single-field patch', () => {
    expect(patchListingSchema.safeParse({ city: 'Gyumri' }).success).toBe(true)
  })

  it('rejects invalid field value', () => {
    expect(patchListingSchema.safeParse({ price: -100 }).success).toBe(false)
  })
})
