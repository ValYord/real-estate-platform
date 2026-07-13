import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { matchQuerySchema } from '@/lib/home-value/schemas'
import type { HomeValueCondition, HomeValuePropertyType, MatchedProperty } from '@/lib/home-value/types'

/** ~60m bounding box around the point — approximate, matches the box-filter style already used in app/api/properties/route.ts. */
const RADIUS_DEG = 0.0006

interface MatchResponse {
  matched: boolean
  property: MatchedProperty | null
}

const HOME_VALUE_PROPERTY_TYPES = new Set(['apartment', 'house', 'land', 'commercial'])

/**
 * GET /api/home-value/match?lat=&lng=
 *
 * Checks whether the selected address already has an active listing in the
 * database (match by geo proximity, per docs/en/pages/12-home-value.md §3.1)
 * so the Input phase can skip straight to Result instead of showing the
 * Details form. Not part of the doc's published API contract table — it's
 * the small addition needed to implement the "if the address already has a
 * property → Result, otherwise → Details" behavior described in §3.1/§4.
 *
 * Public read only (status = 'active'), same RLS-respecting scope as any
 * other visitor browsing /search — no service-role client needed here.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  let lat: number
  let lng: number
  try {
    ;({ lat, lng } = matchQuerySchema.parse({
      lat: request.nextUrl.searchParams.get('lat'),
      lng: request.nextUrl.searchParams.get('lng'),
    }))
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_query', fields: err.flatten().fieldErrors }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const notMatched: MatchResponse = { matched: false, property: null }

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project-id')) {
    // No live database configured — the tool always falls through to the
    // Details phase in this environment (see lib/home-value/mockData.ts for
    // the matching estimate-side fallback).
    return NextResponse.json(notMatched)
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('properties')
      .select('property_type, area_m2, rooms, floor, floors_total, year_built, condition')
      .eq('status', 'active')
      .gte('lat', lat - RADIUS_DEG)
      .lte('lat', lat + RADIUS_DEG)
      .gte('lng', lng - RADIUS_DEG)
      .lte('lng', lng + RADIUS_DEG)
      .limit(1)
      .maybeSingle()

    if (error || !data || data.area_m2 == null) {
      return NextResponse.json(notMatched)
    }

    if (!HOME_VALUE_PROPERTY_TYPES.has(data.property_type)) {
      // Garage / new-development listings aren't offered by the home-value
      // details form — treat as unmatched so the visitor fills the form in.
      return NextResponse.json(notMatched)
    }

    const property: MatchedProperty = {
      propertyType: data.property_type as HomeValuePropertyType,
      areaM2: data.area_m2,
      rooms: data.rooms ?? undefined,
      floor: data.floor ?? undefined,
      floorsTotal: data.floors_total ?? undefined,
      yearBuilt: data.year_built ?? undefined,
      condition: (data.condition as HomeValueCondition | null) ?? undefined,
    }

    const response: MatchResponse = { matched: true, property }
    return NextResponse.json(response)
  } catch {
    return NextResponse.json(notMatched)
  }
}
