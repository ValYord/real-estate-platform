import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { estimateHashSchema } from '@/lib/home-value/schemas'
import type {
  Confidence,
  EstimateFactor,
  FallbackLevel,
  HomeValueCondition,
  HomeValuePropertyType,
} from '@/lib/home-value/types'

export interface EstimateSnapshot {
  hash: string
  addressLabel: string | null
  city: string
  district: string | null
  lat: number
  lng: number
  propertyType: HomeValuePropertyType
  areaM2: number
  rooms: number | null
  floor: number | null
  floorsTotal: number | null
  yearBuilt: number | null
  condition: HomeValueCondition | null
  estimate: number
  low: number
  high: number
  currency: 'AMD' | 'USD' | 'EUR' | 'RUB'
  pricePerM2: number
  medianPricePerM2: number
  confidence: Confidence
  compsCount: number
  fallbackLevel: FallbackLevel
  factors: EstimateFactor[]
  createdAt: string
}

/**
 * GET /api/home-value/[hash]
 *
 * Serves the read-only, publicly shareable snapshot for
 * `/home-value/[estimateHash]`. Deliberately uses the service-role client:
 * `home_value_estimates` has no public-SELECT RLS policy (see the migration
 * for why), so a single, exactly-scoped `WHERE hash = $1` lookup here is the
 * only way to read someone else's estimate — and only works if you already
 * know the (unguessable, random) hash. Never returns `owner_id` or any other
 * field beyond what the snapshot page is meant to show.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hash: string }> },
): Promise<NextResponse> {
  const { hash: rawHash } = await params

  let hash: string
  try {
    hash = estimateHashSchema.parse(rawHash)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_hash' }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const isConfigured =
    supabaseUrl && serviceRoleKey && !supabaseUrl.includes('placeholder') && !supabaseUrl.includes('your-project-id')

  if (!isConfigured) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('home_value_estimates')
      .select(
        `hash, address_label, city, district, lat, lng, property_type, area_m2, rooms, floor,
         floors_total, year_built, condition, estimate, low, high, currency, price_per_m2,
         median_price_per_m2, confidence, comps_count, fallback_level, factors, created_at`,
      )
      .eq('hash', hash)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const snapshot: EstimateSnapshot = {
      hash: data.hash,
      addressLabel: data.address_label,
      city: data.city,
      district: data.district,
      lat: data.lat,
      lng: data.lng,
      propertyType: data.property_type as HomeValuePropertyType,
      areaM2: data.area_m2,
      rooms: data.rooms,
      floor: data.floor,
      floorsTotal: data.floors_total,
      yearBuilt: data.year_built,
      condition: data.condition as HomeValueCondition | null,
      estimate: data.estimate,
      low: data.low,
      high: data.high,
      currency: data.currency as EstimateSnapshot['currency'],
      pricePerM2: data.price_per_m2,
      medianPricePerM2: data.median_price_per_m2,
      confidence: data.confidence as Confidence,
      compsCount: data.comps_count,
      fallbackLevel: data.fallback_level as FallbackLevel,
      factors: (data.factors as EstimateFactor[] | null) ?? [],
      createdAt: data.created_at,
    }

    return NextResponse.json(snapshot)
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
}
