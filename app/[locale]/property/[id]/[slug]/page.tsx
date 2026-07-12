import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getMockPropertyDetail } from '@/lib/property/mockData'
import { safeLocale } from '@/lib/locale'
import Breadcrumbs from '@/components/property/Breadcrumbs'
import PropertyGallery from '@/components/property/PropertyGallery'
import PropertyMainInfo from '@/components/property/PropertyMainInfo'
import PropertyDescription from '@/components/property/PropertyDescription'
import PropertyDetailsTable from '@/components/property/PropertyDetailsTable'
import AmenitiesGrid from '@/components/property/AmenitiesGrid'
import PropertyMap from '@/components/property/PropertyMap'
import MortgageMiniCalc from '@/components/property/MortgageMiniCalc'
import ContactCard from '@/components/property/ContactCard'
import OwnerManageBar from '@/components/property/OwnerManageBar'
import SimilarProperties from '@/components/property/SimilarProperties'
import RecentlyViewed from '@/components/property/RecentlyViewed'
import MobileBottomBar from '@/components/property/MobileBottomBar'
import PropertyViewTracker from '@/components/property/PropertyViewTracker'
import PublishedToast from '@/components/property/PublishedToast'
import type { PropertyDetail } from '@/lib/property/types'
import type { DetailRow } from '@/components/property/PropertyDetailsTable'

type PageParams = { locale: string; id: string; slug: string }

const BRAND = 'RE Platform'

const CURRENCY_SYMBOL: Record<string, string> = {
  AMD: '֏',
  USD: '$',
  EUR: '€',
  RUB: '₽',
}

function formatPriceShort(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  if (currency === 'AMD') {
    return `${(price / 1_000_000).toFixed(1)}M ${symbol}`
  }
  return `${symbol}${price.toLocaleString()}`
}

/**
 * Fetch the property either from Supabase or mock data.
 * Uses cache: 'no-store' so views_count is always fresh.
 */
async function fetchProperty(id: string): Promise<PropertyDetail | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/properties/${id}`, {
      cache: 'no-store',
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return (await res.json()) as PropertyDetail
  } catch {
    // Fall back to in-process mock in development
    return getMockPropertyDetail(id) ?? null
  }
}

/**
 * Guarded session lookup — used to prefill the "Schedule a tour" form
 * (Page 27) for a logged-in viewer. Guarded the same way every route
 * handler in this codebase guards Supabase calls, so local/dev/test runs
 * without Supabase env vars still render the page instead of throwing.
 */
async function fetchCurrentUser(): Promise<{ name: string | null; phone: string | null } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey || supabaseUrl.includes('your-project-id')) return null

  try {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    type ProfileRow = { full_name: string | null; phone: string | null }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()

    const userProfile = profile as ProfileRow | null
    return { name: userProfile?.full_name ?? null, phone: userProfile?.phone ?? null }
  } catch {
    return null
  }
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params
  const locale = safeLocale(rawLocale)

  const property = await fetchProperty(id)
  if (!property) {
    return { title: `Property not found | ${BRAND}` }
  }

  const title = property.title[locale] ?? property.title.en ?? property.title.hy ?? 'Property'
  const city = property.location.city
  const price = formatPriceShort(property.price, property.currency)
  const description =
    (property.description[locale] ?? property.description.en ?? property.description.hy ?? '')
      .slice(0, 155)

  const ogImage = property.media.find((m) => m.type === 'photo')?.url ?? undefined
  const canonical = `/${locale}/property/${id}/${property.slug}`

  const alternates: Record<string, string> = {
    hy: `/hy/property/${id}/${property.slug}`,
    ru: `/ru/property/${id}/${property.slug}`,
    en: `/en/property/${id}/${property.slug}`,
  }

  const isSold = property.status === 'sold' || property.status === 'archived'

  return {
    title: `${title} — ${city}, ${price} | ${BRAND}`,
    description,
    robots: isSold ? { index: false, follow: true } : undefined,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title: `${title} — ${city}, ${price}`,
      description,
      images: ogImage ? [{ url: ogImage }] : [],
      type: 'website',
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { locale: rawLocale, id } = await params
  const locale = safeLocale(rawLocale)

  const [property, currentUser] = await Promise.all([fetchProperty(id), fetchCurrentUser()])
  if (!property) notFound()

  const title = property.title[locale] ?? property.title.en ?? property.title.hy ?? 'Property'
  const city = property.location.city
  const district = property.location.district

  // ── Breadcrumbs ──────────────────────────────────────────────────────────
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: city, href: `/search?city=${encodeURIComponent(city)}` },
    ...(district
      ? [
          {
            label: district,
            href: `/search?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`,
          },
        ]
      : []),
    { label: title },
  ]

  // ── Details table rows ───────────────────────────────────────────────────
  const details: DetailRow[] = [
    { label: 'Type', value: property.propertyType },
    { label: 'Condition', value: property.condition },
    { label: 'Heating', value: property.heating },
    { label: 'Year built', value: property.yearBuilt },
    { label: 'Floor', value: property.floor != null && property.floorsTotal != null ? `${property.floor} / ${property.floorsTotal}` : null },
    { label: 'Rooms', value: property.rooms },
    { label: 'Bedrooms', value: property.bedrooms },
    { label: 'Bathrooms', value: property.bathrooms },
    { label: 'Area', value: property.area != null ? `${property.area} m²` : null },
  ]

  // ── JSON-LD ───────────────────────────────────────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'RealEstateListing',
        '@id': `https://example.com/${locale}/property/${id}/${property.slug}`,
        name: title,
        description:
          property.description[locale] ?? property.description.en ?? property.description.hy ?? '',
        url: `https://example.com/${locale}/property/${id}/${property.slug}`,
        image: property.media.filter((m) => m.type === 'photo').map((m) => m.url),
        offers: {
          '@type': 'Offer',
          price: property.price,
          priceCurrency: property.currency,
          availability:
            property.status === 'active'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut',
        },
        ...(property.location.lat != null && property.location.lng != null
          ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: property.location.lat,
                longitude: property.location.lng,
              },
            }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: crumb.label,
          ...(crumb.href ? { item: `https://example.com${crumb.href}` } : {}),
        })),
      },
    ],
  }

  const isAvailable = property.status === 'active' || property.status === 'pending'
  const { lat, lng, hideExact } = property.location

  return (
    <>
      {/* "Published 🎉" toast — shown when redirected from the listing wizard */}
      <Suspense fallback={null}>
        <PublishedToast />
      </Suspense>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* View tracker (client-side: saves to localStorage) */}
      <PropertyViewTracker property={property} locale={locale} />

      <main className="max-w-7xl mx-auto px-4 pb-24 lg:pb-12">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbs} className="py-3" />

        {/* Two-column layout on desktop */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          {/* ── Main column ── */}
          <div className="min-w-0">
            {/* Gallery */}
            <PropertyGallery
              media={property.media}
              title={title}
              city={city}
              propertyId={property.id}
              isFavorited={property.isFavorited}
              isAvailable={isAvailable}
            />

            {/* Main info (price, title, address, key facts) */}
            <div className="mt-5">
              <PropertyMainInfo
                property={property}
                locale={locale}
                displayCurrency={property.currency}
              />
            </div>

            {/* Description */}
            <PropertyDescription text={property.description} locale={locale} />

            {/* Details table */}
            <PropertyDetailsTable details={details} />

            {/* Amenities */}
            <AmenitiesGrid amenities={property.amenities} />

            {/* Map */}
            {lat != null && lng != null && (
              <PropertyMap lat={lat} lng={lng} hideExact={hideExact} title={title} />
            )}

            {/* Mortgage mini-calc */}
            <MortgageMiniCalc price={property.price} currency={property.currency} />
          </div>

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block">
            {property.isOwner ? (
              <OwnerManageBar property={property} />
            ) : (
              <ContactCard
                owner={property.owner}
                propertyId={property.id}
                isAvailable={isAvailable}
                currentUser={currentUser}
              />
            )}
          </aside>
        </div>

        {/* Full-width sections */}
        <SimilarProperties propertyId={property.id} locale={locale} />
        <RecentlyViewed locale={locale} />
      </main>

      {/* Mobile fixed bottom bar */}
      {!property.isOwner && (
        <MobileBottomBar
          propertyId={property.id}
          phone={property.owner.phone}
          isFavorited={property.isFavorited}
          isAvailable={isAvailable}
          currentUser={currentUser}
        />
      )}
    </>
  )
}
