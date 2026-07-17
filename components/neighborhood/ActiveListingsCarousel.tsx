'use client'

import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Stagger from '@/components/motion/Stagger'
import { Link } from '@/i18n/navigation'
import { PropertyCard } from '@/components/search/PropertyCard'
import type { PropertiesResponse } from '@/lib/search/types'
import AlertCtaButton from './AlertCtaButton'

interface ActiveListingsCarouselProps {
  city: string
  district: string
  areaName: string
}

async function fetchActiveListings(city: string, district: string): Promise<PropertiesResponse> {
  const params = new URLSearchParams({ city, district, deal: 'sale', sort: 'newest' })
  const res = await fetch(`/api/properties?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch active listings')
  return res.json() as Promise<PropertiesResponse>
}

/**
 * Active-listings carousel — reuses the existing `/api/properties` endpoint
 * and `<PropertyCard>` unmodified (product doc §3.4; per the task brief,
 * "reuse the existing PropertyCard/search components — do not fork them").
 * The three new `/api/market/[area]*` endpoints cover aggregates only.
 */
export default function ActiveListingsCarousel({ city, district, areaName }: ActiveListingsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['market-active-listings', city, district],
    queryFn: () => fetchActiveListings(city, district),
    staleTime: 30_000,
  })

  const items = (data?.items ?? []).slice(0, 12)
  const searchHref = `/search?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-text">Active listings{data ? ` (${data.total})` : ''}</h2>
        {items.length > 0 && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => scroll('left')} aria-label="Scroll left">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scroll('right')} aria-label="Scroll right">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Link href={searchHref as Parameters<typeof Link>[0]['href']}>
              <Button variant="secondary" size="sm">See all</Button>
            </Link>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="w-72 h-64 flex-shrink-0 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center text-center gap-3 py-10">
            <p className="text-text">No active listings in {areaName} right now.</p>
            <AlertCtaButton city={city} district={district} areaName={areaName} size="md" />
          </CardBody>
        </Card>
      ) : (
        <Stagger
          ref={scrollRef}
          gap={0.05}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
        >
          {items.map((property) => (
            <div key={property.id} className="flex-shrink-0 w-72 snap-start">
              <PropertyCard property={property} />
            </div>
          ))}
        </Stagger>
      )}
    </section>
  )
}
