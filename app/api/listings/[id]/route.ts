import { NextRequest, NextResponse } from 'next/server'
import { ZodError, z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { patchListingSchema } from '@/lib/listings/schemas'
import type { ListingDraft } from '@/lib/listings/types'

const statusOnlySchema = z.object({ status: z.enum(['active', 'archived']) })

type RouteContext = { params: Promise<{ id: string }> }

// Supabase type inference cannot resolve complex nested select strings, so we
// define the expected shapes explicitly and cast query results below.
type MediaRow = { id: string; url: string; media_type: string; sort_order: number }
type TitleDesc = { hy?: string; ru?: string; en?: string }

type FullPropertyRow = {
  id: string
  status: string
  owner_id: string
  deal_type: string
  property_type: string
  country: string
  city: string
  district: string | null
  address: string | null
  lat: number | null
  lng: number | null
  hide_exact_address: boolean
  area_m2: number | null
  rooms: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  floors_total: number | null
  year_built: number | null
  condition: string | null
  heating: boolean
  balcony: boolean
  parking: boolean
  elevator: boolean
  amenities: string[]
  title: TitleDesc
  description: TitleDesc
  price: number
  currency: string
  negotiable: boolean
  utilities_included: boolean
  deposit: number | null
  min_rent_term_months: number | null
  contact_name: string | null
  contact_phone: string | null
  contact_preference: string | null
  video_url: string | null
  tour360_url: string | null
  updated_at: string
  property_media: MediaRow[] | null
}

type PatchResultRow = { id: string; status: string; updated_at: string }

/**
 * GET /api/listings/[id]
 * Owner-only pre-fill fetch for the edit wizard.
 */
export async function GET(
  _request: NextRequest,
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

  const queryResult = await supabase
    .from('properties')
    .select(`
      id, owner_id, status, deal_type, property_type,
      country, city, district, address, lat, lng, hide_exact_address,
      area_m2, rooms, bedrooms, bathrooms, floor, floors_total, year_built,
      condition, heating, balcony, parking, elevator, amenities,
      title, description,
      price, currency, negotiable, utilities_included, deposit, min_rent_term_months,
      contact_name, contact_phone, contact_preference,
      video_url, tour360_url,
      updated_at,
      property_media(id, url, media_type, sort_order)
    `)
    .eq('id', id)
    .single()

  const row = queryResult.data as unknown as FullPropertyRow | null
  const { error } = queryResult

  if (error || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Ownership check
  if (row.owner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const rawMedia = row.property_media ?? []
  const photos = rawMedia
    .filter((m) => m.media_type === 'image')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({ mediaId: m.id, url: m.url, order: m.sort_order }))

  const draft: ListingDraft = {
    id: row.id,
    status: row.status as ListingDraft['status'],
    dealType: row.deal_type as ListingDraft['dealType'],
    propertyType: row.property_type as ListingDraft['propertyType'],
    country: row.country,
    city: row.city,
    district: row.district ?? undefined,
    address: row.address ?? undefined,
    lat: row.lat,
    lng: row.lng,
    hideExact: row.hide_exact_address,
    areaM2: row.area_m2,
    rooms: row.rooms,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    floor: row.floor,
    floorsTotal: row.floors_total,
    yearBuilt: row.year_built,
    condition: row.condition ?? undefined,
    heating: row.heating,
    balcony: row.balcony,
    parking: row.parking,
    elevator: row.elevator,
    amenities: row.amenities,
    title: row.title,
    description: row.description,
    media: photos,
    videoUrl: row.video_url ?? undefined,
    tour360Url: row.tour360_url ?? undefined,
    price: row.price,
    currency: row.currency as ListingDraft['currency'],
    negotiable: row.negotiable,
    utilitiesIncluded: row.utilities_included,
    deposit: row.deposit,
    minRentTermMonths: row.min_rent_term_months,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactPreference: row.contact_preference as ListingDraft['contactPreference'],
    savedAt: row.updated_at,
  }

  return NextResponse.json(draft)
}

/**
 * PATCH /api/listings/[id]
 * Partial auto-save. Validates any provided fields, updates the draft.
 * Ownership-checked server-side.
 */
export async function PATCH(
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // Status-toggle shortcut (used by the dashboard Activate/Deactivate action)
  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    const bodyObj = body as Record<string, unknown>
    const keys = Object.keys(bodyObj)
    if (keys.length === 1 && keys[0] === 'status') {
      const statusParsed = statusOnlySchema.safeParse(body)
      if (!statusParsed.success) {
        return NextResponse.json({ error: 'validation', fields: { status: 'Must be active or archived' } }, { status: 422 })
      }
      const toggleResult = await supabase
        .from('properties')
        .update({ status: statusParsed.data.status, updated_at: new Date().toISOString() } as unknown as never)
        .eq('id', id)
        .eq('owner_id', user.id)
        .select('id, status')
        .single()

      const toggleRow = toggleResult.data as unknown as { id: string; status: string } | null
      if (toggleResult.error || !toggleRow) {
        if (toggleResult.error?.code === 'PGRST116') {
          return NextResponse.json({ error: 'not_found' }, { status: 404 })
        }
        return NextResponse.json({ error: 'db_error' }, { status: 500 })
      }
      return NextResponse.json({ id: toggleRow.id, status: toggleRow.status })
    }
  }

  let parsed: ReturnType<typeof patchListingSchema.parse>
  try {
    parsed = patchListingSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {}
      for (const issue of err.issues) {
        fields[issue.path.join('.')] = issue.message
      }
      return NextResponse.json({ error: 'validation', fields }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // Build the update object (only fields that are present in the patch)
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (parsed.dealType !== undefined) update.deal_type = parsed.dealType
  if (parsed.propertyType !== undefined) update.property_type = parsed.propertyType
  if (parsed.country !== undefined) update.country = parsed.country
  if (parsed.city !== undefined) update.city = parsed.city
  if (parsed.district !== undefined) update.district = parsed.district
  if (parsed.address !== undefined) update.address = parsed.address
  if (parsed.lat !== undefined) update.lat = parsed.lat
  if (parsed.lng !== undefined) update.lng = parsed.lng
  if (parsed.hideExact !== undefined) update.hide_exact_address = parsed.hideExact
  if (parsed.areaM2 !== undefined) update.area_m2 = parsed.areaM2
  if (parsed.rooms !== undefined) update.rooms = parsed.rooms
  if (parsed.bedrooms !== undefined) update.bedrooms = parsed.bedrooms
  if (parsed.bathrooms !== undefined) update.bathrooms = parsed.bathrooms
  if (parsed.floor !== undefined) update.floor = parsed.floor
  if (parsed.floorsTotal !== undefined) update.floors_total = parsed.floorsTotal
  if (parsed.yearBuilt !== undefined) update.year_built = parsed.yearBuilt
  if (parsed.condition !== undefined) update.condition = parsed.condition
  if (parsed.heating !== undefined) update.heating = parsed.heating
  if (parsed.balcony !== undefined) update.balcony = parsed.balcony
  if (parsed.parking !== undefined) update.parking = parsed.parking
  if (parsed.elevator !== undefined) update.elevator = parsed.elevator
  if (parsed.amenities !== undefined) update.amenities = parsed.amenities
  if (parsed.title !== undefined) update.title = parsed.title
  if (parsed.description !== undefined) update.description = parsed.description
  if (parsed.price !== undefined) update.price = parsed.price
  if (parsed.currency !== undefined) update.currency = parsed.currency
  if (parsed.negotiable !== undefined) update.negotiable = parsed.negotiable
  if (parsed.utilitiesIncluded !== undefined) update.utilities_included = parsed.utilitiesIncluded
  if (parsed.deposit !== undefined) update.deposit = parsed.deposit
  if (parsed.minRentTermMonths !== undefined) update.min_rent_term_months = parsed.minRentTermMonths
  if (parsed.contactName !== undefined) update.contact_name = parsed.contactName
  if (parsed.contactPhone !== undefined) update.contact_phone = parsed.contactPhone
  if (parsed.contactPreference !== undefined) update.contact_preference = parsed.contactPreference
  if (parsed.videoUrl !== undefined) update.video_url = parsed.videoUrl || null
  if (parsed.tour360Url !== undefined) update.tour360_url = parsed.tour360Url || null

  // `as unknown as never` bypasses the recursive-Json-induced `never` param type.
  const patchResult = await supabase
    .from('properties')
    .update(update as unknown as never)
    .eq('id', id)
    .eq('owner_id', user.id)  // RLS: owner only
    .select('id, status, updated_at')
    .single()

  const row = patchResult.data as unknown as PatchResultRow | null
  const { error } = patchResult

  if (error || !row) {
    if (error?.code === 'PGRST116') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({
    id: row.id,
    status: row.status,
    savedAt: row.updated_at,
  })
}

/**
 * DELETE /api/listings/[id]
 * Deletes the listing. Ownership enforced via RLS (owner_id = auth.uid()).
 * Returns 200 { deleted: true } on success, 404 if not found or not owner.
 */
export async function DELETE(
  _request: NextRequest,
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

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)  // RLS: owner only

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
