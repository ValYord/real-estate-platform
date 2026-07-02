import { NextRequest, NextResponse } from 'next/server'
import { getMockSimilarProperties } from '@/lib/property/mockData'

type Params = { id: string }

/**
 * GET /api/properties/[id]/similar
 *
 * Returns up to 8 properties in the same city, same type, and within ±20% of the
 * price of the requested property.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const supabase = createAdminClient()

      // First fetch the target property to get city / type / price
      const { data: target, error: targetError } = await supabase
        .from('properties')
        .select('city, property_type, price, deal_type')
        .eq('id', id)
        .single()

      if (targetError || !target) {
        return NextResponse.json({ items: [] })
      }

      const priceMin = target.price * 0.8
      const priceMax = target.price * 1.2

      const { data, error } = await supabase
        .from('properties')
        .select(
          `id, slug, title, price, currency, deal_type, area_m2, bedrooms, bathrooms,
           city, district, status,
           property_media(url, sort_order)`,
        )
        .eq('status', 'active')
        .eq('city', target.city)
        .eq('property_type', target.property_type)
        .eq('deal_type', target.deal_type)
        .neq('id', id)
        .gte('price', priceMin)
        .lte('price', priceMax)
        .limit(8)

      if (error || !data) {
        return NextResponse.json({ items: getMockSimilarProperties() })
      }

      type SimilarRow = {
        id: string
        slug: string
        title: Record<string, string>
        price: number
        currency: string
        deal_type: string
        area_m2: number | null
        bedrooms: number | null
        bathrooms: number | null
        city: string
        district: string | null
        status: string
        property_media: Array<{ url: string; sort_order: number }>
      }

      const items = (data as SimilarRow[]).map((row) => {
        const sorted = [...(row.property_media ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        )
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          price: row.price,
          currency: row.currency,
          dealType: row.deal_type,
          area: row.area_m2,
          bedrooms: row.bedrooms,
          bathrooms: row.bathrooms,
          city: row.city,
          district: row.district,
          cover: sorted[0]?.url ?? null,
          status: row.status,
        }
      })

      return NextResponse.json({ items })
    } catch {
      // Fall through
    }
  }

  return NextResponse.json({ items: getMockSimilarProperties() })
}
