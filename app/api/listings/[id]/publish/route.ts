import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { publishSchema } from '@/lib/listings/schemas'
import type { Database } from '@/types/database'

// Supabase type inference with recursive Json columns resolves update
// arg types to `never` in some TS versions. Cast via `as unknown as T`.
type PropertyUpdate = Database['public']['Tables']['properties']['Update']

type RouteContext = { params: Promise<{ id: string }> }

const FREE_LIMIT = 5

// Supabase type inference cannot resolve complex nested select strings, so we
// define the expected shapes explicitly and cast query results below.
type TitleDesc = { hy?: string; ru?: string; en?: string }
type MediaRow = { id: string; url: string; media_type: string; sort_order: number }

type ListingForPublish = {
  id: string
  deal_type: string
  property_type: string
  country: string | null
  city: string | null
  district: string | null
  address: string | null
  lat: number | null
  lng: number | null
  hide_exact_address: boolean | null
  area_m2: number | null
  rooms: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  floors_total: number | null
  year_built: number | null
  condition: string | null
  heating: boolean | null
  balcony: boolean | null
  parking: boolean | null
  elevator: boolean | null
  amenities: string[] | null
  title: TitleDesc | null
  description: TitleDesc | null
  price: number | null
  currency: string | null
  negotiable: boolean | null
  utilities_included: boolean | null
  deposit: number | null
  min_rent_term_months: number | null
  contact_name: string | null
  contact_phone: string | null
  contact_preference: string | null
  video_url: string | null
  tour360_url: string | null
  property_media: MediaRow[] | null
}

type PublishResultRow = { id: string; status: string; slug: string }

/**
 * POST /api/listings/[id]/publish
 * Runs the full publishSchema validation on the listing data from DB,
 * merged with any optional body fields.
 * Phase 1: no moderation — straight to status=active.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Check active listing limit again before publish
  const { count, error: countError } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('status', 'active')

  if (countError) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if ((count ?? 0) >= FREE_LIMIT) {
    return NextResponse.json(
      { error: 'limit_reached', limit: FREE_LIMIT, active: count },
      { status: 403 },
    )
  }

  // Parse optional body (step 6 fields may be sent with the publish request)
  let bodyFields: Record<string, unknown> = {}
  try {
    const text = await request.text()
    if (text) {
      bodyFields = JSON.parse(text) as Record<string, unknown>
    }
  } catch {
    // empty body is OK
  }

  // Fetch current listing data from DB
  const fetchResult = await supabase
    .from('properties')
    .select(`
      id, deal_type, property_type,
      country, city, district, address, lat, lng, hide_exact_address,
      area_m2, rooms, bedrooms, bathrooms, floor, floors_total, year_built,
      condition, heating, balcony, parking, elevator, amenities,
      title, description,
      price, currency, negotiable, utilities_included, deposit, min_rent_term_months,
      contact_name, contact_phone, contact_preference,
      video_url, tour360_url,
      property_media(id, url, media_type, sort_order)
    `)
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  const row = fetchResult.data as unknown as ListingForPublish | null
  const { error: fetchError } = fetchResult

  if (fetchError || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const rawMedia = row.property_media ?? []
  const photos = rawMedia
    .filter((m) => m.media_type === 'image')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({ mediaId: m.id, url: m.url, order: m.sort_order }))

  // Build the full data object for validation
  const dataToValidate = {
    dealType: row.deal_type,
    propertyType: row.property_type,
    country: row.country ?? 'AM',
    city: row.city ?? '',
    district: row.district ?? undefined,
    address: row.address ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    hideExact: row.hide_exact_address ?? false,
    areaM2: row.area_m2 ?? undefined,
    rooms: row.rooms ?? undefined,
    bedrooms: row.bedrooms ?? undefined,
    bathrooms: row.bathrooms ?? undefined,
    floor: row.floor ?? undefined,
    floorsTotal: row.floors_total ?? undefined,
    yearBuilt: row.year_built ?? undefined,
    condition: row.condition ?? undefined,
    heating: row.heating ?? false,
    balcony: row.balcony ?? false,
    parking: row.parking ?? false,
    elevator: row.elevator ?? false,
    amenities: row.amenities ?? [],
    title: row.title ?? { hy: '' },
    description: row.description ?? { hy: '' },
    media: photos,
    videoUrl: row.video_url ?? undefined,
    tour360Url: row.tour360_url ?? undefined,
    price: row.price ?? undefined,
    currency: row.currency ?? undefined,
    negotiable: row.negotiable ?? false,
    utilitiesIncluded: row.utilities_included ?? false,
    deposit: row.deposit ?? undefined,
    minRentTermMonths: row.min_rent_term_months ?? undefined,
    // Contact from body or DB
    contactName: (bodyFields.contactName as string | undefined) ?? row.contact_name ?? undefined,
    contactPhone: (bodyFields.contactPhone as string | undefined) ?? row.contact_phone ?? undefined,
    contactPreference:
      (bodyFields.contactPreference as string | undefined) ??
      row.contact_preference ??
      'phone_and_chat',
    termsAccepted: (bodyFields.termsAccepted as true | undefined),
  }

  // Full validation
  let parsed: ReturnType<typeof publishSchema.parse>
  try {
    parsed = publishSchema.parse(dataToValidate)
  } catch (err) {
    if (err instanceof ZodError) {
      // Map missing fields to human-readable step labels
      const missing = mapZodErrorsToMissingSteps(err)
      return NextResponse.json(
        { error: 'incomplete', missing },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // Generate a proper slug from the listing data
  const slug = generateSlug(parsed)

  // Update contact info from body if provided
  const contactUpdate: Record<string, unknown> = {}
  if (bodyFields.contactName) contactUpdate.contact_name = bodyFields.contactName
  if (bodyFields.contactPhone) contactUpdate.contact_phone = bodyFields.contactPhone
  if (bodyFields.contactPreference) contactUpdate.contact_preference = bodyFields.contactPreference

  // Publish: set status to active
  const publishUpdatePayload: PropertyUpdate = {
    status: 'active',
    slug,
    listed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...contactUpdate as PropertyUpdate,
  }
  // `as unknown as never` bypasses the recursive-Json-induced `never` param type.
  const publishResult = await supabase
    .from('properties')
    .update(publishUpdatePayload as unknown as never)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('id, status, slug')
    .single()

  const published = publishResult.data as unknown as PublishResultRow | null
  const { error: updateError } = publishResult

  if (updateError || !published) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({
    id: published.id,
    status: published.status,
    slug: published.slug,
  })
}

/** Map zod validation errors to which wizard steps they belong to */
function mapZodErrorsToMissingSteps(err: ZodError): string[] {
  const missing = new Set<string>()

  for (const issue of err.issues) {
    const path = issue.path[0] as string | undefined

    if (!path) continue

    if (['dealType', 'propertyType'].includes(path)) {
      missing.add('step1')
    } else if (['city', 'lat', 'lng'].includes(path)) {
      missing.add('step2')
    } else if (['areaM2', 'title', 'description'].includes(path)) {
      missing.add('step3')
    } else if (path === 'media') {
      missing.add('step4')
    } else if (['price', 'currency'].includes(path)) {
      missing.add('step5')
    } else if (['contactName', 'contactPhone', 'termsAccepted'].includes(path)) {
      missing.add('step6')
    }
  }

  return Array.from(missing)
}

/** Generate a URL-friendly slug from listing data */
function generateSlug(data: {
  city: string
  district?: string
  propertyType: string
  rooms?: number
  areaM2?: number
}): string {
  const parts: string[] = []

  if (data.city) parts.push(data.city.toLowerCase())
  if (data.district) parts.push(data.district.toLowerCase())
  if (data.rooms) parts.push(`${data.rooms}-room`)
  parts.push(data.propertyType)

  const base = parts
    .join('-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80)

  // Append a short timestamp to ensure uniqueness
  const suffix = Date.now().toString(36)
  return `${base}-${suffix}`
}
