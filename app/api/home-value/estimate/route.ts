import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { estimateRequestSchema, type EstimateRequestInput } from '@/lib/home-value/schemas'
import { computeEstimate } from '@/lib/home-value/heuristic'
import { computeMedianPricePerM2 } from '@/lib/home-value/median'
import { getMockMedianLookup } from '@/lib/home-value/mockData'
import { generateEstimateHash } from '@/lib/home-value/hash'
import { createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'
import type { EstimateResponse, MedianLookup } from '@/lib/home-value/types'

/** Postgres unique-violation error code — retried on `hash` collision (astronomically unlikely, defense in depth). */
const UNIQUE_VIOLATION = '23505'
const MAX_HASH_RETRIES = 3

/**
 * Looks up the district-median price/m², falling back to the city level,
 * then to the offline mock table (see lib/home-value/mockData.ts) when
 * Supabase isn't configured or genuinely has no matching rows. Only public
 * `status = 'active'` listings are read — same RLS-respecting scope as the
 * rest of the public site, no service-role client needed for this query.
 */
interface RawComparableRow {
  price: number
  area_m2: number | null
}

function toComparableRows(rows: RawComparableRow[]): { price: number; areaM2: number }[] {
  return rows
    .filter((r): r is RawComparableRow & { area_m2: number } => r.area_m2 != null)
    .map((r) => ({ price: r.price, areaM2: r.area_m2 }))
}

async function lookupMedianPricePerM2(input: EstimateRequestInput): Promise<MedianLookup> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isConfigured =
    supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder') && !supabaseUrl.includes('your-project-id')

  if (isConfigured) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, supabaseKey)

      const baseQuery = () =>
        supabase
          .from('properties')
          .select('price, area_m2')
          .eq('status', 'active')
          .eq('property_type', input.propertyType)
          .ilike('city', input.city)
          .not('area_m2', 'is', null)
          .limit(200)

      if (input.district) {
        const { data } = await baseQuery().ilike('district', input.district)
        const districtResult = data ? computeMedianPricePerM2(toComparableRows(data as RawComparableRow[])) : null
        if (districtResult) {
          return { ...districtResult, level: 'district' }
        }
      }

      const { data: cityData } = await baseQuery()
      const cityResult = cityData ? computeMedianPricePerM2(toComparableRows(cityData as RawComparableRow[])) : null
      if (cityResult) {
        return { ...cityResult, level: 'city' }
      }
    } catch {
      // Fall through to the mock table below
    }
  }

  return getMockMedianLookup(input.city, input.district, input.propertyType)
}

/**
 * POST /api/home-value/estimate
 *
 * Body validated by `estimateRequestSchema` (docs/en/pages/12-home-value.md
 * §5). Computes the Phase-1 heuristic estimate and persists an immutable
 * snapshot row (service-role insert — see supabase/migrations/0010_home_value_estimates.sql
 * for the RLS rationale). Available to guests; `owner_id` is attached when a
 * session exists.
 *
 * Rate-limit: 20 requests/hour per IP (this is the only public,
 * unauthenticated write endpoint in the app — guests must be able to use
 * the tool, so it's keyed by IP rather than user id, same pattern as
 * app/api/auth/register/route.ts).
 *
 * 200 EstimateResponse · 422 invalid_input | no_area_data · 429 rate_limited · 500 server_error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rate = checkRateLimit(`home-value-estimate:${ip}`, LIMITS.HOME_VALUE_ESTIMATE.max, LIMITS.HOME_VALUE_ESTIMATE.windowMs)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: EstimateRequestInput
  try {
    input = estimateRequestSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'invalid_input', field: err.issues[0]?.path.join('.'), fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const medianLookup = await lookupMedianPricePerM2(input)

  if (medianLookup.level === 'none' || medianLookup.medianPricePerM2 <= 0) {
    return NextResponse.json({ error: 'no_area_data', fallbackLevel: 'city' }, { status: 422 })
  }

  const computed = computeEstimate({
    areaM2: input.areaM2,
    rooms: input.rooms,
    floor: input.floor,
    floorsTotal: input.floorsTotal,
    yearBuilt: input.yearBuilt,
    condition: input.condition,
    medianPricePerM2: medianLookup.medianPricePerM2,
    sampleCount: medianLookup.sampleCount,
    fallbackLevel: medianLookup.level,
  })

  // Who's asking? Attach owner_id when logged in; guests get a NULL owner.
  let ownerId: string | null = null
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    ownerId = user?.id ?? null
  } catch {
    ownerId = null
  }

  const row = {
    owner_id: ownerId,
    lat: input.lat,
    lng: input.lng,
    country: 'AM',
    city: input.city,
    district: input.district ?? null,
    address_label: input.addressLabel ?? null,
    property_type: input.propertyType,
    area_m2: input.areaM2,
    rooms: input.rooms ?? null,
    floor: input.floor ?? null,
    floors_total: input.floorsTotal ?? null,
    year_built: input.yearBuilt ?? null,
    condition: input.condition ?? null,
    estimate: computed.estimate,
    low: computed.low,
    high: computed.high,
    currency: 'AMD' as const,
    price_per_m2: computed.pricePerM2,
    median_price_per_m2: computed.medianPricePerM2,
    confidence: computed.confidence,
    comps_count: computed.compsCount,
    fallback_level: computed.fallbackLevel,
    factors: computed.factors,
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const isConfigured =
    supabaseUrl && serviceRoleKey && !supabaseUrl.includes('placeholder') && !supabaseUrl.includes('your-project-id')

  let hash = generateEstimateHash()

  if (isConfigured) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      for (let attempt = 0; attempt < MAX_HASH_RETRIES; attempt++) {
        const { error } = await admin
          .from('home_value_estimates')
          .insert({ ...row, hash } as unknown as never)

        if (!error) break

        if (error.code === UNIQUE_VIOLATION && attempt < MAX_HASH_RETRIES - 1) {
          hash = generateEstimateHash()
          continue
        }

        // Persisting the snapshot failed, but the estimate itself is still
        // valid — return it without a working share link rather than
        // failing the whole request over a cache-write error.
        break
      }
    } catch {
      // Same reasoning as above — degrade gracefully, don't fail the estimate.
    }
  }

  const response: EstimateResponse = {
    hash,
    estimate: computed.estimate,
    low: computed.low,
    high: computed.high,
    currency: 'AMD',
    pricePerM2: computed.pricePerM2,
    medianPricePerM2: computed.medianPricePerM2,
    vsMedianPct: computed.vsMedianPct,
    confidence: computed.confidence,
    compsCount: computed.compsCount,
    fallbackLevel: computed.fallbackLevel,
    factors: computed.factors,
  }

  return NextResponse.json(response, { status: 200 })
}
