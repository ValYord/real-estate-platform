import type { HomeValuePropertyType, MedianLookup } from './types'

/**
 * Demo/offline fallback median prices, used only when Supabase isn't
 * configured (placeholder `.env.local`, same convention as
 * lib/search/mockData.ts and lib/property/mockData.ts) or the live district
 * query genuinely returns zero rows. Keeps the tool fully demoable without a
 * seeded database — a configured project always prefers the live query in
 * app/api/home-value/estimate/route.ts.
 */
const DISTRICT_BASE_PRICE_PER_M2: Record<string, number> = {
  'Yerevan|Arabkir': 620_000,
  'Yerevan|Kentron': 950_000,
  'Yerevan|Avan': 480_000,
  'Yerevan|Malatia-Sebastia': 430_000,
  'Yerevan|Nor Nork': 460_000,
  'Yerevan|Davtashen': 470_000,
  'Yerevan|Erebuni': 400_000,
  'Yerevan|Ajapnyak': 440_000,
  'Yerevan|Shengavit': 410_000,
}

const CITY_BASE_PRICE_PER_M2: Record<string, number> = {
  Yerevan: 550_000,
  Gyumri: 220_000,
  Vanadzor: 200_000,
}

const PROPERTY_TYPE_MULTIPLIER: Record<HomeValuePropertyType, number> = {
  apartment: 1,
  house: 0.85,
  commercial: 1.3,
  land: 0.35,
}

/** Deterministic "sample size" so the confidence badge looks reasonable in the demo. */
const MOCK_SAMPLE_COUNT = { district: 6, city: 4 } as const

export function getMockMedianLookup(
  city: string,
  district: string | undefined,
  propertyType: HomeValuePropertyType,
): MedianLookup {
  const typeMultiplier = PROPERTY_TYPE_MULTIPLIER[propertyType] ?? 1

  const districtKey = district ? `${city}|${district}` : undefined
  const districtBase = districtKey ? DISTRICT_BASE_PRICE_PER_M2[districtKey] : undefined
  if (districtBase != null) {
    return {
      medianPricePerM2: Math.round(districtBase * typeMultiplier),
      sampleCount: MOCK_SAMPLE_COUNT.district,
      level: 'district',
    }
  }

  const cityBase = CITY_BASE_PRICE_PER_M2[city]
  if (cityBase != null) {
    return {
      medianPricePerM2: Math.round(cityBase * typeMultiplier),
      sampleCount: MOCK_SAMPLE_COUNT.city,
      level: 'city',
    }
  }

  return { medianPricePerM2: 0, sampleCount: 0, level: 'none' }
}
